import React, { useState } from 'react';
import { Network, Check, Plus, X, Server, Globe, Database, FileCode, Search, MessageSquare, BookOpen, Layers } from 'lucide-react';

export interface McpServer {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
  isEnabled: boolean;
  iconName: string;
}

interface McpHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpServers: McpServer[];
  onToggleServer: (id: string) => void;
  onAddCustomServer: (server: McpServer) => void;
}

const DEFAULT_MCP_PRESETS: Omit<McpServer, 'isEnabled'>[] = [
  {
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    category: 'Source Code & Repos',
    description: 'Direct repository cloning, file trees, commit history, issue tracking, and PR analysis.',
    endpoint: 'https://mcp.github.com/v1',
    iconName: 'github',
  },
  {
    id: 'arxiv-mcp',
    name: 'ArXiv Research MCP',
    category: 'Academic & Science',
    description: 'Fetch peer-reviewed research papers, LaTeX formulas, citations, and author graphs.',
    endpoint: 'https://mcp.arxiv.org/sse',
    iconName: 'book',
  },
  {
    id: 'wikipedia-mcp',
    name: 'Wikipedia Entity MCP',
    category: 'Knowledge Base',
    description: 'Deep encyclopedic entity disambiguation, Wikidata items, and historical cross-links.',
    endpoint: 'https://mcp.wikimedia.org/api',
    iconName: 'globe',
  },
  {
    id: 'youtube-mcp',
    name: 'YouTube Transcripts MCP',
    category: 'Video & Media',
    description: 'Extract auto-captions, timestamps, chapter breakdowns, and speaker summaries.',
    endpoint: 'https://mcp.youtube-analyzer.io',
    iconName: 'video',
  },
  {
    id: 'gdrive-mcp',
    name: 'Google Drive & Docs MCP',
    category: 'Cloud Storage',
    description: 'Parse Google Docs, Sheets, Slides, PDF attachments, and shared workspace folders.',
    endpoint: 'https://mcp.workspace.google.com',
    iconName: 'file',
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search MCP',
    category: 'Web Scraping & Index',
    description: 'Real-time live web indexing, news feeds, article extraction, and site crawling.',
    endpoint: 'https://api.search.brave.com/mcp',
    iconName: 'search',
  },
  {
    id: 'sql-schema-mcp',
    name: 'SQL Database Schema MCP',
    category: 'Databases & Relational',
    description: 'Analyze PostgreSQL/SQLite schema DDL, ERD entity relationships, and table foreign keys.',
    endpoint: 'https://mcp.sql-inspector.internal',
    iconName: 'database',
  },
  {
    id: 'figma-mcp',
    name: 'Figma & Design Tokens MCP',
    category: 'Design Systems',
    description: 'Extract component hierarchies, design tokens, color variables, and frame specs.',
    endpoint: 'https://mcp.figma.com/v1',
    iconName: 'layers',
  },
  {
    id: 'slack-discord-mcp',
    name: 'Slack & Discord Thread MCP',
    category: 'Communications',
    description: 'Summarize chat threads, action items, team decisions, and developer notes.',
    endpoint: 'https://mcp.chat-bridge.org',
    iconName: 'message',
  },
  {
    id: 'obsidian-vault-mcp',
    name: 'Notion & Obsidian Vault MCP',
    category: 'Zettelkasten Vault',
    description: 'Import Obsidian markdown frontmatter, tags, [[wikilinks]], and graph properties.',
    endpoint: 'https://mcp.obsidian-bridge.io',
    iconName: 'file-code',
  },
];

