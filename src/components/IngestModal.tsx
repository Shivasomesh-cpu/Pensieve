import React, { useState, useRef } from 'react';
import { Link, Upload, X, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, Key, Network, Terminal } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (mainNoteId: string) => void;
  openRouterApiKey: string;
  modelName: string;
  mcpContext: string;
  mcpServers: {
    name: string;
    category: string;
    endpoint: string;
    isEnabled: boolean;
  }[];
  onOpenOpenRouterModal: () => void;
  onOpenMcpHubModal: () => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess,
  openRouterApiKey,
  modelName,
  mcpContext,
  mcpServers,
  onOpenOpenRouterModal,
  onOpenMcpHubModal,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const sampleLinks = [
    { name: 'GitHub Repo (Git Clone)', url: 'https://github.com/facebook/react' },
    { name: 'YouTube Presentation', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { name: 'ArXiv / Wikipedia', url: 'https://en.wikipedia.org/wiki/Graph_database' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleIngestUrl = async (urlToSubmit?: string) => {
    const targetUrl = urlToSubmit || urlInput;
    if (!targetUrl.trim()) {
      setErrorMsg('Please paste a valid web link or GitHub repository link.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);

      const isGitRepo = targetUrl.includes('github.com') || targetUrl.endsWith('.git');
      if (isGitRepo) {
        setProgressStep('1/3 Executing terminal git clone & parsing repository structure...');
      } else {
        setProgressStep('1/3 Fetching and decoding web link content...');
      }

      const res = await fetch('/api/ingest/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-Key': openRouterApiKey,
        },
        body: JSON.stringify({
          url: targetUrl.trim(),
          openRouterApiKey,
          modelName,
          mcpContext,
          mcpServers: mcpServers.filter(server => server.isEnabled),
        }),
      });

      setProgressStep(`2/3 AI (${openRouterApiKey ? 'Nemotron' : 'Gemini'}) mapping concept clusters & Wikilinks...`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to decode link');
      }

      setProgressStep('3/3 Constructing Zettelkasten knowledge graph nodes...');
      setTimeout(() => {
        setIsProcessing(false);
        setUrlInput('');
        onIngestSuccess(data.mainNoteId);
        onClose();
      }, 400);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err.message || 'An error occurred while decoding link.');
    }
  };

  const handleIngestFile = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a file to decode.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setProgressStep(`1/3 Reading ${selectedFile.name}...`);

      const reader = new FileReader();

      if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
        reader.readAsDataURL(selectedFile);
      } else {
        reader.readAsText(selectedFile);
      }

      reader.onload = async () => {
        const fileData = reader.result as string;

        setProgressStep(`2/3 AI (${openRouterApiKey ? 'Nemotron' : 'Gemini'}) mapping document topics & connections...`);

        const res = await fetch('/api/ingest/file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-OpenRouter-Key': openRouterApiKey,
          },
          body: JSON.stringify({
            filename: selectedFile.name,
            fileData,
            mimeType: selectedFile.type || 'text/plain',
            openRouterApiKey,
            modelName,
            mcpContext,
            mcpServers: mcpServers.filter(server => server.isEnabled),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to decode file');
        }

        setProgressStep('3/3 Generating connected graph nodes...');
        setTimeout(() => {
          setIsProcessing(false);
          setSelectedFile(null);
          onIngestSuccess(data.mainNoteId);
          onClose();
        }, 400);
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setErrorMsg('Failed to read selected file.');
      };
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMsg(err.message || 'An error occurred while decoding file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#011425]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#1f4959] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#011425] text-[#FFFFFF] flex items-center justify-between border-b border-[#1f4959]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1f4959] rounded text-[#FFFFFF]">
              <Sparkles className="w-4 h-4 text-[#5c7c89]" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-sm text-[#FFFFFF]">
                Knowledge Ingestion & Link Decoder
              </h2>
              <p className="text-[11px] text-[#5c7c89]">
                Decode links, GitHub repos & files into interconnected knowledge nodes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 text-[#5c7c89] hover:text-[#FFFFFF] transition-colors rounded cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI & MCP Engine Toolbar Bar */}
        <div className="px-4 py-2 bg-[#f0f4f6] border-b border-[#5c7c89]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenOpenRouterModal}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded hover:border-[#1f4959] transition-colors cursor-pointer text-[11px] text-[#011425] font-semibold"
            >
              <Key className="w-3 h-3 text-[#1f4959]" />
              <span>{openRouterApiKey ? 'OpenRouter: Connected' : 'Connect OpenRouter Key'}</span>
            </button>

            <button
              onClick={onOpenMcpHubModal}
              className="flex items-center gap-1.5 px-2 py-1 bg-[#FFFFFF] border border-[#5c7c89]/40 rounded hover:border-[#1f4959] transition-colors cursor-pointer text-[11px] text-[#011425] font-semibold"
            >
              <Network className="w-3 h-3 text-[#1f4959]" />
              <span>MCP Server Hub</span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-[#5c7c89] truncate max-w-[130px]">
            {openRouterApiKey ? modelName.split('/')[1] || modelName : 'Gemini Fallback'}
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#5c7c89]/30 bg-[#FFFFFF] text-xs">
          <button
            onClick={() => setActiveTab('url')}
            disabled={isProcessing}
            className={`flex-1 py-2.5 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-[#FFFFFF] text-[#1f4959] border-b-2 border-[#1f4959]'
                : 'text-[#5c7c89] hover:text-[#242424]'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Paste Link / Git Repo</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            disabled={isProcessing}
            className={`flex-1 py-2.5 font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'file'
                ? 'bg-[#FFFFFF] text-[#1f4959] border-b-2 border-[#1f4959]'
                : 'text-[#5c7c89] hover:text-[#242424]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File / Document</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#1f4959] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-[#011425]">{progressStep}</p>
              <div className="p-2.5 bg-[#011425] text-emerald-400 font-mono text-[10px] rounded text-left flex items-center gap-2 max-w-sm mx-auto">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">terminal@cloud ~ % decoding & spawning graph nodes...</span>
              </div>
            </div>
          ) : activeTab === 'url' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#011425] mb-1.5">
                  Paste Web, GitHub Repo (Git Clone), YouTube, or Drive Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => {
                      setUrlInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="https://github.com/user/repo, YouTube URL, or article..."
                    className="flex-1 px-3 py-2 bg-[#f0f4f6] border border-[#5c7c89]/40 rounded text-xs text-[#242424] placeholder-[#5c7c89] focus:outline-none focus:border-[#1f4959] focus:ring-1 focus:ring-[#1f4959]"
                    onKeyDown={e => e.key === 'Enter' && handleIngestUrl()}
                  />
                  <button
                    onClick={() => handleIngestUrl()}
                    className="px-4 py-2 bg-[#1f4959] text-[#FFFFFF] text-xs font-semibold rounded hover:bg-[#5c7c89] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Decode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sample Preset Chips */}
              <div>
                <span className="text-[11px] font-semibold text-[#5c7c89] block mb-1.5">
                  Try sample links:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sampleLinks.map(sample => (
                    <button
                      key={sample.name}
                      onClick={() => {
                        setUrlInput(sample.url);
                        handleIngestUrl(sample.url);
                      }}
                      className="px-2.5 py-1 bg-[#f0f4f6] hover:bg-[#1f4959] hover:text-[#FFFFFF] border border-[#5c7c89]/30 rounded text-[11px] text-[#1f4959] font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{sample.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".txt,.md,.pdf,.json,.csv,.js,.ts,.py,.png,.jpg,.jpeg"
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#5c7c89]/40 hover:border-[#1f4959] bg-[#f0f4f6] p-6 rounded-lg text-center cursor-pointer transition-colors group"
              >
                <FileText className="w-8 h-8 text-[#5c7c89] group-hover:text-[#1f4959] mx-auto mb-2 transition-colors" />
                <p className="text-xs font-semibold text-[#011425] mb-0.5">
                  {selectedFile ? selectedFile.name : 'Click to select or drop document'}
                </p>
                <p className="text-[11px] text-[#5c7c89]">
                  Supports PDF, Markdown, Code, JSON, CSV, and Images
                </p>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 bg-[#f0f4f6] border border-[#5c7c89]/30 rounded text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate font-medium text-[#011425]">{selectedFile.name}</span>
                  </div>
                  <button
                    onClick={handleIngestFile}
                    className="px-3 py-1.5 bg-[#1f4959] text-[#FFFFFF] text-xs font-semibold rounded hover:bg-[#5c7c89] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>Decode File</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f0f4f6] border-t border-[#5c7c89]/20 text-[11px] text-[#5c7c89] flex items-center justify-between">
          <span>Terminal CLI Git Clone Enabled</span>
          <span>Nemotron Knowledge Graph Decoder</span>
        </div>
      </div>
    </div>
  );
};
