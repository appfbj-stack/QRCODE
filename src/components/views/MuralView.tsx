import React, { useState } from 'react';
import {
  Megaphone,
  Pin,
  ThumbsUp,
  MessageCircle,
  Plus,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react';
import { MuralNotice } from '../../types';

interface MuralViewProps {
  murals: MuralNotice[];
  onAddMural: () => void;
  onLikeMural: (id: string) => void;
}

export const MuralView: React.FC<MuralViewProps> = ({
  murals,
  onAddMural,
  onLikeMural,
}) => {
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const handleLike = (id: string) => {
    onLikeMural(id);
    const updated = new Set(likedSet);
    updated.add(id);
    setLikedSet(updated);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600" />
            Mural de Avisos & Recados Pastorais
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comunicados oficiais, direções pastorais e notícias importantes da igreja.
          </p>
        </div>

        <button
          onClick={onAddMural}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Novo Comunicado
        </button>
      </div>

      {/* Murals List */}
      <div className="space-y-4">
        {murals.map((notice) => {
          const isLiked = likedSet.has(notice.id);

          return (
            <div
              key={notice.id}
              className={`p-6 rounded-3xl bg-white border transition-all ${
                notice.isPinned
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md'
                  : 'border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-900">
                    {notice.category}
                  </span>
                  {notice.isPinned && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Pin className="w-3 h-3 text-amber-600" /> Fixado
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{notice.date}</span>
              </div>

              <h2 className="text-lg font-bold font-serif text-slate-900 mt-3">{notice.title}</h2>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">
                {notice.content}
              </p>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {notice.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{notice.authorName}</p>
                    <p className="text-[10px] text-slate-400">{notice.authorRole}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(notice.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isLiked
                        ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-indigo-600' : ''}`} />
                    <span>{notice.likesCount + (isLiked ? 1 : 0)}</span>
                  </button>

                  <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {notice.commentsCount} comentários
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
