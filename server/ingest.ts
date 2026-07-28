import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface IngestNoteResult {
  title: string;
  content: string;
  tags: string[];
}

export interface IngestClusterResult {
  mainNote: IngestNoteResult;
  connectedNotes: IngestNoteResult[];
}

// -------------------------------------------------------------------
// OPENROUTER & NEMOTRON CALL
// -------------------------------------------------------------------
export async function callOpenRouterAI(
  prompt: string,
  openRouterApiKey: string,
  modelName: string = 'nvidia/llama-3.1-nemotron-70b-instruct'
): Promise<IngestClusterResult | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey.trim()}`,
        'HTTP-Referer': 'https://ais-dev-pensieve.run.app',
        'X-Title': 'Pensieve Knowledge Graph',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: `You are an expert Zettelkasten Knowledge Base Architect using Nemotron AI.
Respond STRICTLY with raw valid JSON matching this schema:
{
  "mainNote": {
    "title": "Master Note Title",
    "content": "Markdown containing [[Sub Concept 1]], [[Sub Concept 2]], [[Sub Concept 3]], [[Sub Concept 4]]...",
    "tags": ["tag1", "tag2"]
  },
  "connectedNotes": [
    {
      "title": "Sub Concept 1",
      "content": "Detailed breakdown of Sub Concept 1. Backlinks to [[Master Note Title]] and [[Sub Concept 2]].",
      "tags": ["concept", "tag1"]
    }
  ]
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API Error Response:', errText);
      return null;
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // Clean markdown code blocks if returned
    const jsonStr = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (parsed.mainNote && Array.isArray(parsed.connectedNotes)) {
      return parsed as IngestClusterResult;
    }
  } catch (err) {
    console.error('OpenRouter Nemotron call failed:', err);
  }
  return null;
}

// -------------------------------------------------------------------
// TERMINAL GIT CLONE REPOSITORY ANALYZER
// -------------------------------------------------------------------
export async function cloneAndExtractRepo(repoUrl: string): Promise<{ sourceName: string; textContent: string }> {
  const cleanUrl = repoUrl.trim();
  const githubMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  const repoName = githubMatch ? `${githubMatch[1]}-${githubMatch[2].replace(/\.git$/, '')}` : `repo-${Date.now()}`;
  const tmpDir = path.join('/tmp', `pensieve-git-${repoName}-${Date.now()}`);

  try {
    console.log(`Executing terminal git clone: git clone --depth 1 ${cleanUrl} ${tmpDir}`);
    execSync(`git clone --depth 1 "${cleanUrl}" "${tmpDir}"`, { timeout: 20000, stdio: 'ignore' });

    let readmeContent = '';
    let packageContent = '';
    let fileTreeList: string[] = [];

    // Read top level files
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      fileTreeList = files.slice(0, 50);

      const readmeFile = files.find(f => /^readme/i.test(f));
      if (readmeFile) {
        readmeContent = fs.readFileSync(path.join(tmpDir, readmeFile), 'utf-8').substring(0, 10000);
      }

      if (fs.existsSync(path.join(tmpDir, 'package.json'))) {
        packageContent = fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8');
      }
    }

    // Clean up tmp folder
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}

    const textContent = `
GIT REPOSITORY CLONED AND ANALYZED via TERMINAL CLI
URL: ${cleanUrl}
Project Directory File Tree:
${fileTreeList.join(', ')}

Package Manifest (Dependencies & Scripts):
${packageContent.substring(0, 2000)}

README & Documentation:
${readmeContent || 'No README found in cloned repository.'}
    `.trim();

    return {
      sourceName: `Git Repo: ${repoName}`,
      textContent,
    };
  } catch (err) {
    console.warn('Terminal git clone fallback to GitHub REST API:', err);
    return extractUrlContentFallback(cleanUrl);
  }
}

// -------------------------------------------------------------------
// URL CONTENT EXTRACTION
// -------------------------------------------------------------------
export async function extractUrlContent(url: string): Promise<{ sourceName: string; textContent: string }> {
  const cleanUrl = url.trim();

  if (cleanUrl.includes('github.com') || cleanUrl.endsWith('.git')) {
    return cloneAndExtractRepo(cleanUrl);
  }

  return extractUrlContentFallback(cleanUrl);
}

