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
            content: `You are Nemotron 70B AI, an expert Zettelkasten Knowledge Base Architect.
Generate a rich, highly detailed Zettelkasten cluster. Each note MUST contain at least 2 to 3 detailed paragraphs with markdown headers, bullet points, technical breakdowns, embedded [[Wikilinks]], and tags.

Respond STRICTLY with raw valid JSON matching this schema:
{
  "mainNote": {
    "title": "Master Note Title",
    "content": "# Master Note Title\\n\\n## Executive Summary & Core Thesis\\nFirst detailed paragraph detailing the overarching architecture, domain context, and core purpose...\\n\\n## Key Sub-Concepts\\n- **[[Sub Concept 1]]**: Deep dive topic breakdown.\\n- **[[Sub Concept 2]]**: Operational principles and mechanics.\\n\\n## Synthesis & Future Outlook\\nSecond detailed paragraph analyzing practical applications and cross-referencing [[Sub Concept 1]]...",
    "tags": ["architecture", "main-topic"]
  },
  "connectedNotes": [
    {
      "title": "Sub Concept 1",
      "content": "# Sub Concept 1\\n\\n## Conceptual Foundations\\nComprehensive first paragraph detailing mechanics of Sub Concept 1 within [[Master Note Title]]...\\n\\n## Implementation & Workflows\\nDetailed second paragraph explaining execution parameters, state handling, and interactions with [[Sub Concept 2]]...\\n\\n- **Key Insight**: Subsystem interaction details.\\n\\n## Cross-Domain Links\\nThird paragraph synthesizing connections back to [[Master Note Title]].",
      "tags": ["concept", "subsystem"]
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Pensieve-Knowledge-Ingest/1.0',
    };
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, signal: controller.signal });
    if (!repoRes.ok) {
      console.warn(`GitHub REST fallback failed with status ${repoRes.status}`);
      return null;
    }

    const repoData: any = await repoRes.json();
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, signal: controller.signal });
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
  } finally {
    clearTimeout(timeout);
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
// Helper for Gemini AI calls with model fallback
async function callGeminiForJson(contents: any[], systemPrompt: string): Promise<IngestClusterResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting content decoding via Gemini model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: 'application/json' },
      });

      const rawText = response.text || '';
      const parsed = extractJsonObject(rawText) || JSON.parse(rawText || '{}');
      if (parsed.mainNote && Array.isArray(parsed.connectedNotes)) {
        return parsed as IngestClusterResult;
      }
    } catch (err) {
      console.warn(`Gemini model ${model} failed, trying next...`, err);
    }
  }
  return null;
}

// General text completion helper using OpenRouter or Gemini
export async function callGeneralAICompletion(
  userPrompt: string,
  systemPrompt: string,
  openRouterApiKey?: string,
  modelName: string = 'nvidia/llama-3.1-nemotron-70b-instruct'
): Promise<string> {
  // 1. Try OpenRouter if key is present
  if (openRouterApiKey && openRouterApiKey.trim()) {
    try {
      console.log(`Executing AI completion via OpenRouter model: ${modelName}`);
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt.substring(0, 6000) }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn('OpenRouter general completion failed:', err);
    }
  }

  // 2. Fall back to Gemini API
  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const model of modelsToTry) {
      try {
        console.log(`Executing AI completion via Gemini model: ${model}`);
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        });
        if (response.text) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn(`Gemini completion model ${model} failed:`, err);
      }
    }
  }

  throw new Error('AI API unavailable. Please configure your OpenRouter key or check your connection.');
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
    const systemPrompt = `
You are an expert Zettelkasten Knowledge Base Architect using Nemotron / Gemini AI.
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

    const geminiResult = await callGeminiForJson(contents, systemPrompt);
    if (geminiResult) {
      return geminiResult;
    }
  }

  // 3. Smart Dynamic Heuristic Fallback based on extracted text content
  return generateFallbackCluster(sourceTitle, rawText);
}