export const McpHubModal: React.FC<McpHubModalProps> = ({
  isOpen,
  onClose,
  mcpServers,
  onToggleServer,
  onAddCustomServer,
}) => {
  const [customName, setCustomName] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Integration');
  const [showAddCustom, setShowAddCustom] = useState(false);

  if (!isOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customEndpoint.trim()) return;

    const newServer: McpServer = {
      id: `custom-mcp-${Date.now()}`,
      name: customName.trim(),
      category: customCategory.trim() || 'Custom MCP',
      description: `Custom Model Context Protocol server endpoint: ${customEndpoint.trim()}`,
      endpoint: customEndpoint.trim(),
      isEnabled: true,
      iconName: 'server',
    };

    onAddCustomServer(newServer);
    setCustomName('');
    setCustomEndpoint('');
    setShowAddCustom(false);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'globe':
        return <Globe className="w-4 h-4 text-[#1f4959]" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-[#1f4959]" />;
      case 'database':
        return <Database className="w-4 h-4 text-[#1f4959]" />;
      case 'search':
        return <Search className="w-4 h-4 text-[#1f4959]" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-[#1f4959]" />;
      case 'layers':
        return <Layers className="w-4 h-4 text-[#1f4959]" />;
      default:
        return <Server className="w-4 h-4 text-[#1f4959]" />;
    }
  };

  const activeCount = mcpServers.filter(s => s.isEnabled).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#011425]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#FFFFFF] border border-[#1f4959] rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#011425] text-[#FFFFFF] flex items-center justify-between border-b border-[#1f4959] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#1f4959] text-[#FFFFFF] rounded">
              <Network className="w-4 h-4 text-[#5c7c89]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-title font-bold text-sm text-[#FFFFFF]">
                  Model Context Protocol (MCP) Server Hub
                </h2>
                <span className="text-[10px] px-2 py-0.5 bg-[#1f4959] text-[#FFFFFF] font-mono rounded-full">
                  {activeCount} Active
                </span>
              </div>
              <p className="text-[11px] text-[#5c7c89]">
                Enable MCP servers to enrich AI knowledge graph context during links & file decoding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-[#5c7c89] hover:text-[#FFFFFF] transition-colors rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Custom Server Toggle / Form */}
          <div className="flex items-center justify-between bg-[#f0f4f6] p-3 rounded-lg border border-[#5c7c89]/25 text-xs">
            <div>
              <span className="font-semibold text-[#011425]">Custom MCP Server Integration</span>
              <p className="text-[11px] text-[#5c7c89]">Connect your own HTTP/SSE MCP server endpoints</p>
            </div>
            <button
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="px-3 py-1.5 bg-[#1f4959] hover:bg-[#5c7c89] text-[#FFFFFF] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddCustom ? 'Cancel' : 'Add MCP Endpoint'}</span>
            </button>
          </div>

          {showAddCustom && (
            <form onSubmit={handleCreateCustom} className="p-4 bg-[#f0f4f6] border border-[#1f4959]/40 rounded-lg space-y-3 text-xs">
              <h4 className="font-semibold text-[#011425]">Register Custom MCP Endpoint</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5c7c89] mb-1">Server Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="e.g. Local Codebase MCP"
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded text-xs text-[#242424]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5c7c89] mb-1">Category</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    placeholder="e.g. Private API"
                    className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded text-xs text-[#242424]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5c7c89] mb-1">SSE / HTTP Endpoint URL</label>
                <input
                  type="url"
                  value={customEndpoint}
                  onChange={e => setCustomEndpoint(e.target.value)}
                  placeholder="https://mcp.my-server.internal/sse"
                  className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded text-xs font-mono text-[#242424]"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1f4959] text-[#FFFFFF] text-xs font-semibold rounded hover:bg-[#5c7c89] transition-colors cursor-pointer"
                >
                  Save & Enable
                </button>
              </div>
            </form>
          )}

          {/* Preset MCP Servers Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#011425] uppercase tracking-wider">
              Available MCP Servers (10 Core Integrations)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {mcpServers.map(server => (
                <div
                  key={server.id}
                  onClick={() => onToggleServer(server.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all text-xs flex items-start justify-between gap-3 ${
                    server.isEnabled
                      ? 'border-[#1f4959] bg-[#f0f4f6] ring-1 ring-[#1f4959]'
                      : 'border-[#5c7c89]/25 hover:border-[#1f4959]/50 bg-[#FFFFFF] opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-[#FFFFFF] border border-[#5c7c89]/30 rounded shadow-xs mt-0.5">
                      {getCategoryIcon(server.iconName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[#011425]">{server.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-[#1f4959]/10 text-[#1f4959] rounded font-bold">
                          {server.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#5c7c89] leading-tight mt-1">
                        {server.description}
                      </p>
                      <p className="text-[9px] font-mono text-[#1f4959] mt-1.5 truncate max-w-[200px]">
                        {server.endpoint}
                      </p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors ${
                    server.isEnabled ? 'bg-[#1f4959] text-[#FFFFFF] border-[#1f4959]' : 'border-[#5c7c89]/40 bg-[#FFFFFF]'
                  }`}>
                    {server.isEnabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f0f4f6] border-t border-[#5c7c89]/20 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-[11px] text-[#5c7c89]">
            Active MCP context will be injected into OpenRouter Nemotron decoder prompts.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1f4959] text-[#FFFFFF] text-xs font-semibold rounded hover:bg-[#5c7c89] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
