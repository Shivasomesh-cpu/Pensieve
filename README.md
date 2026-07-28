# Pensieve — AI-Powered Zettelkasten Knowledge Graph & Link Decoder

**Pensieve** is a full-stack, bi-directional personal knowledge management (PKM) application inspired by Obsidian and Roam Research. It features live OpenRouter AI key authentication, NVIDIA Nemotron model support, 10+ Model Context Protocol (MCP) server integrations, terminal-level Git clone repository extraction, and interactive 2D physics graph visualization.

---

## 🌟 Key Features

### 1. 🧬 AI Ingestion & Link Decoder (OpenRouter & Nemotron)
- **OpenRouter API Key Login**: Enter your OpenRouter key directly in the UI to authenticate and choose from models like **NVIDIA Nemotron 70B Instruct**, **Nemotron 4 340B**, **Claude 3.5 Sonnet**, and **Llama 3.3 70B**.
- **Terminal Git Clone Analyzer**: Ingest any GitHub repository (`https://github.com/user/repo`). The backend uses terminal execution (`git clone --depth 1`) to extract file trees, package manifests, and README documentation before feeding it into Nemotron to generate interconnected Zettelkasten notes.
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

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- Git CLI installed on host terminal

### 1. Installation
```bash
git clone https://github.com/YOUR_USERNAME/pensieve-knowledge-graph.git
cd pensieve-knowledge-graph
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build & Production Start
```bash
npm run build
npm start
```

---

## 🔑 AI Key Configuration

You can use Pensieve in two ways:
1. **In-App OpenRouter Login**: Click the **"OpenRouter Key"** button in the top toolbar to enter your `sk-or-v1-...` key and choose your preferred Nemotron model.
2. **Server Environment Variable**: Alternatively, set `GEMINI_API_KEY` in your `.env` file for automatic Gemini 2.5 Flash fallback decoding.

---

## 🛠️ Project Architecture

```
pensieve/
├── server.ts               # Express server with Vite middleware & REST endpoints
├── server/
│   ├── db.ts               # SQLite database setup, schema, and Wikilink graph engine
│   └── ingest.ts           # Terminal git clone execution & OpenRouter Nemotron AI decoding
├── src/
│   ├── App.tsx             # Main layout, global state, and modal orchestrator
│   ├── components/
│   │   ├── LeftPane.tsx            # Navigation, search filters, and note list
│   │   ├── CenterEditor.tsx        # Markdown editor & live preview
│   │   ├── RightPane.tsx           # 2D canvas force graph & backlinks inspector
│   │   ├── IngestModal.tsx         # Link & File ingestion interface
│   │   ├── OpenRouterLoginModal.tsx# OpenRouter key authentication modal
│   │   └── McpHubModal.tsx         # Model Context Protocol server hub
│   └── types.ts            # TypeScript interfaces
└── package.json            # Scripts & dependencies
```

---

## 📦 How to Push to GitHub

Execute the following commands in your terminal to push this project to your GitHub repository:

```bash
# 1. Initialize Git repository
git init

# 2. Add all files and make initial commit
git add .
git commit -m "Initial commit: Pensieve PKM with OpenRouter Nemotron AI and MCP Hub"

# 3. Create a new repository on GitHub (https://github.com/new) and link it
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 4. Push to GitHub
git push -u origin main
```

---

## 📄 License

MIT License. Feel free to fork, customize, and extend Pensieve for your personal knowledge workflow!
