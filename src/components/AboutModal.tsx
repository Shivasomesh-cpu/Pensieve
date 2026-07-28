import React from 'react';
import { Info, ExternalLink, ShieldCheck, Cpu, X, Sparkles, Server, Github, Zap } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#011425]/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#FFFFFF] border border-[#1f4959] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-[#011425] text-[#FFFFFF] flex items-center justify-between border-b border-[#1f4959]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#1f4959] text-[#FFFFFF] rounded">
              <Info className="w-4 h-4 text-[#5c7c89]" />
            </div>
            <div>
              <h2 className="font-serif-title font-bold text-sm text-[#FFFFFF]">
                About Pensieve & Vercel Hosting
              </h2>
              <p className="text-[11px] text-[#5c7c89]">
                AI-Powered Zettelkasten Knowledge Base
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

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-[#242424]">
          {/* Summary */}
          <div className="bg-[#f0f4f6] p-3 rounded-md border border-[#5c7c89]/20">
            <p className="leading-relaxed text-[#011425]">
              <strong>Pensieve</strong> is a bi-directional personal knowledge management system featuring live OpenRouter AI key login, NVIDIA Nemotron decoding, terminal Git repo extraction, and a 2D physics knowledge graph.
            </p>
          </div>

          {/* Vercel Details */}
          <div className="space-y-2">
            <h3 className="font-bold text-[#011425] flex items-center gap-1.5 text-xs">
              <Server className="w-3.5 h-3.5 text-[#1f4959]" />
              <span>Vercel Serverless Architecture</span>
            </h3>
            <ul className="space-y-1.5 text-[11px] text-[#5c7c89] pl-1">
              <li className="flex items-start gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span><strong>API Functions:</strong> Express REST endpoints compiled for Vercel Node runtime (<code className="bg-[#f0f4f6] px-1 rounded text-[#1f4959]">/api/*</code>).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Serverless Database:</strong> SQLite memory engine (<code className="bg-[#f0f4f6] px-1 rounded text-[#1f4959]">sql.js</code>) configured with <code className="bg-[#f0f4f6] px-1 rounded text-[#1f4959]">/tmp</code> persistence.</span>
              </li>
            </ul>
          </div>

          {/* OpenRouter Token Login */}
          <div className="space-y-2">
            <h3 className="font-bold text-[#011425] flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#1f4959]" />
              <span>OpenRouter API Key Login Authentication</span>
            </h3>
            <p className="text-[11px] text-[#5c7c89] leading-relaxed">
              Your OpenRouter API Key (<code className="bg-[#f0f4f6] px-1 rounded text-[#1f4959]">sk-or-v1-...</code>) serves as your direct login token. It is stored securely in client browser storage and passed via request headers (<code className="bg-[#f0f4f6] px-1 rounded text-[#1f4959]">x-openrouter-key</code>) to authenticate AI operations.
            </p>
          </div>

          {/* Repository & External Links */}
          <div className="pt-2 border-t border-[#5c7c89]/20 flex flex-col gap-2">
            <a
              href="https://github.com/Shivasomesh-cpu/Pensieve"
              target="_blank"
              rel="noreferrer"
              className="p-2 bg-[#011425] hover:bg-[#1f4959] text-[#FFFFFF] rounded flex items-center justify-between transition-colors font-medium text-xs"
            >
              <span className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub Repository: Shivasomesh-cpu/Pensieve
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-[#5c7c89]" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#f0f4f6] border-t border-[#5c7c89]/20 flex items-center justify-between">
          <span className="text-[11px] text-[#5c7c89]">Pensieve v1.0.0 — Vercel Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#1f4959] hover:bg-[#5c7c89] text-[#FFFFFF] text-xs font-semibold rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
