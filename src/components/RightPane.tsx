import React, { useState } from 'react';
import { Link2, Network } from 'lucide-react';
import { BacklinksPanel } from './BacklinksPanel';
import { KnowledgeGraph } from './KnowledgeGraph';
import { GraphData, NoteBacklinksResponse } from '../types';

interface RightPaneProps {
  backlinks: NoteBacklinksResponse | null;
  graphData: GraphData | null;
  selectedNoteId: string | null;
  currentNoteTitle: string;
  onSelectNote: (id: string) => void;
  isLoadingBacklinks: boolean;
  isLoadingGraph: boolean;
}

export const RightPane: React.FC<RightPaneProps> = ({
  backlinks,
  graphData,
  selectedNoteId,
  currentNoteTitle,
  onSelectNote,
  isLoadingBacklinks,
  isLoadingGraph,
}) => {
  const [activeTab, setActiveTab] = useState<'backlinks' | 'graph'>('graph');

  return (
    <div className="w-80 flex-shrink-0 h-full border-l border-[#5c7c89]/30 bg-[#FFFFFF] flex flex-col select-none no-print">
      {/* Tab Switcher Header */}
      <div className="p-3 border-b border-[#1f4959] bg-[#011425] flex items-center gap-1">
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'graph'
              ? 'bg-[#1f4959] text-[#FFFFFF] font-semibold shadow-xs'
              : 'text-[#5c7c89] hover:text-[#FFFFFF]'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Graph View</span>
        </button>

        <button
          onClick={() => setActiveTab('backlinks')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'backlinks'
              ? 'bg-[#1f4959] text-[#FFFFFF] font-semibold shadow-xs'
              : 'text-[#5c7c89] hover:text-[#FFFFFF]'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>Backlinks</span>
        </button>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-hidden bg-[#FFFFFF]">
        {activeTab === 'graph' ? (
          <KnowledgeGraph
            graphData={graphData}
            selectedNoteId={selectedNoteId}
            onSelectNote={onSelectNote}
            isLoading={isLoadingGraph}
          />
        ) : (
          <BacklinksPanel
            backlinks={backlinks}
            isLoading={isLoadingBacklinks}
            onSelectNote={onSelectNote}
            currentNoteTitle={currentNoteTitle}
          />
        )}
      </div>
    </div>
  );
};
