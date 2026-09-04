import React from 'react';
import { Sparkles, Plus, Layers, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { GameSettings } from '../types';

interface Props {
  activeView: 'explorer' | 'game' | 'editor';
  onNavigate: (view: 'explorer' | 'game' | 'editor') => void;
  onCreateNew: () => void;
  settings: GameSettings;
  onToggleSound: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeView,
  onNavigate,
  onCreateNew,
  settings,
  onToggleSound,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-2xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('explorer')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5 text-blue-200" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white/90">
              Edu<span className="bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">Drop</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-blue-300/90">
              Frosted Glass Edition
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => onNavigate('explorer')}
            className={`px-3.5 py-1.5 rounded-2xl text-xs md:text-sm font-semibold flex items-center gap-1.5 transition border ${
              activeView === 'explorer'
                ? 'bg-white/15 border-white/30 text-white shadow-inner'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Thư viện bài tập</span>
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-3.5 py-1.5 rounded-2xl bg-white/5 border border-white/10 text-blue-300 hover:bg-white/10 text-xs md:text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Soạn câu hỏi</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition"
            title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
          </button>
        </div>
      </div>
    </header>
  );
};
