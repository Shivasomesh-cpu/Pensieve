import React, { useEffect, useState, useCallback } from 'react';
import { LeftPane } from './components/LeftPane';
import { CenterEditor } from './components/CenterEditor';
import { RightPane } from './components/RightPane';
import { DeleteWarningModal } from './components/DeleteWarningModal';
import { IngestModal } from './components/IngestModal';
import { OpenRouterLoginModal } from './components/OpenRouterLoginModal';
import { McpHubModal, McpServer } from './components/McpHubModal';
import { PublicShareView } from './components/PublicShareView';
import { Note, SearchFilters, NoteBacklinksResponse, GraphData, StreakInfo } from './types';

const INITIAL_MCP_SERVERS: McpServer[] = [
  {
    id: 'github-mcp',
    name: 'GitHub MCP Server',
    category: 'Source Code & Repos',
    description: 'Direct repository cloning, file trees, commit history, issue tracking, and PR analysis.',
    endpoint: 'https://mcp.github.com/v1',
    isEnabled: true,
    iconName: 'github',
  },
  {
    id: 'arxiv-mcp',
    name: 'ArXiv Research MCP',
    category: 'Academic & Science',
    description: 'Fetch peer-reviewed research papers, LaTeX formulas, citations, and author graphs.',
    endpoint: 'https://mcp.arxiv.org/sse',
    isEnabled: true,
    iconName: 'book',
  },
  {
    id: 'wikipedia-mcp',
    name: 'Wikipedia Entity MCP',
    category: 'Knowledge Base',
    description: 'Deep encyclopedic entity disambiguation, Wikidata items, and historical cross-links.',
    endpoint: 'https://mcp.wikimedia.org/api',
    isEnabled: true,
    iconName: 'globe',
  },
  {
    id: 'youtube-mcp',
    name: 'YouTube Transcripts MCP',
    category: 'Video & Media',
    description: 'Extract auto-captions, timestamps, chapter breakdowns, and speaker summaries.',
    endpoint: 'https://mcp.youtube-analyzer.io',
    isEnabled: true,
    iconName: 'video',
  },
  {
    id: 'gdrive-mcp',
    name: 'Google Drive & Docs MCP',
    category: 'Cloud Storage',
    description: 'Parse Google Docs, Sheets, Slides, PDF attachments, and shared workspace folders.',
    endpoint: 'https://mcp.workspace.google.com',
    isEnabled: true,
    iconName: 'file',
  },
  {
    id: 'brave-search-mcp',
    name: 'Brave Search MCP',
    category: 'Web Scraping & Index',
    description: 'Real-time live web indexing, news feeds, article extraction, and site crawling.',
    endpoint: 'https://api.search.brave.com/mcp',
    isEnabled: true,
    iconName: 'search',
  },
  {
    id: 'sql-schema-mcp',
    name: 'SQL Database Schema MCP',
    category: 'Databases & Relational',
    description: 'Analyze PostgreSQL/SQLite schema DDL, ERD entity relationships, and table foreign keys.',
    endpoint: 'https://mcp.sql-inspector.internal',
    isEnabled: true,
    iconName: 'database',
  },
  {
    id: 'figma-mcp',
    name: 'Figma & Design Tokens MCP',
    category: 'Design Systems',
    description: 'Extract component hierarchies, design tokens, color variables, and frame specs.',
    endpoint: 'https://mcp.figma.com/v1',
    isEnabled: true,
    iconName: 'layers',
  },
  {
    id: 'slack-discord-mcp',
    name: 'Slack & Discord Thread MCP',
    category: 'Communications',
    description: 'Summarize chat threads, action items, team decisions, and developer notes.',
    endpoint: 'https://mcp.chat-bridge.org',
    isEnabled: true,
    iconName: 'message',
  },
  {
    id: 'obsidian-vault-mcp',
    name: 'Notion & Obsidian Vault MCP',
    category: 'Zettelkasten Vault',
    description: 'Import Obsidian markdown frontmatter, tags, [[wikilinks]], and graph properties.',
    endpoint: 'https://mcp.obsidian-bridge.io',
    isEnabled: true,
    iconName: 'file-code',
  },
];

