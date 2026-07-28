import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { 
  Eye, Edit2, Columns, Save, Download, Share2, Trash2, 
  Tag, Link2, Image as ImageIcon, Ghost, Check, Copy, ExternalLink, FileText, Printer
} from 'lucide-react';
import { Note } from '../types';

interface CenterEditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => void;
  onSelectNoteByTitle: (title: string) => void;
}

export const CenterEditor: React.FC<CenterEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onSelectNoteByTitle,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags ? note.tags.join(', ') : '');
      setSaveStatus('saved');
      setShareUrl(note.is_public && note.share_token ? `${window.location.origin}/share/${note.share_token}` : null);
    }
  }, [note?.id]);

  // Handle content / title / tags change
  const handleChange = (newTitle: string, newContent: string, newTags: string) => {
    setTitle(newTitle);
    setContent(newContent);
    setTagsInput(newTags);
    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (note) {
        setSaveStatus('saving');
        const parsedTags = newTags
          .split(',')
          .map(t => t.trim().toLowerCase().replace(/^#/, ''))
          .filter(Boolean);

        await onUpdateNote(note.id, {
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          tags: parsedTags,
        });
        setSaveStatus('saved');
      }
    }, 800);
  };

  if (!note) {
    return (
      <div className="flex-1 h-full bg-[#FFFFFF] flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-12 h-12 rounded bg-[#f0f4f6] border border-[#5c7c89]/30 flex items-center justify-center text-[#1f4959] mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="font-serif-title font-bold text-lg text-[#011425] mb-1">
          No Note Selected
        </h2>
        <p className="text-xs text-[#5c7c89] max-w-sm">
          Select a note from the left sidebar or create a new note to start building your knowledge base.
        </p>
      </div>
    );
  }

  // Insert helper text into editor
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = document.getElementById('note-editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + textToInsert + content.substring(end);
    
    handleChange(title, newContent, tagsInput);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // Convert markdown wikilinks [[Title]] for HTML preview
  const renderMarkdownWithWikilinks = (rawMarkdown: string) => {
    if (!rawMarkdown) return '';
    
    // Replace [[Title]] with clickable span or link
    const withWikilinks = rawMarkdown.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      return `<a href="#" data-wikilink="${p1.trim()}" class="wikilink-item text-[#1f4959] font-semibold underline decoration-[#1f4959]/50 hover:text-[#5c7c89] transition-colors cursor-pointer">[[${p1.trim()}]]</a>`;
    });

    try {
      return marked.parse(withWikilinks) as string;
    } catch {
      return withWikilinks;
    }
  };

  // Handle click on wikilinks in rendered preview
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const wikilink = target.getAttribute('data-wikilink');
    if (wikilink) {
      e.preventDefault();
      onSelectNoteByTitle(wikilink);
    }
  };

  // Export as Markdown File
  const exportMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportMenu(false);
  };

  // Print PDF Export
  const exportPDF = () => {
    window.print();
    setShowExportMenu(false);
  };

  // Public Share Link
  const handleToggleShare = async () => {
    try {
      if (shareUrl) {
        // Revoke
        await fetch(`/api/notes/${note.id}/share`, { method: 'DELETE' });
        setShareUrl(null);
      } else {
        // Share
        const res = await fetch(`/api/notes/${note.id}/share`, { method: 'POST' });
        const data = await res.json();
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        setShareUrl(fullUrl);
      }
    } catch (err) {
      console.error('Failed to toggle share', err);
    }
  };

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="flex-1 h-full bg-[#FFFFFF] flex flex-col min-w-0">
      {/* Editor Header Toolbar */}
      <div className="p-3 border-b border-[#1f4959] bg-[#011425] flex items-center justify-between gap-2 no-print">
        {/* Left Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#1f4959] border border-[#5c7c89]/40 rounded p-0.5 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'edit'
                  ? 'bg-[#FFFFFF] text-[#011425] font-semibold shadow-xs'
                  : 'text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
              }`}
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'split'
                  ? 'bg-[#FFFFFF] text-[#011425] font-semibold shadow-xs'
                  : 'text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>

            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-xs flex items-center gap-1 cursor-pointer transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[#FFFFFF] text-[#011425] font-semibold shadow-xs'
                  : 'text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#5c7c89]/40 mx-1" />

          {/* Editor Quick Actions */}
          <button
            onClick={() => insertTextAtCursor('[[Note Title]]')}
            className="px-2.5 py-1 bg-[#1f4959] hover:bg-[#5c7c89] border border-[#5c7c89]/40 rounded text-xs text-[#FFFFFF] flex items-center gap-1 cursor-pointer transition-colors"
            title="Insert [[Wikilink]]"
          >
            <Link2 className="w-3 h-3 text-[#FFFFFF]" />
            <span>Link</span>
          </button>

          <button
            onClick={() => insertTextAtCursor('![Media Description](https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800)')}
            className="px-2.5 py-1 bg-[#1f4959] hover:bg-[#5c7c89] border border-[#5c7c89]/40 rounded text-xs text-[#FFFFFF] flex items-center gap-1 cursor-pointer transition-colors"
            title="Insert Media Embed"
          >
            <ImageIcon className="w-3 h-3 text-[#FFFFFF]" />
            <span>Media</span>
          </button>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Status Indicator */}
          <span className="text-[11px] text-[#5c7c89] flex items-center gap-1 font-mono">
            {saveStatus === 'saving' && <span className="w-2 h-2 rounded-full bg-[#1f4959] animate-pulse" />}
            {saveStatus === 'saved' && <span className="w-2 h-2 rounded-full bg-[#5c7c89]" />}
            <span className="text-[#FFFFFF]/80">{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}</span>
          </span>

          {/* Export & Share Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1 bg-[#1f4959] hover:bg-[#5c7c89] border border-[#5c7c89]/40 rounded text-[#FFFFFF] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#FFFFFF]" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-9 w-60 bg-[#FFFFFF] border border-[#5c7c89]/30 rounded shadow-xl p-2 z-30 space-y-1 text-[#242424]">
                <button
                  onClick={exportMarkdown}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#f0f4f6] rounded text-xs text-[#242424] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#1f4959]" />
                  <span>Download Markdown (.md)</span>
                </button>

                <button
                  onClick={exportPDF}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#f0f4f6] rounded text-xs text-[#242424] font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#1f4959]" />
                  <span>Export to PDF / Print</span>
                </button>

                <div className="border-t border-[#5c7c89]/20 my-1" />

                <div className="p-2 space-y-1.5 bg-[#f0f4f6] rounded">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#011425] font-semibold">Public Web Link</span>
                    <button
                      onClick={handleToggleShare}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer font-semibold ${
                        shareUrl ? 'bg-[#1f4959] text-[#FFFFFF]' : 'bg-[#5c7c89] text-[#FFFFFF]'
                      }`}
                    >
                      {shareUrl ? 'Active' : 'Enable'}
                    </button>
                  </div>

                  {shareUrl && (
                    <div className="flex items-center gap-1 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={shareUrl}
                        className="flex-1 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded px-1.5 py-0.5 text-[10px] text-[#242424] truncate"
                      />
                      <button
                        onClick={copyShareLink}
                        className="p-1 bg-[#1f4959] text-[#FFFFFF] rounded hover:bg-[#011425] cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedShare ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delete Button */}
          <button
            onClick={() => onDeleteNote(note.id)}
            className="p-1.5 bg-[#1f4959] hover:bg-[#5c7c89] border border-[#5c7c89]/40 text-[#FFFFFF] rounded transition-colors cursor-pointer"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ghost Note Banner */}
      {note.is_ghost && (
        <div className="bg-[#f0f4f6] border-b border-[#1f4959]/30 px-4 py-2 flex items-center justify-between text-xs text-[#011425] no-print">
          <div className="flex items-center gap-2">
            <Ghost className="w-4 h-4 text-[#1f4959]" />
            <span>
              This is a lightweight <strong>ghost note</strong> created from a backlink. Type content below to make it a permanent note.
            </span>
          </div>
        </div>
      )}

      {/* Note Metadata Header (Title & Tags) */}
      <div className="p-6 pb-2 border-b border-[#5c7c89]/20 space-y-3 bg-[#FFFFFF]">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={e => handleChange(e.target.value, content, tagsInput)}
          placeholder="Note Title..."
          className="w-full bg-transparent font-serif-title font-bold text-2xl text-[#011425] placeholder-[#5c7c89]/50 focus:outline-none border-none p-0 tracking-tight"
        />

        {/* Tags Editor */}
        <div className="flex items-center gap-2 text-xs">
          <Tag className="w-3.5 h-3.5 text-[#5c7c89]" />
          <input
            type="text"
            value={tagsInput}
            onChange={e => handleChange(title, content, e.target.value)}
            placeholder="Tags separated by comma (e.g. thesis, methodology, draft)"
            className="flex-1 bg-transparent border-none text-[#5c7c89] placeholder-[#5c7c89]/40 focus:outline-none text-xs p-0 font-medium"
          />
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[#FFFFFF]">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex-1 flex flex-col border-r border-[#5c7c89]/20 bg-[#FFFFFF] no-print ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <textarea
              id="note-editor-textarea"
              value={content}
              onChange={e => handleChange(title, e.target.value, tagsInput)}
              placeholder="Write markdown content here... Use [[Note Title]] to link notes together."
              className="w-full flex-1 p-6 bg-transparent text-[#242424] placeholder-[#5c7c89]/50 focus:outline-none resize-none font-mono text-xs leading-relaxed selection:bg-[#1f4959]/20"
              spellCheck={false}
            />
          </div>
        )}

        {/* Rendered Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            onClick={handlePreviewClick}
            className={`flex-1 p-6 overflow-y-auto bg-[#FFFFFF] pensieve-prose ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdownWithWikilinks(content) }}
          />
        )}
      </div>

      {/* Editor Footer Metrics */}
      <div className="p-2.5 px-6 border-t border-[#1f4959] bg-[#011425] text-[10px] text-[#5c7c89] flex items-center justify-between no-print">
        <div className="flex items-center gap-4 font-mono">
          <span className="text-[#FFFFFF] font-medium">{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="font-mono text-[#5c7c89]">
          Updated: {new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
