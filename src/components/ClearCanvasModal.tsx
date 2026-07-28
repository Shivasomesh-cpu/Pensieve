import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ClearCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
  isClearing?: boolean;
}

export const ClearCanvasModal: React.FC<ClearCanvasModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
  isClearing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#5c7c89]/40 rounded shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-red-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-serif-title font-bold text-base text-[#011425]">
              Wipe Canvas & Clear All Notes?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5c7c89] hover:text-[#242424] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <div className="text-xs text-[#5c7c89] space-y-2 leading-relaxed">
          <p>
            Are you sure you want to clear all notes and wipe the knowledge graph canvas?
          </p>
          <p className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded font-medium">
            This action will permanently delete all current notes, journal logs, Wikilinks, tags, and backlinks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            disabled={isClearing}
            className="px-3 py-1.5 border border-[#5c7c89]/40 rounded text-[#1f4959] hover:bg-[#f0f4f6] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirmClear}
            disabled={isClearing}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-[#FFFFFF] rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isClearing ? 'Clearing Canvas...' : 'Wipe & Clear Canvas'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
