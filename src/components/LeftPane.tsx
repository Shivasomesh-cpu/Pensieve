import React from 'react';
import { Search, Plus, BookOpen, Flame, Tag as TagIcon, X, Calendar, FileText, Ghost, Sparkles, Link, Key, Network, Trash2, Info } from 'lucide-react';
import { Note, SearchFilters, StreakInfo } from '../types';

interface LeftPaneProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onOpenTodayJournal: () => void;
  onOpenIngestModal: () => void;
  onOpenOpenRouterModal: () => void;
  onOpenMcpHubModal: () => void;
  onOpenAboutModal: () => void;
  onClearAllNotes: () => void;
  openRouterApiKey: string;
  filters: SearchFilters;
  onFilterChange: (filters: Partial<SearchFilters>) => void;
  availableTags: { tag: string; count: number }[];
  streakInfo: StreakInfo | null;
  isLoading: boolean;
  width?: number;
}

function getCleanExcerpt(content: string): string {
  if (!content) return 'Empty note description...';
  const clean = content
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\[\[(.*?)\]\]/g, '$1') // Strip wikilink brackets
    .replace(/\*\*(.*?)\*\*/g, '$1') // Strip bold
    .replace(/\*(.*?)\*/g, '$1') // Strip italics
    .replace(/^>\s+/gm, '') // Strip blockquotes
    .replace(/```[\s\S]*?```/g, '[Code Block]') // Strip code blocks
    .replace(/`-+/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ');
  return clean || 'Empty note description...';
}

export const LeftPane: React.FC<LeftPaneProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onOpenTodayJournal,
  onOpenIngestModal,
  onOpenOpenRouterModal,
  onOpenMcpHubModal,
  onOpenAboutModal,
  onClearAllNotes,
  openRouterApiKey,
  filters,
  onFilterChange,
  availableTags,
  streakInfo,
  isLoading,
  width = 320,
}) => {
  return (
    <div
      style={{ width: `${width}px` }}
      className="flex-shrink-0 h-full border-r border-[#5c7c89]/30 bg-[#FFFFFF] flex flex-col select-none transition-[width] duration-150 ease-out relative"
    >
      {/* Brand Header */}
      <div className="p-3 border-b border-[#1f4959] flex items-center justify-between bg-[#011425]">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenAboutModal} title="About Pensieve & Vercel Info">
          <div className="w-7 h-7 rounded bg-[#1f4959] flex items-center justify-center text-[#FFFFFF] font-bold text-sm font-serif-title shadow-sm border border-[#5c7c89]/40">
            P
          </div>
          <span className="font-serif-title text-base font-bold text-[#FFFFFF] tracking-tight">
            Pensieve
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenIngestModal}
            className="px-2.5 py-1.5 bg-[#1f4959] hover:bg-[#5c7c89] text-[#FFFFFF] font-semibold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer shadow-xs border border-[#5c7c89]/50"
            title="Ingest Link, GitHub Repo or File"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5c7c89]" />
            <span>Decode</span>
          </button>

          <button
            onClick={onCreateNote}
            className="px-2.5 py-1.5 bg-[#1f4959] text-[#FFFFFF] font-semibold text-xs rounded hover:bg-[#5c7c89] transition-colors flex items-center gap-1 cursor-pointer shadow-xs border border-[#5c7c89]/50"
            title="Create New Note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* AI Config & Integration Bar */}
      <div className="px-3 py-2 bg-[#f0f4f6] border-b border-[#5c7c89]/20 flex items-center justify-between text-xs">
        <button
          onClick={onOpenOpenRouterModal}
          className={`flex items-center gap-1.5 px-2 py-1 border rounded text-[10px] font-semibold transition-colors cursor-pointer ${
            openRouterApiKey
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-[#FFFFFF] border-[#5c7c89]/40 text-[#1f4959] hover:border-[#1f4959]'
          }`}
          title="Configure OpenRouter API Key & Nemotron Model"
        >
          <Key className="w-3 h-3 text-[#1f4959]" />
          <span>{openRouterApiKey ? 'OpenRouter Connected' : 'OpenRouter Key'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenMcpHubModal}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded hover:border-[#1f4959] text-[10px] font-semibold text-[#1f4959] transition-colors cursor-pointer"
            title="Manage MCP Tool Servers"
          >
            <Network className="w-3 h-3 text-[#1f4959]" />
            <span>MCP Hub</span>
          </button>

          <button
            onClick={onOpenAboutModal}
            className="p-1 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded hover:border-[#1f4959] text-[#1f4959] transition-colors cursor-pointer"
            title="About Pensieve & Vercel Details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Journal & Streak Action Bar */}
      <div className="p-3 border-b border-[#5c7c89]/20 bg-[#FFFFFF]">
        <button
          onClick={onOpenTodayJournal}
          className="w-full py-2 px-3 bg-[#f0f4f6] hover:bg-[#e2e8f0] border border-[#5c7c89]/30 rounded flex items-center justify-between text-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#1f4959]" />
            <span className="font-semibold text-[#011425] group-hover:text-[#1f4959] transition-colors">
              Today's Journal
            </span>
          </div>

          {streakInfo && (
            <div
              className="flex items-center gap-1 text-[11px] font-bold text-[#1f4959] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#5c7c89]/30"
              title={`${streakInfo.streakDays} Day Writing Streak`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{streakInfo.streakDays}d</span>
            </div>
          )}
        </button>
      </div>

      {/* Search Input & Ghost Filter Bar */}
      <div className="p-3 border-b border-[#5c7c89]/20 bg-[#FFFFFF] space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#5c7c89] absolute left-3 top-2.5" />
          <input
            type="text"
            value={filters.query}
            onChange={e => onFilterChange({ query: e.target.value })}
            placeholder="Search notes, wikilinks, or content..."
            className="w-full pl-8 pr-7 py-1.5 bg-[#f0f4f6] border border-[#5c7c89]/30 rounded text-xs text-[#242424] placeholder-[#5c7c89] focus:outline-none focus:border-[#1f4959] focus:ring-1 focus:ring-[#1f4959]"
          />
          {filters.query && (
            <button
              onClick={() => onFilterChange({ query: '' })}
              className="absolute right-2.5 top-2 text-[#5c7c89] hover:text-[#242424] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Toggle Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px]">
          <button
            onClick={() => onFilterChange({ isGhostOnly: !filters.isGhostOnly })}
            className={`px-2 py-1 rounded-full border transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              filters.isGhostOnly
                ? 'bg-[#1f4959] text-[#FFFFFF] border-[#1f4959]'
                : 'bg-[#f0f4f6] text-[#5c7c89] border-[#5c7c89]/30 hover:border-[#1f4959]'
            }`}
          >
            <Ghost className="w-3 h-3" />
            <span>Ghost Notes</span>
          </button>

          {filters.tag && (
            <button
              onClick={() => onFilterChange({ tag: undefined })}
              className="px-2 py-1 rounded-full bg-[#1f4959] text-[#FFFFFF] border border-[#1f4959] flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <TagIcon className="w-3 h-3" />
              <span>#{filters.tag}</span>
              <X className="w-2.5 h-2.5 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Available Tags Horizontal List */}
      {availableTags.length > 0 && !filters.tag && (
        <div className="px-3 py-2 border-b border-[#5c7c89]/15 bg-[#f0f4f6] flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="text-[#5c7c89] font-medium flex-shrink-0">Tags:</span>
          {availableTags.slice(0, 6).map(t => (
            <button
              key={t.tag}
              onClick={() => onFilterChange({ tag: t.tag })}
              className="px-2 py-0.5 bg-[#FFFFFF] border border-[#5c7c89]/30 rounded text-[#1f4959] hover:border-[#1f4959] transition-colors flex-shrink-0 cursor-pointer"
            >
              #{t.tag} <span className="text-[#5c7c89]">({t.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#5c7c89]/15">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-[#5c7c89]">
            Loading knowledge graph...
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#5c7c89] space-y-2">
            <p className="font-semibold text-[#011425]">No notes found.</p>
            <p className="text-[11px]">
              {filters.query || filters.tag || filters.isGhostOnly
                ? 'Try clearing active search filters.'
                : 'Click "Decode" to ingest a link/file or "New Note" to create one.'}
            </p>
          </div>
        ) : (
          notes.map(note => {
            const isSelected = note.id === selectedNoteId;
            const formattedDate = new Date(note.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`p-3 transition-colors cursor-pointer border-l-3 ${
                  isSelected
                    ? 'bg-[#f0f4f6] border-l-[#1f4959]'
                    : 'bg-[#FFFFFF] hover:bg-[#f8fafc] border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h3
                    className={`font-serif-title font-semibold text-xs truncate ${
                      isSelected ? 'text-[#1f4959]' : 'text-[#011425]'
                    }`}
                  >
                    {note.title || 'Untitled Note'}
                  </h3>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {note.is_ghost && (
                      <span className="px-1.5 py-0.2 bg-[#f0f4f6] border border-[#5c7c89]/50 text-[#5c7c89] text-[9px] rounded font-mono font-medium">
                        Ghost
                      </span>
                    )}
                    {note.type === 'journal' && (
                      <span className="px-1.5 py-0.2 bg-[#011425] text-[#FFFFFF] text-[9px] rounded font-mono font-medium">
                        Journal
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[#5c7c89] line-clamp-2 leading-relaxed mb-1.5 font-normal">
                  {getCleanExcerpt(note.content)}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#5c7c89]">
                  <span className="font-medium">{formattedDate}</span>
                  {note.tags && note.tags.length > 0 && (
                    <span className="truncate max-w-[120px] text-[#1f4959] font-medium">
                      #{note.tags[0]} {note.tags.length > 1 ? `+${note.tags.length - 1}` : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info & Wipe Action */}
      <div className="p-2.5 border-t border-[#1f4959] bg-[#011425] text-[10px] text-[#5c7c89] flex items-center justify-between">
        <span className="text-[#FFFFFF] font-medium">{notes.length} notes</span>
        <button
          onClick={onClearAllNotes}
          className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          title="Clear all default & fake notes to start fresh"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear Canvas</span>
        </button>
      </div>
    </div>
  );
};
