import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { BookOpen, Calendar, Tag, ArrowLeft } from 'lucide-react';

interface PublicShareViewProps {
  shareToken: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ shareToken }) => {
  const [note, setNote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${shareToken}`)
      .then(res => {
        if (!res.ok) throw new Error('Shared note not found or link has expired');
        return res.json();
      })
      .then(data => {
        setNote(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center text-xs text-[#5c7c89]">
        Loading shared note...
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex flex-col items-center justify-center p-6 text-center text-xs">
        <div className="w-10 h-10 rounded bg-[#f0f4f6] border border-[#5c7c89]/40 flex items-center justify-center text-[#1f4959] mb-3 font-bold">
          !
        </div>
        <h2 className="font-serif-title font-bold text-lg text-[#011425] mb-1">Note Unavailable</h2>
        <p className="text-[#5c7c89] max-w-sm mb-4">{error || 'Note not found'}</p>
        <a
          href="/"
          className="px-3 py-1.5 bg-[#1f4959] text-[#FFFFFF] font-semibold rounded hover:bg-[#011425] transition-colors"
        >
          Return to Pensieve
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#242424] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1f4959] bg-[#011425] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1f4959] flex items-center justify-center text-[#FFFFFF] font-bold text-sm font-serif-title border border-[#5c7c89]/40">
            P
          </div>
          <span className="font-serif-title font-bold text-base text-[#FFFFFF]">Pensieve Shared Note</span>
        </div>

        <a
          href="/"
          className="text-xs text-[#5c7c89] hover:text-[#FFFFFF] flex items-center gap-1 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Open App</span>
        </a>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-12 space-y-6">
        <div className="border-b border-[#5c7c89]/20 pb-6 space-y-3">
          <h1 className="font-serif-title font-bold text-3xl text-[#011425] tracking-tight">
            {note.title}
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#5c7c89]">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(note.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>

            {note.tags && note.tags.length > 0 && (
              <span className="flex items-center gap-1 text-[#1f4959] font-medium">
                <Tag className="w-3.5 h-3.5" />
                {note.tags.map((t: string) => `#${t}`).join(', ')}
              </span>
            )}
          </div>
        </div>

        <article
          className="pensieve-prose"
          dangerouslySetInnerHTML={{ __html: marked.parse(note.content) as string }}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f4959] bg-[#011425] p-4 text-center text-xs text-[#5c7c89]">
        Published via <strong className="text-[#FFFFFF]">Pensieve</strong> — Personal Knowledge Management
      </footer>
    </div>
  );
};
