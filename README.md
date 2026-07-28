# Pensieve - AI-Powered Zettelkasten Knowledge Graph & Link Decoder

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShivasomesh-cpu%2FPensieve)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18.0-cyan)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)
![Vercel](https://img.shields.io/badge/Vercel-Serverless-black)

Pensieve is an ultra-modern, bi-directional personal knowledge management (PKM) and research workspace inspired by Obsidian, Roam Research, and Mem.ai. Designed for researchers, developers, and thinkers, Pensieve seamlessly bridges atomic Zettelkasten note-taking, interactive physics graph visualization, OpenRouter AI copilot capabilities, and Model Context Protocol (MCP) server integrations.

---

> **IMPORTANT MODEL ADVICE AND RECOMMENDED CONFIGURATION**:
>
> When using the OpenRouter AI copilot or Link Decoder in Pensieve, **PLEASE SELECT `meta-llama/llama-3.3-70b-instruct` (Llama 3.3 70B Instruct)** in the model selector dropdown.
>
> **Other models are currently under active work and development and may produce unstable or incomplete results.** For maximum output reliability, structured JSON link decoding, and fast response times, **Llama 3.3 70B Instruct** is strictly recommended.

---

## System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                CLIENT BROWSER                                     |
|  +-------------------+    +-------------------------+    +---------------------+  |
|  | Left Nav Sidebar  | -- | Center Markdown Editor  | -- | Right Graph & Links |  |
|  |  Search & Filter  |    |  Split Preview / Editor |    | Resizable 2D Canvas |  |
|  +-------------------+    +-------------------------+    +---------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          | REST API Requests (/api/*)
                                          v
+-----------------------------------------------------------------------------------+
|                     VERCEL SERVERLESS / EXPRESS BACKEND ENGINE                    |
|                                                                                   |
|  +------------------------------+              +-------------------------------+  |
|  |     Express API Router       |              |    Git & Web Link Ingest      |  |
|  |  /api/notes, /api/graph, etc |              |  Terminal Clone & Scraper     |  |
|  +--------------+---------------+              +---------------+---------------+  |
|                 |                                              |                  |
|                 v                                              v                  |
|  +------------------------------+              +-------------------------------+  |
|  |  WebAssembly SQLite Engine   |              |   OpenRouter AI Client        |  |
|  |  (sql.js in /tmp/pensieve)   |              |   Llama 3.3 70B Instruct      |  |
|  +------------------------------+              +---------------+---------------+  |
|                                                                |                  |
|                                                +---------------+---------------+  |
|                                                |   Model Context Protocol      |  |
|                                                |   (10+ Active MCP Servers)    |  |
|                                                +-------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## Features and UI Screenshots

### 1. Interactive 2D Canvas Knowledge Graph
Dynamically parses all `[[Wikilinks]]` across your vault to generate a real-time, interactive physics simulation canvas. Nodes dynamically scale in size based on link connections, and automatically surface placeholder **Ghost Nodes** for references you haven't written yet.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/01-interactive-knowledge-graph.png" alt="Interactive Knowledge Graph" width="100%" />
</p>

**Key Capabilities:**
- Real-time force-directed canvas physics with node selection and pulse highlights.
- Ghost node auto-detection for uncreated `[[Wikilink]]` references.
- Quick zoom, pan, re-center controls, and tag search filter.
- Fully resizable window width with interactive drag handle and preset sizing buttons (S / M / L).

---

### 2. Zettelkasten Markdown Editor and Live Preview
A dual-mode typography editor built for deep thought. Switch effortlessly between raw Markdown input and a live rendered preview with full mathematical formula rendering, code block syntax highlighting, and auto-generated reading statistics.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/02-zettelkasten-markdown-editor.png" alt="Zettelkasten Markdown Editor" width="100%" />
</p>

**Key Capabilities:**
- Instant toggle between Edit, Live Split, and Full Preview modes.
- Real-time word count, character count, and estimated reading time badges.
- Tag auto-detection and category badges (Journal, Ghost Reference, Zettel).
- One-click Markdown copy and quick text formatting toolbar.

---

### 3. AI Research Copilot and Zettel Atomic Splitter
Integrated directly with OpenRouter AI using **Llama 3.3 70B Instruct**. The AI copilot acts as a research co-thinker—summarizing dense documents, auto-generating tags, and automatically breaking long essays down into interconnected atomic Zettel notes.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/03-ai-copilot-research-assistant.png" alt="AI Research Copilot" width="100%" />
</p>

**Key Capabilities:**
- **Atomic Zettel Splitter**: Converts verbose long-form text into modular, linked notes.
- **Smart Summarizer and Tag Generator**: Extracts key insights and tags in seconds.
- **Interactive AI Chat**: Ask questions grounded directly on your selected note context.
- Dedicated model selector highlighting **Llama 3.3 70B Instruct**.

---

### 4. Web Link Ingestion and GitHub Repository Decoder
Paste any website URL, YouTube link, Wikipedia article, or GitHub repository (`https://github.com/user/repo`). Pensieve executes deep content fetching—cloning Git repositories via terminal execution—to automatically parse file trees and READMEs into an interconnected Zettelkasten note collection.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/04-link-decoder-ingestion.png" alt="Web Link Ingestion and Git Decoder" width="100%" />
</p>

**Key Capabilities:**
- Fast GitHub REST API repository extraction (~300ms).
- Automatic website scraping and Markdown conversion.
- Direct PDF, Markdown, and raw text document drag-and-drop import.

---

### 5. Model Context Protocol (MCP) Server Hub
Connect your knowledge graph directly to external developer tools, cloud data, and external APIs using the **Model Context Protocol (MCP)**.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/05-mcp-server-hub.png" alt="Model Context Protocol MCP Hub" width="100%" />
</p>

**Pre-configured MCP Server Integrations:**
1. **GitHub MCP Server** - Query repositories, issues, and PR context.
2. **ArXiv Research MCP** - Fetch recent academic papers and citations.
3. **Wikipedia Entity MCP** - Pull entity definitions and summary links.
4. **YouTube Transcripts MCP** - Extract timestamped video transcripts into notes.
5. **Google Drive & Docs MCP** - Search cloud documents directly.
6. **Brave Search MCP** - Perform live web search queries for real-time fact checking.
7. **SQL Database Schema MCP** - Query database tables and structures.
8. **Figma & Design Tokens MCP** - Inspect UI components and design specs.
9. **Slack & Discord Thread MCP** - Import message discussions into Zettels.
10. **Obsidian & Notion Vault MCP** - Sync local markdown files across platforms.

---

### 6. Document & File Import Dropzone
Drag and drop PDF documents, Markdown files, or raw text directly into the ingestion modal to automatically decode them into connected Zettel nodes.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/06-upload-file-dropzone.png" alt="Document Ingestion Dropzone" width="100%" />
</p>

---

## Technical Stack

- **Frontend Framework**: React 18, Vite 6, TailwindCSS 4
- **Icons & Motion**: Lucide React, Motion (Framer)
- **Editor Engine**: Marked.js with custom KaTeX & Prism plugins
- **Graph Canvas**: HTML5 Canvas with custom D3 force-directed physics engine
- **Backend API**: Express 4 running on Vercel Serverless Functions (`@vercel/node`)
- **Database**: SQLite3 compiled to WebAssembly (`sql.js`) with `/tmp` file persistence
- **AI Completion Engine**: OpenRouter API (`https://openrouter.ai/api/v1/chat/completions`)

---

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/Shivasomesh-cpu/Pensieve.git
cd Pensieve

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` to interact with your local Pensieve instance.

---

## Deploying to Vercel

Pensieve is pre-configured for Vercel Serverless deployment out-of-the-box.

1. Import `Shivasomesh-cpu/Pensieve` into your [Vercel Dashboard](https://vercel.com).
2. Vercel automatically detects the Vite build settings and `vercel.json` routing configuration.
3. Click **Deploy**!

---

## License

Distributed under the MIT License. See `LICENSE` for details.