export default function App() {
  // Check if viewing a public share link
  const path = window.location.pathname;
  if (path.startsWith('/share/')) {
    const shareToken = path.split('/share/')[1];
    return <PublicShareView shareToken={shareToken} />;
  }

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [backlinks, setBacklinks] = useState<NoteBacklinksResponse | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number }[]>([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);

  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [isLoadingBacklinks, setIsLoadingBacklinks] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Modals
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isOpenRouterModalOpen, setIsOpenRouterModalOpen] = useState(false);
  const [isMcpHubModalOpen, setIsMcpHubModalOpen] = useState(false);

  // OpenRouter & AI State
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>(
    () => localStorage.getItem('pensieve_openrouter_key') || ''
  );
  const [modelName, setModelName] = useState<string>(
    () => localStorage.getItem('pensieve_model_name') || 'nvidia/llama-3.1-nemotron-70b-instruct'
  );

  // MCP Servers State
  const [mcpServers, setMcpServers] = useState<McpServer[]>(INITIAL_MCP_SERVERS);

  // Search and Filter State
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tag: '',
    type: 'all',
    dateRange: 'all',
  });

  // Delete Warning Modal State
  const [deleteWarning, setDeleteWarning] = useState<{
    isOpen: boolean;
    noteId: string | null;
    noteTitle: string;
    referencingNotes: { id: string; title: string }[];
  }>({
    isOpen: false,
    noteId: null,
    noteTitle: '',
    referencingNotes: [],
  });

  // Save OpenRouter API Key
  const handleSaveOpenRouterKey = (key: string, model: string) => {
    setOpenRouterApiKey(key);
    setModelName(model);
    localStorage.setItem('pensieve_openrouter_key', key);
    localStorage.setItem('pensieve_model_name', model);
  };

  // Toggle MCP Server
  const handleToggleMcpServer = (id: string) => {
    setMcpServers(prev =>
      prev.map(s => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  // Add Custom MCP Server
  const handleAddCustomMcpServer = (server: McpServer) => {
    setMcpServers(prev => [server, ...prev]);
  };

  // Build active MCP context string for prompt
  const mcpContextString = mcpServers
    .filter(s => s.isEnabled)
    .map(s => `- ${s.name} (${s.category}): ${s.endpoint}`)
    .join('\n');

  // Load Graph Data
  const fetchGraphData = useCallback(async () => {
    try {
      setIsLoadingGraph(true);
      const res = await fetch('/api/graph');
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error('Failed to fetch graph data', err);
    } finally {
      setIsLoadingGraph(false);
    }
  }, []);

  // Load Tags
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  }, []);

  // Load Streak Info
  const fetchStreak = useCallback(async () => {
    try {
      const res = await fetch('/api/journal/streak');
      if (res.ok) {
        const data = await res.json();
        setStreakInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch streak', err);
    }
  }, []);

  // Fetch Notes with current filters
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoadingNotes(true);
      const params = new URLSearchParams();
      if (filters.query) params.append('q', filters.query);
      if (filters.tag) params.append('tag', filters.tag);
      if (filters.isGhostOnly) params.append('ghostOnly', 'true');

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);

        // Select first note if none is selected
        if (data.length > 0) {
          setSelectedNoteId(prev => (prev && data.some((n: Note) => n.id === prev) ? prev : data[0].id));
        } else {
          setSelectedNoteId(null);
          setSelectedNote(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notes', err);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [filters]);

  // Load note details & backlinks when selected note changes
  useEffect(() => {
    if (!selectedNoteId) {
      setSelectedNote(null);
      setBacklinks(null);
      return;
    }

    const fetchNoteDetail = async () => {
      try {
        const res = await fetch(`/api/notes/${selectedNoteId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedNote(data);
        }
      } catch (err) {
        console.error('Failed to fetch note detail', err);
      }
    };

    const fetchBacklinks = async () => {
      try {
        setIsLoadingBacklinks(true);
        const res = await fetch(`/api/notes/${selectedNoteId}/backlinks`);
        if (res.ok) {
          const data = await res.json();
          setBacklinks(data);
        }
      } catch (err) {
        console.error('Failed to fetch backlinks', err);
      } finally {
        setIsLoadingBacklinks(false);
      }
    };

    fetchNoteDetail();
    fetchBacklinks();
  }, [selectedNoteId]);

  // Initial Load
  useEffect(() => {
    fetchNotes();
    fetchGraphData();
    fetchTags();
    fetchStreak();
  }, [fetchNotes, fetchGraphData, fetchTags, fetchStreak]);

  // Handlers
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
  };

  const handleSelectNoteByTitle = async (title: string) => {
    try {
      const match = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
      if (match) {
        setSelectedNoteId(match.id);
      } else {
        const res = await fetch(`/api/notes/by-title/${encodeURIComponent(title)}`);
        if (res.ok) {
          const data = await res.json();
          await fetchNotes();
          setSelectedNoteId(data.id);
        }
      }
    } catch (err) {
      console.error('Failed to resolve wikilink title', err);
    }
  };

  const handleCreateNote = async () => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Untitled Note ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          content: '# New Knowledge Note\n\nType your content here or connect ideas using [[Wikilinks]].',
          type: 'note',
          tags: ['uncategorized'],
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        await fetchNotes();
        await fetchGraphData();
        await fetchTags();
        setSelectedNoteId(newNote.id);
      }
    } catch (err) {
      console.error('Failed to create note', err);
    }
  };

  const handleOpenTodayJournal = async () => {
    try {
      const res = await fetch('/api/journal/today', { method: 'POST' });
      if (res.ok) {
        const journalNote = await res.json();
        await fetchNotes();
        await fetchGraphData();
        await fetchTags();
        await fetchStreak();
        setSelectedNoteId(journalNote.id);
      }
    } catch (err) {
      console.error('Failed to open today journal', err);
    }
  };

  const handleUpdateNote = async (updated: Partial<Note>) => {
    if (!selectedNoteId) return;

    try {
      const res = await fetch(`/api/notes/${selectedNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        const savedNote = await res.json();
        setSelectedNote(savedNote);

        setNotes(prev =>
          prev.map(n => (n.id === savedNote.id ? { ...n, ...savedNote } : n))
        );

        await fetchGraphData();
        await fetchTags();
      }
    } catch (err) {
      console.error('Failed to update note', err);
    }
  };

  const handleDeleteNote = async (id: string, force = false) => {
    try {
      const res = await fetch(`/api/notes/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      });

      if (res.status === 409) {
        const data = await res.json();
        setDeleteWarning({
          isOpen: true,
          noteId: id,
          noteTitle: data.noteTitle,
          referencingNotes: data.referencingNotes || [],
        });
        return;
      }

      if (res.ok) {
        setDeleteWarning({ isOpen: false, noteId: null, noteTitle: '', referencingNotes: [] });
        await fetchNotes();
        await fetchGraphData();
        await fetchTags();
      }
    } catch (err) {
      console.error('Failed to delete note', err);
    }
  };

  const handleClearAllNotes = async () => {
    if (!window.confirm('Are you sure you want to clear all notes and wipe the canvas?')) {
      return;
    }
    try {
      await fetch('/api/notes/clear-all', { method: 'POST' });
      setSelectedNoteId(null);
      setSelectedNote(null);
      await fetchNotes();
      await fetchGraphData();
      await fetchTags();
    } catch (err) {
      console.error('Failed to clear notes', err);
    }
  };

  const handleIngestSuccess = async (mainNoteId: string) => {
    await fetchNotes();
    await fetchGraphData();
    await fetchTags();
    if (mainNoteId) {
      setSelectedNoteId(mainNoteId);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FFFFFF] text-[#242424] flex flex-row font-sans">
      {/* Pane 1: Left Navigation & Search */}
      <LeftPane
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onOpenTodayJournal={handleOpenTodayJournal}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        onOpenOpenRouterModal={() => setIsOpenRouterModalOpen(true)}
        onOpenMcpHubModal={() => setIsMcpHubModalOpen(true)}
        onClearAllNotes={handleClearAllNotes}
        openRouterApiKey={openRouterApiKey}
        filters={filters}
        onFilterChange={handleFilterChange}
        availableTags={availableTags}
        streakInfo={streakInfo}
        isLoading={isLoadingNotes}
      />

      {/* Pane 2: Center Editor & Preview */}
      <CenterEditor
        note={selectedNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={id => handleDeleteNote(id, false)}
        onSelectNoteByTitle={handleSelectNoteByTitle}
      />

      {/* Pane 3: Right Knowledge Graph & Backlinks */}
      <RightPane
        backlinks={backlinks}
        graphData={graphData}
        selectedNoteId={selectedNoteId}
        currentNoteTitle={selectedNote?.title || ''}
        onSelectNote={handleSelectNote}
        isLoadingBacklinks={isLoadingBacklinks}
        isLoadingGraph={isLoadingGraph}
      />

      {/* Ingestion & Link Decoder Modal */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestSuccess={handleIngestSuccess}
        openRouterApiKey={openRouterApiKey}
        modelName={modelName}
        mcpContext={mcpContextString}
        onOpenOpenRouterModal={() => {
          setIsIngestModalOpen(false);
          setIsOpenRouterModalOpen(true);
        }}
        onOpenMcpHubModal={() => {
          setIsIngestModalOpen(false);
          setIsMcpHubModalOpen(true);
        }}
      />

      {/* OpenRouter Key Login Modal */}
      <OpenRouterLoginModal
        isOpen={isOpenRouterModalOpen}
        onClose={() => setIsOpenRouterModalOpen(false)}
        apiKey={openRouterApiKey}
        currentModel={modelName}
        onSaveKey={handleSaveOpenRouterKey}
      />

      {/* MCP Tool Servers Hub Modal */}
      <McpHubModal
        isOpen={isMcpHubModalOpen}
        onClose={() => setIsMcpHubModalOpen(false)}
        mcpServers={mcpServers}
        onToggleServer={handleToggleMcpServer}
        onAddCustomServer={handleAddCustomMcpServer}
      />

      {/* Linked Reference Warning Modal */}
      <DeleteWarningModal
        isOpen={deleteWarning.isOpen}
        onClose={() => setDeleteWarning({ isOpen: false, noteId: null, noteTitle: '', referencingNotes: [] })}
        onConfirmDelete={() => {
          if (deleteWarning.noteId) {
            handleDeleteNote(deleteWarning.noteId, true);
          }
        }}
        referencingNotes={deleteWarning.referencingNotes}
        noteTitle={deleteWarning.noteTitle}
      />
    </div>
  );
}
