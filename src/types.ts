export interface Note {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'journal' | 'ghost';
  is_ghost: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  share_token?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface BacklinkInfo {
  id: string;
  title: string;
  snippet: string;
  type: 'note' | 'journal' | 'ghost';
  updated_at: string;
}

export interface NoteBacklinksResponse {
  incoming: BacklinkInfo[];
  outgoing: BacklinkInfo[];
}

export interface GraphNode {
  id: string;
  title: string;
  type: 'note' | 'journal' | 'ghost';
  is_ghost: boolean;
  connectionCount: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  target_title: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchFilters {
  query: string;
  tag: string;
  type: 'all' | 'note' | 'journal' | 'ghost';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export interface StreakInfo {
  currentStreak: number;
  hasEntryToday: boolean;
  totalJournals: number;
  lastJournalDate: string | null;
}

export interface NoteDeleteWarning {
  warning: boolean;
  message?: string;
  referencingNotes?: { id: string; title: string }[];
}