function generateFallbackCluster(sourceTitle: string, rawText: string): IngestClusterResult {
  const cleanTitle = sourceTitle.replace(/^(GitHub:|Git Repo:|YouTube:|Decoded Link:)\s*/i, '').trim() || 'Ingested Knowledge Note';
  
  // Extract real headings or phrases from rawText
  const headingMatches = rawText.match(/(?:#+|##|===|\b[A-Z][a-zA-Z0-9_\-]{3,}\b)/g) || [];
  const words = rawText.match(/\b[A-Z][a-zA-Z0-9_\-\.\/]{3,}\b/g) || [];
  
  const candidateTopics = Array.from(new Set([...headingMatches, ...words]))
    .filter(w => !['README', 'GIT', 'URL', 'REPOSITORY', 'CLONED', 'ANALYZED', 'Package', 'Manifest'].includes(w))
    .slice(0, 6);

  const sub1 = candidateTopics[0] || 'Core Implementation';
  const sub2 = candidateTopics[1] || 'Configuration & Setup';
  const sub3 = candidateTopics[2] || 'Data Models & State';
  const sub4 = candidateTopics[3] || 'Integration Architecture';

  const snippets = rawText.split('\n').filter(line => line.trim().length > 15).slice(0, 5).join('\n> ');

  const mainNote: IngestNoteResult = {
    title: cleanTitle,
    content: `# ${cleanTitle}

## Executive Summary & Overview
This knowledge note represents an ingested Zettelkasten master node extracted from **${sourceTitle}**. The source material encapsulates core systems design, domain concepts, and technical operational parameters that underpin the knowledge domain.

## Key Architectural Clusters
The analyzed material organizes into four primary interconnected sub-concepts:
- **[[${sub1}]]**: Foundational framework and high-level architectural mechanics.
- **[[${sub2}]]**: Environment parameters, deployment configurations, and runtime dependencies.
- **[[${sub3}]]**: Core logic, data pipelines, and internal state management.
- **[[${sub4}]]**: Modular interfaces, API contracts, and external system integrations.

## Core Documentation & Excerpts
> ${snippets || rawText.substring(0, 1000)}

## Knowledge Graph Connections
This master node serves as a primary hub within the graph, actively referencing [[${sub1}]], [[${sub2}]], [[${sub3}]] and [[${sub4}]]. Each sub-node maintains bi-directional backlinks to ensure seamless traversal across concepts.`,
    tags: ['imported', 'knowledge-node', 'architecture'],
  };

  const connectedNotes: IngestNoteResult[] = [
    {
      title: sub1,
      content: `# ${sub1}

## Functional Breakdown
**${sub1}** forms the core foundational pillar of [[${cleanTitle}]]. It encapsulates the primary execution logic, structural abstractions, and design patterns required to sustain operational stability across the system.

## System Mechanics & Interactions
This component orchestrates control flow and interfaces directly with [[${sub2}]] for configuration parameters and [[${sub3}]] for persistent state operations. By decoupling core execution from state management, it ensures high scalability and modularity.

- **Primary Abstraction**: Modular framework architecture.
- **State Coupling**: Interacts with [[${sub3}]] via defined event hooks.
- **Error Boundaries**: Provides defensive error handling across execution paths.

## Zettelkasten Context
Derived from [[${cleanTitle}]], this note provides deep context for developers and researchers exploring system architecture.`,
      tags: ['concept', 'architecture', 'core'],
    },
    {
      title: sub2,
      content: `# ${sub2}

## Operational Setup & Environment Configuration
**${sub2}** defines the essential environment variables, execution scripts, and infrastructure configurations required to run [[${cleanTitle}]] reliably across staging and production environments.

## Deployment & Dependency Pipeline
Proper configuration ensures seamless initialization and prevents runtime environment mismatches. It integrates closely with [[${sub4}]] to establish secure network transport and external API bindings.

- **Environment Vars**: Requires configuration keys stored securely.
- **Initialization**: Automatically boots sub-routines managed by [[${sub1}]].
- **Health Checks**: Monitored continuously for operational metrics.

## Zettelkasten Context
Linked directly to [[${cleanTitle}]] and [[${sub4}]], establishing a clear audit trail for operational setup.`,
      tags: ['setup', 'config', 'devops'],
    },
    {
      title: sub3,
      content: `# ${sub3}

## Data Models & Pipeline Mechanics
**${sub3}** governs the internal state lifecycle, data schemas, and synchronization routines across [[${cleanTitle}]]. It ensures transactional integrity, fast data retrieval, and efficient mutation handling.

## State Transitions & Event Flow
Data changes trigger reactive updates that cascade to [[${sub1}]] and radiate across the knowledge graph. The schema enforces strict typing and validation checks before persisting data to the underlying store.

- **Schema Integrity**: Validates payload structure at runtime.
- **Persistence**: Synchronizes state with SQLite storage.
- **Reactive Handlers**: Notifies connected components upon update.

## Zettelkasten Context
Forms the data backbone for [[${cleanTitle}]], linking seamlessly with [[${sub1}]] and [[${sub4}]].`,
      tags: ['data', 'state', 'schema'],
    },
    {
      title: sub4,
      content: `# ${sub4}

## Integration Architecture & External Contracts
**${sub4}** specifies the external API contracts, protocol adapters, and network communications for [[${cleanTitle}]]. It abstracts third-party services, AI completion models, and remote endpoint interactions.

## Protocol Adapters & Fallback Handling
By establishing clear interface boundaries, this module supports seamless fallbacks—such as transitioning between OpenRouter Nemotron models and Gemini AI handlers—without interrupting core client workflows.

- **API Contracts**: Standardized JSON RPC / REST payloads.
- **Resilience**: Features exponential backoff and intelligent failovers.
- **Telemetry**: Logs request metrics for system monitoring.

## Zettelkasten Context
Derived from [[${cleanTitle}]], linking directly with [[${sub2}]] and [[${sub1}]] for holistic system understanding.`,
      tags: ['integration', 'system', 'api'],
    },
  ];

  return { mainNote, connectedNotes };
}
