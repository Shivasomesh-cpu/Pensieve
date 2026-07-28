import React from 'react';
import { ArrowLeft, ArrowRight, Link, FileText, Ghost } from 'lucide-react';
import { NoteBacklinksResponse } from '../types';

interface BacklinksPanelProps {
  backlinks: NoteBacklinksResponse | null;
  isLoading: boolean;
  onSelectNote: (id: string) => void;
  currentNoteTitle: string;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  backlinks,
  isLoading,
  onSelectNote,
  currentNoteTitle,
}) => {
  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-[#5c7c89]">
        Loading references...
      </div>
    );
  }

  const incomingCount = backlinks?.incoming ? backlinks.incoming.length : 0;
  const outgoingCount = backlinks?.outgoing ? backlinks.outgoing.length : 0;

  return (
    <div className="h-full flex flex-col overflow-y-auto divide-y divide-[#5c7c89]/20 text-xs bg-[#FFFFFF]">
      {/* Incoming Backlinks Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#011425] font-semibold font-serif-title">
            <ArrowLeft className="w-3.5 h-3.5 text-[#1f4959]" />
            <span>Incoming Backlinks ({incomingCount})</span>
          </div>
        </div>

        {incomingCount === 0 ? (
          <div className="p-4 rounded border border-dashed border-[#5c7c89]/40 bg-[#f0f4f6] text-center text-[11px] text-[#5c7c89]">
            No other notes link to "<strong>{currentNoteTitle}</strong>" yet. Mention <code className="text-[#1f4959] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#5c7c89]/30">[[{currentNoteTitle}]]</code> in another note to create a link!
          </div>
        ) : (
          <div className="space-y-2">
            {backlinks?.incoming.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectNote(item.id)}
                className="p-3 bg-[#f0f4f6] hover:bg-[#e2e8f0] border border-[#5c7c89]/30 hover:border-[#1f4959] rounded transition-colors cursor-pointer group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif-title font-semibold text-[#011425] group-hover:text-[#1f4959] transition-colors truncate">
                    {item.title}
                  </span>
                  {item.type === 'ghost' && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#FFFFFF] text-[#5c7c89] border border-[#5c7c89]/40 rounded font-medium">Ghost</span>
                  )}
                </div>

                <p className="text-[11px] text-[#5c7c89] line-clamp-2 leading-relaxed italic">
                  "{item.snippet}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing References Section */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#011425] font-semibold font-serif-title">
            <ArrowRight className="w-3.5 h-3.5 text-[#1f4959]" />
            <span>Outgoing Links ({outgoingCount})</span>
          </div>
        </div>

        {outgoingCount === 0 ? (
          <div className="p-4 rounded border border-dashed border-[#5c7c89]/40 bg-[#f0f4f6] text-center text-[11px] text-[#5c7c89]">
            This note doesn't reference any other notes yet. Use <code className="text-[#1f4959] bg-[#FFFFFF] px-1 py-0.5 rounded border border-[#5c7c89]/30">[[Note Title]]</code> in your content to link concepts.
          </div>
        ) : (
          <div className="space-y-2">
            {backlinks?.outgoing.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectNote(item.id)}
                className="p-3 bg-[#f0f4f6] hover:bg-[#e2e8f0] border border-[#5c7c89]/30 hover:border-[#1f4959] rounded transition-colors cursor-pointer group space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif-title font-semibold text-[#011425] group-hover:text-[#1f4959] transition-colors truncate">
                    {item.title}
                  </span>
                  {item.type === 'ghost' && (
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#FFFFFF] text-[#5c7c89] border border-[#5c7c89]/40 rounded font-medium">Ghost</span>
                  )}
                </div>

                <p className="text-[11px] text-[#5c7c89] line-clamp-2 leading-relaxed">
                  {item.snippet}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
