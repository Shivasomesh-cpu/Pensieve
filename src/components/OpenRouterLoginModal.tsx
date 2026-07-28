import React, { useState } from 'react';
import { Key, ShieldCheck, Cpu, X, Sparkles, Check, AlertCircle } from 'lucide-react';

interface OpenRouterLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string, model: string) => void;
  currentModel: string;
}

export const OpenRouterLoginModal: React.FC<OpenRouterLoginModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  currentModel,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(currentModel || 'nvidia/llama-3.1-nemotron-70b-instruct');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const models = [
    {
      id: 'nvidia/llama-3.1-nemotron-70b-instruct',
      name: 'NVIDIA Nemotron 70B (Default)',
      description: 'High-speed reasoning model optimized for deep knowledge graph extraction and wikilink structuring.',
      badge: 'Recommended',
    },
    {
      id: 'nvidia/nemotron-4-340b-instruct',
      name: 'NVIDIA Nemotron 4 340B',
      description: 'Ultra-scale flagship Nemotron model for complex software repository decoding.',
      badge: 'Flagship',
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'Exceptional reasoning and markdown Zettelkasten note generation.',
      badge: 'Top Tier',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Meta Llama 3.3 70B',
      description: 'Fast, open-weights model for high volume link processing.',
      badge: 'Fast',
    },
    {
      id: 'google/gemini-2.5-flash',
      name: 'Google Gemini 2.5 Flash',
      description: 'Multimodal document and image decoding.',
      badge: 'Multimodal',
    },
  ];

  const handleSave = () => {
    onSaveKey(inputKey.trim(), selectedModel);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#011425]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#FFFFFF] border border-[#1f4959] rounded-lg shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#011425] text-[#FFFFFF] flex items-center justify-between border-b border-[#1f4959]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1f4959] text-[#FFFFFF] rounded">
              <Key className="w-4 h-4 text-[#5c7c89]" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-sm text-[#FFFFFF]">
                OpenRouter Key Login & Model Config
              </h2>
              <p className="text-[11px] text-[#5c7c89]">
                Connect your OpenRouter key to power Nemotron AI decoding
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

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>OpenRouter API Key & Nemotron Model saved successfully!</span>
            </div>
          )}

          {/* Key Input */}
          <div>
            <label className="block text-xs font-semibold text-[#011425] mb-1">
              OpenRouter API Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 bg-[#f0f4f6] border border-[#5c7c89]/40 rounded text-xs text-[#242424] font-mono placeholder-[#5c7c89] focus:outline-none focus:border-[#1f4959] focus:ring-1 focus:ring-[#1f4959]"
              />
            </div>
            <p className="text-[10px] text-[#5c7c89] mt-1 flex items-center justify-between">
              <span>Your key is stored locally in your browser.</span>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[#1f4959] hover:underline font-medium"
              >
                Get Key &rarr;
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#011425] mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#1f4959]" />
              <span>Select AI Model (Nemotron Default)</span>
            </label>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {models.map(m => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 border rounded-md cursor-pointer transition-all text-xs flex items-start justify-between gap-2 ${
                    selectedModel === m.id
                      ? 'border-[#1f4959] bg-[#f0f4f6] ring-1 ring-[#1f4959]'
                      : 'border-[#5c7c89]/25 hover:border-[#1f4959]/50 bg-[#FFFFFF]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-[#011425]">{m.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#1f4959]/10 text-[#1f4959] rounded font-bold">
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5c7c89] leading-tight">{m.description}</p>
                  </div>
                  {selectedModel === m.id && <Check className="w-4 h-4 text-[#1f4959] flex-shrink-0 mt-0.5" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f0f4f6] border-t border-[#5c7c89]/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#5c7c89]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Client-Side Token</span>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-[#1f4959] hover:bg-[#5c7c89] text-[#FFFFFF] text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5c7c89]" />
            <span>Save & Connect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
