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

## Features and Screenshots

### 1. Interactive 2D Canvas Knowledge Graph
Dynamically parses all `[[Wikilinks]]` across your vault to generate a real-time, interactive physics simulation canvas. Nodes dynamically scale in size based on link connections, and automatically surface placeholder **Ghost Nodes** for references you haven't written yet.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/01-interactive-knowledge-graph.jpg" alt="Interactive Knowledge Graph" width="100%" />
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
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/02-zettelkasten-markdown-editor.jpg" alt="Zettelkasten Markdown Editor" width="100%" />
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
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/03-ai-copilot-research-assistant.jpg" alt="AI Research Copilot" width="100%" />
</p>

**Key Capabilities:**
- **Atomic Zettel Splitter**: Converts verbose long-form text into modular, linked notes.
- **Smart Summarizer and Tag Generator**: Extracts key insights and tags in seconds.
- **Interactive AI Chat**: Ask questions grounded directly on your selected note context.
- Dedicated model selector highlighting **Llama 3.3 70B Instruct**.

---

### 4. Model Context Protocol (MCP) Server Hub
Connect your knowledge graph directly to external developer tools, cloud data, and external APIs using the **Model Context Protocol (MCP)**.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/04-mcp-server-hub.jpg" alt="Model Context Protocol MCP Hub" width="100%" />
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

### 5. Web Link Ingestion and GitHub Repository Decoder
Paste any website URL, YouTube link, Wikipedia article, or GitHub repository (`https://github.com/user/repo`). Pensieve executes deep content fetching—cloning Git repositories via terminal execution—to automatically parse file trees and READMEs into an interconnected Zettelkasten note collection.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/05-link-decoder-ingestion.jpg" alt="Web Link Ingestion and Git Decoder" width="100%" />
</p>

**Key Capabilities:**
- Terminal-level `git clone --depth 1` repository extraction.
- Automatic website scraping and Markdown conversion.
- Direct PDF, Markdown, and raw text document drag-and-drop import.

---

### 6. Bi-directional Backlinks and References Inspector
Never lose context. The dedicated Backlinks Inspector indexes both explicit `[[Wikilinks]]` referencing the active note and **Unlinked Mentions** found throughout your vault.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/06-bidirectional-backlinks-panel.jpg" alt="Bi-directional Backlinks Inspector" width="100%" />
</p>

**Key Capabilities:**
- Explicit references list showing surrounding excerpt context.
- Unlinked mentions auto-detector with one-click "Convert to Link" action.
- Ghost node list displaying all dangling references across your graph.

---

### 7. Daily Reflection Journal and Writing Habit Tracker
Stay consistent with built-in daily journaling. Track your active writing streak, monitor daily word count goals, and visualize your historical knowledge creation via an activity heatmap.

<p align="center">
  <img src="https://raw.githubusercontent.com/Shivasomesh-cpu/Pensieve/main/public/screenshots/07-journal-streak-habit-tracker.jpg" alt="Daily Journal and Habit Tracker" width="100%" />
</p>

**Key Capabilities:**
- One-click creation of dated Daily Reflection Journals (`#journal`).
- Active streak counter and total word production analytics.
- Activity calendar heatmap tracking note updates.

---

## Quick Start and Installation

### Option 1: Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shivasomesh-cpu/Pensieve.git
   cd Pensieve
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Option 2: Deploying to Vercel

Pensieve is pre-configured for **Vercel Serverless** deployment:

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
3. Import `Shivasomesh-cpu/Pensieve`.
4. Click **Deploy**. Vercel handles the Serverless build (`vercel.json`) and static asset routing automatically.

---

## AI Key Setup

Pensieve allows zero-config key entry directly in the user interface:

1. Click the **OpenRouter Key** button in the top navigation bar.
2. Enter your OpenRouter API key (`sk-or-v1-...`).
3. Select **`meta-llama/llama-3.3-70b-instruct`** (**Llama 3.3 70B Instruct**) from the model list.
4. Your key is stored securely in your browser local memory and sent only via encrypted headers directly to the OpenRouter API.

Optionally, you can define a default server-side key in `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-...
```

---

## Repository Directory Structure

```
Pensieve/
├── api/
│   └── index.ts            # Vercel Serverless function entry point
├── public/
│   └── screenshots/        # Feature screenshots for README
├── server/
│   ├── app.ts              # Express API endpoints (/api/notes, /api/graph, /api/mcp)
│   ├── db.ts               # WebAssembly SQLite database setup & Wikilink indexer
│   └── ingest.ts           # Git terminal cloner & OpenRouter Llama decoding logic
├── src/
│   ├── App.tsx             # Root layout, resizable panes, & global state
│   ├── components/
│   │   ├── LeftPane.tsx            # Search filters, tag manager, & note list
│   │   ├── CenterEditor.tsx        # Markdown editor, previewer, & AI copilot
│   │   ├── RightPane.tsx           # Resizable 2D knowledge graph & backlinks
│   │   ├── KnowledgeGraph.tsx      # Canvas force simulation renderer
│   │   ├── IngestModal.tsx         # Web URL & Git repository cloner modal
│   │   ├── McpHubModal.tsx         # 10+ Model Context Protocol server hub
│   │   ├── OpenRouterLoginModal.tsx# AI Key configuration modal
│   │   └── ClearCanvasModal.tsx    # Wiping canvas confirmation modal
│   └── types.ts            # TypeScript interfaces
├── vercel.json             # Vercel serverless build rewrite config
├── server.ts               # Local standalone Express dev server
└── package.json            # Project dependencies & scripts
```

---

## License

This project is open-source under the **MIT License**.
