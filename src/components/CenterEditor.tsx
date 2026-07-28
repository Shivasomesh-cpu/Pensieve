import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { 
  Eye, Edit2, Columns, Save, Download, Share2, Trash2, 
  Tag, Link2, Image as ImageIcon, Ghost, Check, Copy, ExternalLink, FileText, Printer,
  Sparkles, Zap, MessageSquare, Loader2, Bot, HelpCircle, ArrowRight, Clock
} from 'lucide-react';
import { Note } from '../types';

interface CenterEditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  onDeleteNote: (id: string) => void;
  onSelectNoteByTitle: (title: string) => void;
  openRouterApiKey?: string;
  modelName?: string;
}

export const CenterEditor: React.FC<CenterEditorProps> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onSelectNoteByTitle,
  openRouterApiKey,
  modelName,
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

  // AI Copilot State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [showAskModal, setShowAskModal] = useState(false);
  const [askQuery, setAskQuery] = useState('');
  const [askResult, setAskResult] = useState<string | null>(null);
  
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags ? note.tags.join(', ') : '');
      setSaveStatus('saved');
      setShareUrl(note.is_public && note.share_token ? `${window.location.origin}/share/${note.share_token}` : null);
      setAskResult(null);
      setAiErrorMessage(null);
    }
  }, [note?.id]);

  // Handle AI Copilot Enhancement
  const handleAiEnhance = async (action: 'wikilink' | 'expand' | 'summarize' | 'ask', customQuery?: string) => {
    if (!note) return;

    try {
      setIsAiProcessing(true);
      setAiErrorMessage(null);
      
      const activeModelLabel = openRouterApiKey ? 'Nemotron 70B' : 'Gemini AI';

      if (action === 'wikilink') {
        setAiStatusMessage(`✨ ${activeModelLabel} scanning content & inserting [[Wikilinks]]...`);
      } else if (action === 'expand') {
        setAiStatusMessage(`⚡ ${activeModelLabel} generating deep research subsections & wikilinks...`);
      } else if (action === 'summarize') {
        setAiStatusMessage(`📌 ${activeModelLabel} compiling executive summary & tags...`);
      } else if (action === 'ask') {
        setAiStatusMessage(`💬 ${activeModelLabel} analyzing note & answering prompt...`);
      }

      const res = await fetch('/api/ai/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-Key': openRouterApiKey || '',
        },
        body: JSON.stringify({
          action,
          title,
          content,
          userQuery: customQuery,
          openRouterApiKey,
          modelName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI processing failed.');
      }

      const resultText = data.result || '';

      if (action === 'wikilink') {
        handleChange(title, resultText, tagsInput);
        setAiStatusMessage(`Successfully inserted [[Wikilinks]] using ${activeModelLabel}!`);
      } else if (action === 'expand') {
        const newContent = `${content}\n\n${resultText}`;
        handleChange(title, newContent, tagsInput);
        setAiStatusMessage(`Expanded note with ${activeModelLabel} research!`);
      } else if (action === 'summarize') {
        // Extract tags if present
        let newTags = tagsInput;
        const tagMatch = resultText.match(/Tags:\s*(.*)/i);
        if (tagMatch) {
          const extracted = tagMatch[1].replace(/#/g, '');
          newTags = tagsInput ? `${tagsInput}, ${extracted}` : extracted;
        }
        const cleanSummary = resultText.replace(/Tags:\s*.*/i, '').trim();
        const newContent = `${cleanSummary}\n\n---\n\n${content}`;
        handleChange(title, newContent, newTags);
        setAiStatusMessage(`Prepended executive summary using ${activeModelLabel}!`);
      } else if (action === 'ask') {
        setAskResult(resultText);
        setAiStatusMessage(null);
      }

      setTimeout(() => {
        setIsAiProcessing(false);
        if (action !== 'ask') {
          setTimeout(() => setAiStatusMessage(null), 3500);
        }
      }, 500);
    } catch (err: any) {
      setIsAiProcessing(false);
      setAiErrorMessage(err.message || 'AI request failed.');
    }
  };

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

      {/* Note Metadata Header (Title, Category, Word Counts, Tags) */}
      <div className="p-6 pb-3 border-b border-[#5c7c89]/20 space-y-3 bg-[#FFFFFF]">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={e => handleChange(e.target.value, content, tagsInput)}
          placeholder="Note Title..."
          className="w-full bg-transparent font-serif-title font-bold text-2xl text-[#011425] placeholder-[#5c7c89]/50 focus:outline-none border-none p-0 tracking-tight"
        />

        {/* Note Statistics & Info Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5c7c89]">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category / Type Badge */}
            <span className="px-2 py-0.5 rounded-full bg-[#1f4959]/10 text-[#1f4959] font-medium border border-[#1f4959]/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1f4959]" />
              {note.type === 'journal' ? 'Daily Journal' : note.is_ghost ? 'Ghost Reference' : 'Zettelkasten Note'}
            </span>

            <span className="flex items-center gap-1 font-medium text-[#5c7c89]">
              <Clock className="w-3 h-3 text-[#5c7c89]" />
              {Math.max(1, Math.ceil(wordCount / 200))} min read ({wordCount} words / {charCount} chars)
            </span>

            <span className="text-[#5c7c89]/60">•</span>

            <span className="font-medium text-[#5c7c89]">
              Updated {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Quick Copy Content */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(content);
              setCopiedShare(true);
              setTimeout(() => setCopiedShare(false), 2000);
            }}
            className="text-[10px] text-[#1f4959] hover:text-[#011425] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Copy Note Markdown to Clipboard"
          >
            {copiedShare ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedShare ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>

        {/* Tags Editor */}
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-[#5c7c89]/10">
          <Tag className="w-3.5 h-3.5 text-[#5c7c89]" />
          <input
            type="text"
            value={tagsInput}
            onChange={e => handleChange(title, content, e.target.value)}
            placeholder="Tags separated by comma (e.g. architecture, system, draft)"
            className="flex-1 bg-transparent border-none text-[#5c7c89] placeholder-[#5c7c89]/40 focus:outline-none text-xs p-0 font-medium"
          />
        </div>
      </div>

      {/* Nemotron AI Copilot Action Bar */}
      <div className="px-6 py-2 bg-[#f8fafb] border-b border-[#5c7c89]/20 flex flex-wrap items-center justify-between gap-2 text-xs no-print">
        <div className="flex items-center gap-1.5 text-[#011425] font-semibold">
          <Bot className="w-4 h-4 text-[#1f4959]" />
          <span>Nemotron AI Copilot</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            disabled={isAiProcessing}
            onClick={() => handleAiEnhance('wikilink')}
            className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#1f4959] hover:text-[#FFFFFF] text-[#011425] border border-[#5c7c89]/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Auto-insert [[Wikilinks]] into key terms"
          >
            <Sparkles className="w-3 h-3 text-[#1f4959]" />
            <span>Auto-Wikilink</span>
          </button>

          <button
            disabled={isAiProcessing}
            onClick={() => handleAiEnhance('expand')}
            className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#1f4959] hover:text-[#FFFFFF] text-[#011425] border border-[#5c7c89]/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Expand note with research & subsections"
          >
            <Zap className="w-3 h-3 text-[#1f4959]" />
            <span>AI Expand</span>
          </button>

          <button
            disabled={isAiProcessing}
            onClick={() => handleAiEnhance('summarize')}
            className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#1f4959] hover:text-[#FFFFFF] text-[#011425] border border-[#5c7c89]/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Generate executive summary & tags"
          >
            <FileText className="w-3 h-3 text-[#1f4959]" />
            <span>Summarize</span>
          </button>

          <button
            disabled={isAiProcessing}
            onClick={() => setShowAskModal(true)}
            className="px-2.5 py-1 bg-[#1f4959] text-[#FFFFFF] hover:bg-[#011425] rounded font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Ask Nemotron a custom question about this note"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Ask Nemotron</span>
          </button>
        </div>
      </div>

      {/* AI Processing Status Indicator Banner */}
      {(isAiProcessing || aiStatusMessage || aiErrorMessage) && (
        <div className={`px-6 py-2 border-b text-xs flex items-center justify-between no-print ${
          aiErrorMessage 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : 'bg-[#eef5f8] border-[#1f4959]/20 text-[#011425]'
        }`}>
          <div className="flex items-center gap-2">
            {isAiProcessing && <Loader2 className="w-4 h-4 animate-spin text-[#1f4959]" />}
            {!isAiProcessing && !aiErrorMessage && <Check className="w-4 h-4 text-emerald-600" />}
            <span className="font-medium">{aiErrorMessage || aiStatusMessage}</span>
          </div>
          {aiErrorMessage && (
            <button onClick={() => setAiErrorMessage(null)} className="text-xs text-rose-600 underline cursor-pointer">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Ask Nemotron Prompt Dialog */}
      {showAskModal && (
        <div className="fixed inset-0 bg-[#011425]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#FFFFFF] border border-[#5c7c89]/30 rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#5c7c89]/20 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#1f4959]" />
                <h3 className="font-serif-title font-bold text-base text-[#011425]">
                  Ask Nemotron 70B AI
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAskModal(false);
                  setAskResult(null);
                }}
                className="text-[#5c7c89] hover:text-[#011425] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5c7c89]">
              Ask Nemotron AI to analyze <strong>"{title}"</strong>, generate code examples, formulate research hypotheses, or explain concepts.
            </p>

            <div className="space-y-2">
              <textarea
                value={askQuery}
                onChange={e => setAskQuery(e.target.value)}
                placeholder="e.g. 'Extract all key formulas into LaTeX format' or 'Write a TypeScript code example for this data structure'"
                className="w-full p-3 border border-[#5c7c89]/30 rounded text-xs text-[#242424] focus:outline-none focus:border-[#1f4959] h-24 resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  disabled={isAiProcessing || !askQuery.trim()}
                  onClick={() => handleAiEnhance('ask', askQuery)}
                  className="px-4 py-2 bg-[#1f4959] text-[#FFFFFF] rounded text-xs font-semibold hover:bg-[#011425] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAiProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Answer</span>
                </button>
              </div>
            </div>

            {askResult && (
              <div className="mt-4 p-4 bg-[#f8fafb] border border-[#5c7c89]/20 rounded space-y-3 max-h-60 overflow-y-auto">
                <div className="text-xs font-bold text-[#011425] flex items-center justify-between">
                  <span>Nemotron AI Output:</span>
                  <button
                    onClick={() => {
                      const newContent = `${content}\n\n### Nemotron AI Research Response\n${askResult}`;
                      handleChange(title, newContent, tagsInput);
                      setShowAskModal(false);
                      setAskResult(null);
                    }}
                    className="px-2.5 py-1 bg-[#1f4959] text-[#FFFFFF] rounded text-[11px] font-semibold hover:bg-[#011425] flex items-center gap-1 cursor-pointer"
                  >
                    <span>Insert into Note</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-xs text-[#242424] whitespace-pre-wrap font-mono leading-relaxed">
                  {askResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Dedicated Printable View for PDF Export */}
      <div className="hidden print:block p-8 bg-[#FFFFFF] text-[#242424] print-only">
        <h1 className="font-serif-title font-bold text-3xl text-[#011425] mb-2">{title}</h1>
        <div className="text-xs text-[#5c7c89] mb-6 pb-2 border-b border-[#5c7c89]/30 flex justify-between items-center">
          <span>Tags: {tagsInput ? tagsInput : 'None'}</span>
          <span>Last Updated: {new Date(note.updated_at).toLocaleDateString()}</span>
        </div>
        <div
          className="pensieve-prose text-xs leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdownWithWikilinks(content) }}
        />
      </div>
    </div>
  );
};
