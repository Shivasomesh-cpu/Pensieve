import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface IngestNoteResult {
  title: string;
  content: string;
  tags: string[];
}

export interface IngestClusterResult {
  mainNote: IngestNoteResult;
  connectedNotes: IngestNoteResult[];
}

export interface McpServerContextSource {
  name: string;
  category?: string;
  endpoint: string;
  isEnabled?: boolean;
}

export class OpenRouterAIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OpenRouterAIError';
    this.status = status;
  }
}

function extractJsonObject(rawContent: string): IngestClusterResult | null {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.mainNote && Array.isArray(parsed.connectedNotes)) {
      return parsed as IngestClusterResult;
    }
  } catch (err) {
    console.warn('JSON parse failed for AI output:', err);
  }

  return null;
}

// -------------------------------------------------------------------
// OPENROUTER & NEMOTRON CALL
// -------------------------------------------------------------------
export async function callOpenRouterAI(
  prompt: string,
  openRouterApiKey: string,
  modelName: string = 'nvidia/llama-3.1-nemotron-70b-instruct'
): Promise<IngestClusterResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey.trim()}`,
        'HTTP-Referer': 'https://pensieve-sigma-three.vercel.app',
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
    "content": "Markdown containing [[Sub Concept 1]], [[Sub Concept 2]], [[Sub Concept 3]]...",
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
            content: prompt.substring(0, 4000),
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API Error Response:', errText);
      if (response.status === 401) {
        throw new OpenRouterAIError('OpenRouter rejected the API key. Please check the key and try again.', 401);
      }
      if (response.status === 402) {
        throw new OpenRouterAIError('OpenRouter reported insufficient credits for this account.', 402);
      }
      return null;
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    const rawContent = data.choices?.[0]?.message?.content || '';

    return extractJsonObject(rawContent);
  } catch (err) {
    if (err instanceof OpenRouterAIError) {
      throw err;
    }
    console.error('OpenRouter Nemotron call failed:', err);
  } finally {
    clearTimeout(timeout);
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
  
  // On Vercel / serverless environment, use GitHub REST API directly for maximum speed and zero timeout lag
  const isServerless = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
  if (isServerless && githubMatch) {
    const githubApiResult = await extractGitHubRepoViaApi(githubMatch[1], githubMatch[2].replace(/\.git$/, ''), cleanUrl);
    if (githubApiResult) {
      return githubApiResult;
    }
  }

  const tmpDir = path.join(os.tmpdir(), `pensieve-git-${repoName}-${Date.now()}`);

  try {
    console.log(`Executing terminal git clone: git clone --depth 1 ${cleanUrl} ${tmpDir}`);
    execSync(`git clone --depth 1 "${cleanUrl}" "${tmpDir}"`, { timeout: 10000, stdio: 'ignore' });

    let readmeContent = '';
    let packageContent = '';
    let fileTreeList: string[] = [];

    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      fileTreeList = files.slice(0, 50);

      const readmeFile = files.find(f => /^readme/i.test(f));
      if (readmeFile) {
        readmeContent = fs.readFileSync(path.join(tmpDir, readmeFile), 'utf-8').substring(0, 5000);
      }

      if (fs.existsSync(path.join(tmpDir, 'package.json'))) {
        packageContent = fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf-8');
      }
    }

    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}

    const textContent = `
GIT REPOSITORY CLONED AND ANALYZED via TERMINAL CLI
URL: ${cleanUrl}
Project Directory File Tree:
${fileTreeList.join(', ')}

Package Manifest (Dependencies & Scripts):
${packageContent.substring(0, 1500)}

README & Documentation:
${readmeContent || 'No README found in cloned repository.'}
    `.trim();

    return {
      sourceName: `Git Repo: ${repoName}`,
      textContent,
    };
  } catch (err) {
    console.warn('Terminal git clone fallback to GitHub REST API:', err);
    if (githubMatch) {
      const githubApiResult = await extractGitHubRepoViaApi(githubMatch[1], githubMatch[2].replace(/\.git$/, ''), cleanUrl);
      if (githubApiResult) {
        return githubApiResult;
      }
    }
    return extractUrlContentFallback(cleanUrl);
  }
}

async function extractGitHubRepoViaApi(
  owner: string,
  repo: string,
  originalUrl: string
): Promise<{ sourceName: string; textContent: string } | null> {
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Pensieve-Knowledge-Ingest/1.0',
    };
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      console.warn(`GitHub REST fallback failed with status ${repoRes.status}`);
      return null;
    }

    const repoData: any = await repoRes.json();
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    let readmeContent = '';
    if (readmeRes.ok) {
      const readmeData: any = await readmeRes.json();
      if (readmeData.content) {
        readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8').substring(0, 5000);
      }
    }

    const textContent = `
