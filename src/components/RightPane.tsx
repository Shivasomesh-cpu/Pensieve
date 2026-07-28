import React, { useState } from 'react';
import { Link2, Network, Maximize2, Minimize2, MoveHorizontal } from 'lucide-react';
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
  width?: number;
  onSetWidth?: (width: number) => void;
}

export const RightPane: React.FC<RightPaneProps> = ({
  backlinks,
  graphData,
  selectedNoteId,
  currentNoteTitle,
  onSelectNote,
  isLoadingBacklinks,
  isLoadingGraph,
  width = 360,
  onSetWidth,
}) => {
  const [activeTab, setActiveTab] = useState<'backlinks' | 'graph'>('graph');
  const [isExpanded, setIsExpanded] = useState(false);
  const [previousWidth, setPreviousWidth] = useState(360);

  const handleToggleExpand = () => {
    if (!onSetWidth) return;
    if (isExpanded) {
      onSetWidth(previousWidth || 360);
      setIsExpanded(false);
    } else {
      setPreviousWidth(width);
      // Expand to ~60% of viewport width
      const expandedWidth = Math.min(Math.max(650, Math.floor(window.innerWidth * 0.55)), 900);
      onSetWidth(expandedWidth);
      setIsExpanded(true);
    }
  };

  return (
    <div
      style={{ width: `${width}px` }}
      className="flex-shrink-0 h-full border-l border-[#5c7c89]/30 bg-[#FFFFFF] flex flex-col select-none no-print transition-[width] duration-150 ease-out relative"
    >
      {/* Tab Switcher & Window Controls Header */}
      <div className="p-2.5 border-b border-[#1f4959] bg-[#011425] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 flex-1">
          <button
            onClick={() => setActiveTab('graph')}
            className={`flex-1 py-1.5 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
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
            className={`flex-1 py-1.5 px-2.5 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'backlinks'
                ? 'bg-[#1f4959] text-[#FFFFFF] font-semibold shadow-xs'
                : 'text-[#5c7c89] hover:text-[#FFFFFF]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Backlinks</span>
          </button>
        </div>

        {/* Quick Size Presets & Expand Window Control */}
        <div className="flex items-center gap-1 border-l border-[#1f4959] pl-1.5 text-[#5c7c89]">
          {onSetWidth && (
            <>
              {/* Preset 320px */}
              <button
                onClick={() => {
                  onSetWidth(320);
                  setIsExpanded(false);
                }}
                className={`px-1.5 py-0.5 text-[10px] rounded hover:bg-[#1f4959] hover:text-white transition-colors cursor-pointer ${width === 320 ? 'text-white font-bold bg-[#1f4959]' : 'text-[#5c7c89]'}`}
                title="Narrow Window (320px)"
              >
                S
              </button>

              {/* Preset 500px */}
              <button
                onClick={() => {
                  onSetWidth(500);
                  setIsExpanded(false);
                }}
                className={`px-1.5 py-0.5 text-[10px] rounded hover:bg-[#1f4959] hover:text-white transition-colors cursor-pointer ${width === 500 ? 'text-white font-bold bg-[#1f4959]' : 'text-[#5c7c89]'}`}
                title="Medium Window (500px)"
              >
                M
              </button>

              {/* Preset 750px */}
              <button
                onClick={() => {
                  onSetWidth(750);
                  setIsExpanded(true);
                }}
                className={`px-1.5 py-0.5 text-[10px] rounded hover:bg-[#1f4959] hover:text-white transition-colors cursor-pointer ${width === 750 ? 'text-white font-bold bg-[#1f4959]' : 'text-[#5c7c89]'}`}
                title="Large Window (750px)"
              >
                L
              </button>

              {/* Maximize Toggle */}
              <button
                onClick={handleToggleExpand}
                className="p-1 rounded text-[#5c7c89] hover:text-[#FFFFFF] hover:bg-[#1f4959] transition-colors cursor-pointer"
                title={isExpanded ? "Collapse Window Width" : "Expand Window Width"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
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

