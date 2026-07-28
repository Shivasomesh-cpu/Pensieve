# Pensieve — AI-Powered Zettelkasten Knowledge Graph & Link Decoder

[![Deploy with Vercel](https.vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FShivasomesh-cpu%2FPensieve)

**Pensieve** is a full-stack, bi-directional personal knowledge management (PKM) application inspired by Obsidian and Roam Research. It features live OpenRouter AI key authentication, NVIDIA Nemotron model support, 10+ Model Context Protocol (MCP) server integrations, terminal-level Git clone repository extraction, Vercel Serverless deployment, and interactive 2D physics graph visualization.

---

## 🌐 Live Vercel Deployment Architecture

Pensieve is optimized to run seamlessly as a hybrid Serverless Single Page Application on **Vercel**:
- **API Serverless Handler**: REST endpoints (`/api/*`) run as lightweight Node serverless functions in `api/index.ts`.
- **Static Asset Serving**: Vite frontend assets are statically compiled into `dist/` and served via Vercel's Edge CDN.
- **Serverless SQLite Engine**: Uses `sql.js` (WebAssembly SQLite) initialized in `/tmp/pensieve.sqlite` to prevent read-only filesystem errors (`EROFS`).

---

## 🌟 Key Features

### 1. 🧬 AI Ingestion & Link Decoder (OpenRouter & Nemotron)
- **OpenRouter API Key Login**: Enter your OpenRouter key directly in the UI to authenticate and choose from models like **NVIDIA Nemotron 70B Instruct**, **Nemotron 4 340B**, **Claude 3.5 Sonnet**, and **Llama 3.3 70B**.
- **Terminal Git Clone Analyzer**: Ingest any GitHub repository (`https://github.com/user/repo`). The backend uses terminal execution (`git clone --depth 1`) or GitHub REST API fallback to extract file trees, package manifests, and README documentation before feeding it into Nemotron to generate interconnected Zettelkasten notes.
- **Link & Document Decoder**: Ingest YouTube links, Wikipedia articles, web URLs, PDFs, Markdown files, or images into automatically linked knowledge nodes with `[[Wikilinks]]`.

### 2. 🔌 Model Context Protocol (MCP) Server Hub
- Integrated 10 core MCP Server presets:
  - **GitHub MCP Server**
  - **ArXiv Research MCP**
  - **Wikipedia Entity MCP**
  - **YouTube Transcripts MCP**
  - **Google Drive & Docs MCP**
  - **Brave Search MCP**
  - **SQL Database Schema MCP**
  - **Figma & Design Tokens MCP**
  - **Slack & Discord Thread MCP**
  - **Obsidian & Notion Vault MCP**
- **Custom MCP Registration**: Add custom SSE / HTTP MCP endpoints to enrich AI context during knowledge graph extraction.

### 3. 🕸️ Bidirectional [[Wikilink]] Knowledge Graph
- **SQLite Graph Engine**: Automatic detection and parsing of `[[Wikilinks]]` in note content.
- **Ghost Notes**: Auto-generates placeholder "Ghost Nodes" for uncreated references.
- **Canvas Force Simulation**: Interactive 2D physics graph with node selection, highlighting, zoom controls, and backlinks pane.

### 4. 📝 Zettelkasten Editor & Reflection Journaling
- **Rich Markdown Editor**: Live preview mode, syntax highlighting, tag auto-detection, and note metadata.
- **Daily Reflection Journal**: One-click daily journal creation with streak tracker and historical activity logging.
- **Clean Canvas Control**: Easily clear sample/default notes to start with a blank knowledge canvas.

---

## 🚀 Deployment Guide (Vercel)

### Option 1: 1-Click Vercel Import
1. Push your repository to GitHub: `https://github.com/Shivasomesh-cpu/Pensieve`
2. Open [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** > **Project**.
3. Import `Shivasomesh-cpu/Pensieve`.
4. Deploy! Vercel automatically detects the `vercel.json` rewrites and Vite build settings.

### Option 2: Local Development
```bash
# 1. Clone repository
git clone https://github.com/Shivasomesh-cpu/Pensieve.git
cd Pensieve

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

---

## 🔑 AI Key Configuration

You can use Pensieve in two ways:
1. **In-App OpenRouter Key Login**: Click the **"OpenRouter Key"** button in the top toolbar to enter your `sk-or-v1-...` key (stored locally in browser headers).
2. **Server Environment Variable**: Optionally set `GEMINI_API_KEY` in your `.env` file as an automatic fallback model.

---

## 🛠️ Project Architecture

```
Pensieve/
├── api/
│   └── index.ts            # Vercel Serverless Function API entry point
├── server.ts               # Local standalone Express server
├── vercel.json             # Vercel build & route rewrite configuration
├── server/
│   ├── app.ts              # Modular Express app routes and API definitions
│   ├── db.ts               # SQLite database setup, schema, and Wikilink graph engine
│   └── ingest.ts           # Git clone execution & OpenRouter Nemotron AI decoding
├── src/
│   ├── App.tsx             # Main layout, global state, and modal orchestrator
│   ├── components/
│   │   ├── LeftPane.tsx            # Navigation, search filters, and note list
│   │   ├── CenterEditor.tsx        # Markdown editor & live preview
│   │   ├── RightPane.tsx           # 2D canvas force graph & backlinks inspector
│   │   ├── IngestModal.tsx         # Link & File ingestion interface
│   │   ├── OpenRouterLoginModal.tsx# OpenRouter key authentication modal
│   │   ├── AboutModal.tsx          # About & Vercel deployment modal
│   │   └── McpHubModal.tsx         # Model Context Protocol server hub
│   └── types.ts            # TypeScript interfaces
└── package.json            # Scripts & dependencies
```

---

## 📄 License

MIT License. Feel free to fork, customize, and extend Pensieve for your personal knowledge workflow!
