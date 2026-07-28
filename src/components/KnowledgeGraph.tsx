import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, Maximize2, Target } from 'lucide-react';
import { GraphData, GraphNode } from '../types';

interface KnowledgeGraphProps {
  graphData: GraphData | null;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  isLoading: boolean;
}

type SimulatedNode = GraphNode & { x: number; y: number; vx: number; vy: number };

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  graphData,
  selectedNoteId,
  onSelectNote,
  isLoading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Simulation state
  const nodesRef = useRef<SimulatedNode[]>([]);
  const draggingNodeRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Recenter / Fit Graph in view
  const handleRecenter = useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0 || !containerRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const width = containerRef.current.clientWidth || 400;
    const height = containerRef.current.clientHeight || 400;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphWidth = maxX - minX || 100;
    const graphHeight = maxY - minY || 100;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scaleX = (width - 80) / graphWidth;
    const scaleY = (height - 80) / graphHeight;
    const fitZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.6), 1.8);

    setZoom(fitZoom);
    setPan({
      x: width / 2 - centerX,
      y: height / 2 - centerY,
    });
  }, []);

  // Initialize simulation positions when graphData changes
  useEffect(() => {
    if (!graphData || graphData.nodes.length === 0) {
      nodesRef.current = [];
      return;
    }

    const width = containerRef.current?.clientWidth || 400;
    const height = containerRef.current?.clientHeight || 400;

    const existingMap = new Map<string, { x: number; y: number }>(
      nodesRef.current.map(n => [n.id, { x: n.x, y: n.y }])
    );

    nodesRef.current = graphData.nodes.map((node, idx) => {
      const existing = existingMap.get(node.id);
      const angle = (idx / graphData.nodes.length) * Math.PI * 2;
      const radius = 60 + Math.random() * 80;
      return {
        ...node,
        x: existing ? existing.x : width / 2 + Math.cos(angle) * radius,
        y: existing ? existing.y : height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });
  }, [graphData]);

  // Main Canvas Render & Force Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDestroyed = false;

    const runSimulationStep = () => {
      if (isDestroyed) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const cssWidth = rect?.width || 400;
      const cssHeight = rect?.height || 400;

      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const nodes = nodesRef.current;
      const edges = graphData?.edges || [];

      // 1. Repulsion force between node pairs (smooth quadratic dropoff to 0 at dist=180)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 180 && dist > 1) {
            // Smooth quadratic decay that approaches 0 smoothly at dist=180
            const force = Math.pow((180 - dist) / 180, 2) * 1.0;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggingNodeRef.current !== n1.id) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (draggingNodeRef.current !== n2.id) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Attraction along edges (gentle spring with 10px equilibrium deadzone to stop jitter)
      const nodeMap = new Map<string, SimulatedNode>(nodes.map(n => [n.id, n]));
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - 110;

          // 10px deadzone where force is zero to prevent equilibrium fighting
          if (Math.abs(delta) > 5) {
            const rawForce = (delta > 0 ? delta - 5 : delta + 5) * 0.005;
            const force = Math.max(-1.0, Math.min(1.0, rawForce));
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggingNodeRef.current !== source.id) {
              source.vx += fx;
              source.vy += fy;
            }
            if (draggingNodeRef.current !== target.id) {
              target.vx -= fx;
              target.vy -= fy;
            }
          }
        }
      }

      // 3. Gentle center gravity & friction dampening
      const centerX = cssWidth / 2;
      const centerY = cssHeight / 2;
      for (const n of nodes) {
        if (draggingNodeRef.current !== n.id) {
          const distFromCenter = Math.hypot(centerX - n.x, centerY - n.y);
          if (distFromCenter > 20) {
            n.vx += (centerX - n.x) * 0.0003;
            n.vy += (centerY - n.y) * 0.0003;
          }

          // Stable friction damping
          n.vx *= 0.82;
          n.vy *= 0.82;

          // Complete stop resting deadzone (eliminates micro-vibrations completely)
          if (Math.hypot(n.vx, n.vy) < 0.06) {
            n.vx = 0;
            n.vy = 0;
          } else {
            n.x += Math.max(-5, Math.min(5, n.vx));
            n.y += Math.max(-5, Math.min(5, n.vy));
          }
        }
      }

      // CLEAR CANVAS (White crisp background)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Subtle Background Grid
      ctx.strokeStyle = '#f0f4f6';
      ctx.lineWidth = 1;
      const gridSize = 24 * zoom;
      const offsetX = (pan.x % gridSize);
      const offsetY = (pan.y % gridSize);

      ctx.beginPath();
      for (let x = offsetX; x < cssWidth; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
      }
      for (let y = offsetY; y < cssHeight; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(cssWidth, y);
      }
      ctx.stroke();

      // Transform Viewport
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // DRAW EDGES
      for (const edge of edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (source && target) {
          const isConnectedToHover = hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId);
          const isConnectedToSelected = selectedNoteId && (edge.source === selectedNoteId || edge.target === selectedNoteId);

          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);

          if (isConnectedToHover || isConnectedToSelected) {
            ctx.strokeStyle = '#1f4959';
            ctx.lineWidth = 2.5;
          } else {
            ctx.strokeStyle = '#5c7c89';
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1.2;
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      // DRAW NODES
      for (const node of nodes) {
        const isSelected = node.id === selectedNoteId;
        const isHovered = node.id === hoveredNodeId;

        const conn = typeof node.connectionCount === 'number' ? node.connectionCount : 0;
        // Make node size a bit smaller and sleek
        const baseRadius = node.type === 'tag' ? 3.5 : 4 + Math.min(conn * 0.7, 8);
        const radius = isSelected || isHovered ? baseRadius * 1.35 : baseRadius;

        // Outer glow halo for selected
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = (node.color || '#1f4959') + '33'; // 20% opacity
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        const nodeColor = node.color || '#1f4959';

        if (isSelected) {
          ctx.fillStyle = nodeColor;
          ctx.strokeStyle = '#011425';
          ctx.lineWidth = 2.5;
        } else if (isHovered) {
          ctx.fillStyle = nodeColor;
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
        } else if (node.is_ghost) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([2, 2]);
        } else if (node.type === 'tag') {
          ctx.fillStyle = '#d97706';
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = nodeColor;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([]);
        }

        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // NODE LABEL
        const labelText = node.title || 'Untitled';
        ctx.font = isSelected || isHovered
          ? '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : '500 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const textMetrics = ctx.measureText(labelText);
        const labelY = node.y + radius + 11;

        // Label Background Pill for high readability
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.fillRect(
          node.x - textMetrics.width / 2 - 3,
          labelY - 9,
          textMetrics.width + 6,
          13
        );

        ctx.fillStyle = isSelected || isHovered ? '#011425' : '#242424';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, node.x, labelY);
      }

      ctx.restore(); // Restore Viewport
      ctx.restore(); // Restore DPR scaling

      animFrameRef.current = requestAnimationFrame(runSimulationStep);
    };

    runSimulationStep();

    return () => {
      isDestroyed = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [graphData, selectedNoteId, hoveredNodeId, zoom, pan]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = rect.width * dpr;
        canvasRef.current.height = rect.height * dpr;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Interaction Helpers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Transform mouse coords back to graph space
    const x = (mouseX - pan.x) / zoom;
    const y = (mouseY - pan.y) / zoom;

    return { x, y };
  };

  const getNodeHitRadius = (node: GraphNode) => {
    const conn = typeof node.connectionCount === 'number' ? node.connectionCount : 0;
    const baseRadius = node.type === 'tag' ? 4 : 5 + Math.min(conn * 0.7, 8);
    return baseRadius * 1.6;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const nodes = nodesRef.current;

    // Find clicked node
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const radius = getNodeHitRadius(n);
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        draggingNodeRef.current = n.id;
        return;
      }
    }

    // Otherwise start panning
    isPanningRef.current = true;
    startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    const nodes = nodesRef.current;

    if (draggingNodeRef.current) {
      const node = nodes.find(n => n.id === draggingNodeRef.current);
      if (node) {
        // Smooth, capped velocity when dragging
        node.vx = Math.max(-3, Math.min(3, (x - node.x) * 0.15));
        node.vy = Math.max(-3, Math.min(3, (y - node.y) * 0.15));
        node.x = x;
        node.y = y;
      }
      return;
    }

    if (isPanningRef.current) {
      setPan({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }

    // Check hover state
    let hovered: string | null = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const radius = getNodeHitRadius(n);
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        hovered = n.id;
        break;
      }
    }
    setHoveredNodeId(hovered);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (draggingNodeRef.current) {
      draggingNodeRef.current = null;
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    // Click node to select
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const radius = getNodeHitRadius(n);
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        if (!n.id.startsWith('tag-hub-')) {
          onSelectNote(n.id);
        }
        break;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-[#5c7c89] bg-[#FFFFFF]">
        Building Knowledge Graph...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-[#FFFFFF] overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Graph Controls Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#FFFFFF] border border-[#5c7c89]/40 shadow-md rounded p-1 text-xs">
        <button
          onClick={() => setZoom(z => Math.min(z * 1.25, 3))}
          className="p-1.5 hover:bg-[#f0f4f6] text-[#011425] rounded cursor-pointer transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setZoom(z => Math.max(z / 1.25, 0.3))}
          className="p-1.5 hover:bg-[#f0f4f6] text-[#011425] rounded cursor-pointer transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleRecenter}
          className="p-1.5 hover:bg-[#f0f4f6] text-[#011425] rounded cursor-pointer transition-colors"
          title="Recenter & Fit View"
        >
          <Target className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rich Color-Coded Category Legend */}
      <div className="absolute top-3 left-3 bg-[#FFFFFF]/95 backdrop-blur border border-[#5c7c89]/30 rounded-lg p-2.5 text-[10px] text-[#242424] space-y-1.5 shadow-md max-w-xs">
        <div className="font-bold text-[#011425] pb-1 border-b border-[#5c7c89]/20 flex items-center justify-between">
          <span>Knowledge Nodes</span>
          <span className="font-mono text-[#5c7c89]">{graphData?.nodes.length || 0} nodes / {graphData?.edges.length || 0} links</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
            <span>AI / Nemotron</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
            <span>Architecture</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>Concepts</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#e11d48]" />
            <span>Config & Data</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#011425]" />
            <span>Daily Journal</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
            <span>Tag Hubs</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full border border-[#64748b] bg-white" />
            <span>Ghost Ref</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#1f4959]" />
            <span>General Note</span>
          </div>
        </div>

        <div className="text-[9.5px] pt-1 text-[#5c7c89] border-t border-[#5c7c89]/20 font-sans">
          Drag nodes • Zoom to explore dense clusters
        </div>
      </div>
    </div>
  );
};
