import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  referencingNotes: { id: string; title: string }[];
  noteTitle: string;
}

export const DeleteWarningModal: React.FC<DeleteWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  referencingNotes,
  noteTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#5c7c89]/40 rounded shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[#1f4959]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <h3 className="font-serif-title font-bold text-base text-[#011425]">
              Warning: Linked References Found
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5c7c89] hover:text-[#242424] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Description */}
        <div className="text-xs text-[#5c7c89] space-y-2 leading-relaxed">
          <p>
            The note <strong className="text-[#011425]">"{noteTitle}"</strong> is explicitly referenced by <strong>{referencingNotes.length}</strong> other note(s).
          </p>
          <p>
            Deleting this note will convert those references into lightweight <span className="text-[#1f4959] font-semibold">ghost note references</span>.
          </p>
        </div>

        {/* Referencing Notes List */}
        <div className="max-h-36 overflow-y-auto bg-[#f0f4f6] border border-[#5c7c89]/30 rounded p-2 divide-y divide-[#5c7c89]/20 text-xs">
          {referencingNotes.map(rn => (
            <div key={rn.id} className="py-1.5 px-2 text-[#011425] font-medium font-serif-title truncate">
              [[{rn.title}]]
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#f0f4f6] hover:bg-[#e2e8f0] border border-[#5c7c89]/40 text-[#242424] rounded transition-colors cursor-pointer font-medium"
          >
            Cancel
          </button>

          <button
            onClick={onConfirmDelete}
            className="px-3 py-1.5 bg-[#1f4959] hover:bg-[#011425] text-[#FFFFFF] font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