async function extractUrlContentFallback(cleanUrl: string): Promise<{ sourceName: string; textContent: string }> {
  // YouTube
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`);
      if (oembedRes.ok) {
        const videoData: any = await oembedRes.json();
        return {
          sourceName: `YouTube: ${videoData.title || 'Video Note'}`,
          textContent: `
YouTube Video: ${videoData.title}
Author / Channel: ${videoData.author_name}
Channel URL: ${videoData.author_url}
Video Link: ${cleanUrl}

Detailed topic breakdown and lecture summary from YouTube channel ${videoData.author_name}.
          `.trim(),
        };
      }
    } catch (err) {
      console.warn('YouTube fetch error:', err);
    }
  }

  // Generic Web Page
  try {
    const response = await fetch(cleanUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Pensieve/1.0' },
    });
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : cleanUrl;

      const strippedText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        sourceName: title,
        textContent: `Source URL: ${cleanUrl}\nPage Title: ${title}\n\nContent:\n${strippedText.substring(0, 15000)}`,
      };
    }
  } catch (err) {
    console.warn('URL direct fetch error:', err);
  }

  return {
    sourceName: `Decoded Link: ${cleanUrl}`,
    textContent: `Source URL: ${cleanUrl}\n\nIngested link content from URL ${cleanUrl}.`,
  };
}

// -------------------------------------------------------------------
// DECODE CONTENT WITH OPENROUTER / GEMINI
// -------------------------------------------------------------------
export async function decodeContentWithAI(
  sourceTitle: string,
  rawText: string,
  openRouterKey?: string,
  modelName: string = 'nvidia/llama-3.1-nemotron-70b-instruct',
  mcpContext?: string,
  fileBase64?: string,
  mimeType?: string
): Promise<IngestClusterResult> {
  const prompt = `
Analyze and decode the source titled "${sourceTitle}".
${mcpContext ? `Active MCP Tool Servers Context:\n${mcpContext}\n` : ''}

Raw Content / Data:
${rawText.substring(0, 18000)}

TASK:
Create a master note ("mainNote") with 4 to 6 explicit [[Wikilink Sub-Concepts]] embedded inside.
Then create 3 to 5 separate sub-concept notes ("connectedNotes") corresponding to those [[Wikilinks]]. Each sub-concept note must backlink to [[${sourceTitle}]] or other nodes using [[Wikilinks]].
  `.trim();

  // 1. Try OpenRouter with Nemotron model if key provided
  if (openRouterKey && openRouterKey.trim()) {
    console.log(`Decoding content via OpenRouter model: ${modelName}`);
    const openRouterResult = await callOpenRouterAI(prompt, openRouterKey, modelName);
    if (openRouterResult) {
      return openRouterResult;
    }
  }

  // 2. Try Gemini API if process.env.GEMINI_API_KEY is available
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('Decoding content via Gemini API...');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemPrompt = `
You are an expert Zettelkasten Knowledge Base Architect.
Create a master note ("mainNote") with 4 to 6 explicit [[Wikilink Sub-Concepts]] in markdown.
Create 3 to 5 separate sub-concept notes ("connectedNotes") matching those [[Wikilinks]].
Respond strictly in JSON format matching:
{
  "mainNote": { "title": "Master Title", "content": "Markdown with [[Concept 1]]...", "tags": ["tag1"] },
  "connectedNotes": [ { "title": "Concept 1", "content": "Markdown linking to [[Master Title]]...", "tags": ["tag1"] } ]
}
      `.trim();

      let contents: any[] = [];
      if (fileBase64 && mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
        contents = [
          { inlineData: { data: fileBase64, mimeType } },
          { text: `Decode this file content titled "${sourceTitle}". ${systemPrompt}` },
        ];
      } else {
        contents = [{ text: `${prompt}\n\n${systemPrompt}` }];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed.mainNote && Array.isArray(parsed.connectedNotes)) {
        return parsed as IngestClusterResult;
      }
    } catch (err) {
      console.error('Gemini call failed:', err);
    }
  }

  // 3. Robust Heuristic Fallback
  return generateFallbackCluster(sourceTitle, rawText);
}

function generateFallbackCluster(sourceTitle: string, rawText: string): IngestClusterResult {
  const cleanTitle = sourceTitle.replace(/^(GitHub:|Git Repo:|YouTube:|Decoded Link:)\s*/i, '').trim() || 'Ingested Knowledge Note';
  
  const words = rawText.match(/[A-Z][a-z]{3,}/g) || ['Architecture', 'Methodology', 'Key Principles', 'Implementation'];
  const uniqueWords = Array.from(new Set(words)).slice(0, 5);

  const sub1 = uniqueWords[0] || 'Core Architecture';
  const sub2 = uniqueWords[1] || 'System Mechanics';
  const sub3 = uniqueWords[2] || 'Data Flow';
  const sub4 = uniqueWords[3] || 'Optimization Strategies';

  const mainNote: IngestNoteResult = {
    title: cleanTitle,
    content: `# ${cleanTitle}

## Executive Summary
Ingested knowledge note derived from source content.

## Key Concept Clusters
- **[[${sub1}]]**: Foundational framework and structure.
- **[[${sub2}]]**: Primary operating principles and logic.
- **[[${sub3}]]**: Communication and data movement layer.
- **[[${sub4}]]**: Scalability and operational efficiency.

## Detailed Notes
${rawText.substring(0, 600) || 'Detailed study of ingested concepts.'}`,
    tags: ['imported', 'knowledge-node'],
  };

  const connectedNotes: IngestNoteResult[] = [
    {
      title: sub1,
      content: `# ${sub1}\n\nDetailed breakdown of **${sub1}** within [[${cleanTitle}]].\n\n- Interacts directly with [[${sub2}]] and [[${sub3}]].`,
      tags: ['concept', 'core'],
    },
    {
      title: sub2,
      content: `# ${sub2}\n\nSystem mechanics for **${sub2}**.\n\nDerived from [[${cleanTitle}]], this module manages execution alongside [[${sub4}]].`,
      tags: ['mechanics', 'system'],
    },
    {
      title: sub3,
      content: `# ${sub3}\n\nData pipelines and state management in [[${cleanTitle}]].\n\nLinks with [[${sub1}]] for sync.`,
      tags: ['data', 'pipeline'],
    },
    {
      title: sub4,
      content: `# ${sub4}\n\nPerformance benchmarks for [[${cleanTitle}]].\n\nSupports robust integration with [[${sub2}]].`,
      tags: ['optimization', 'performance'],
    },
  ];

  return { mainNote, connectedNotes };
}