GIT REPOSITORY ANALYZED via GITHUB REST API
URL: ${originalUrl}
Repository: ${repoData.full_name || `${owner}/${repo}`}
Description: ${repoData.description || 'No description available.'}
Primary Language: ${repoData.language || 'Unknown'}
Stars: ${repoData.stargazers_count ?? 'Unknown'}
Forks: ${repoData.forks_count ?? 'Unknown'}

README & Documentation:
${readmeContent || 'No README available through GitHub REST API.'}
    `.trim();

    return {
      sourceName: `Git Repo: ${repoData.full_name || `${owner}/${repo}`}`,
      textContent,
    };
  } catch (err) {
    console.warn('GitHub REST API fallback failed:', err);
    return null;
  }
}

async function postJsonRpc(endpoint: string, method: string, params?: unknown): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `pensieve-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        method,
        params: params ?? {},
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text.trim()) return null;
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function compactMcpPayload(payload: unknown): string {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload.substring(0, 1000);
  return JSON.stringify(payload).substring(0, 1000);
}

async function safePostJsonRpc(endpoint: string, method: string, params?: unknown): Promise<any | null> {
  try {
    return await postJsonRpc(endpoint, method, params);
  } catch (err: any) {
    return { error: err.message || 'Unknown MCP error' };
  }
}

export async function resolveMcpContext(
  servers: McpServerContextSource[] | undefined,
  fallbackContext = ''
): Promise<string> {
  const enabledServers = (servers || [])
    .filter(server => server?.endpoint && server.isEnabled !== false && (server.endpoint.startsWith('http://') || server.endpoint.startsWith('https://')))
    .slice(0, 3);

  if (enabledServers.length === 0) {
    return fallbackContext;
  }

  const resolveAllPromise = Promise.all(enabledServers.map(async server => {
    const header = `${server.name}${server.category ? ` (${server.category})` : ''}: ${server.endpoint}`;
    const toolsList = await safePostJsonRpc(server.endpoint, 'tools/list');
    if (!toolsList || toolsList.error) return '';

    return [
      `MCP Server: ${header}`,
      `tools/list: ${compactMcpPayload(toolsList?.result || toolsList)}`,
    ].filter(Boolean).join('\n');
  }));

  const raceTimeoutPromise = new Promise<string[]>(resolve => setTimeout(() => resolve([]), 1200));

  const contextBlocks = await Promise.race([resolveAllPromise, raceTimeoutPromise]);

  return [fallbackContext, ...contextBlocks].filter(Boolean).join('\n\n').substring(0, 6000);
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
      console.warn('YouTube oEmbed extraction failed:', err);
    }
  }

  // Generic website / Wikipedia
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(cleanUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Pensieve/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 5000);

      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1] : 'Web Document';

      return {
        sourceName: `Decoded Link: ${pageTitle.trim()}`,
        textContent: cleanText,
      };
    }
  } catch (err) {
    console.warn('Direct web page fetch failed:', err);
  }

  return {
    sourceName: `Link Note: ${cleanUrl}`,
    textContent: `Ingested content from link ${cleanUrl}. Detailed research note on topic and core principles.`,
  };
}

// -------------------------------------------------------------------
// MAIN INGESTION DISPATCHER
// -------------------------------------------------------------------
export async function decodeContentWithAI(
  sourceTitle: string,
  rawText: string,
  openRouterKey?: string,
  modelName: string = 'nvidia/llama-3.1-nemotron-70b-instruct',
  mcpContext = '',
  fileBase64?: string,
  mimeType?: string
): Promise<IngestClusterResult> {
  const prompt = `
SOURCE ITEM TO DECODE INTO ZETTELKASTEN KNOWLEDGE NODES:
Source Title: ${sourceTitle}

RAW CONTENT / EXTRACTED TEXT:
${rawText}

${mcpContext ? `MODEL CONTEXT PROTOCOL (MCP) ENRICHMENT:\n${mcpContext}` : ''}

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

  // 3. Robust Heuristic Fallback (Instant zero-delay response!)
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
