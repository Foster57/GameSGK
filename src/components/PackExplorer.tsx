import React from 'react';
import { motion } from 'motion/react';
import { QuestionPack } from '../types';
import {
  Play,
  Edit3,
  Layers,
  Languages,
  Atom,
  MapPin,
  Code2,
  Plus,
  FileUp,
  Sparkles,
} from 'lucide-react';

interface Props {
  packs: QuestionPack[];
  onSelectPack: (pack: QuestionPack) => void;
  onEditPack: (pack: QuestionPack) => void;
  onCreateNewPack: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PackExplorer: React.FC<Props> = ({
  packs,
  onSelectPack,
  onEditPack,
  onCreateNewPack,
  onImportJson,
}) => {
  const getPackIcon = (iconName: string) => {
    switch (iconName) {
      case 'Languages':
        return <Languages className="w-6 h-6" />;
      case 'Atom':
        return <Atom className="w-6 h-6" />;
      case 'MapPin':
        return <MapPin className="w-6 h-6" />;
      case 'Code2':
        return <Code2 className="w-6 h-6" />;
      default:
        return <Sparkles className="w-6 h-6" />;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'Dễ':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'Nâng cao':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'Trung bình':
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      {/* Hero / Quick Action Bar */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/15 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[350px] h-[350px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[350px] h-[350px] bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="space-y-2 z-10 max-w-xl">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white/95">
            Thư Viện Bài Tập
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <button
            type="button"
            onClick={onCreateNewPack}
            className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition border border-white/20"
          >
            <Plus className="w-4 h-4" /> Soạn câu hỏi mới
          </button>

          <label className="flex-1 md:flex-initial px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition border border-white/15 backdrop-blur-md">
            <FileUp className="w-4 h-4 text-purple-300" /> Nhập file JSON
            <input
              type="file"
              accept=".json"
              onChange={onImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Question Packs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            Các gói học liệu có sẵn ({packs.length})
          </h2>
          <span className="text-xs text-white/50">
            Chọn một bài học để bắt đầu chơi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {packs.map((pack) => {
            return (
              <motion.div
                key={pack.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/25 hover:bg-white/[0.08] shadow-xl transition flex flex-col justify-between gap-5 relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />

                <div className="relative z-10">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-blue-300">
                        {pack.category}
                      </span>
                      <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${getDifficultyBadge(pack.difficulty)}`}>
                        {pack.difficulty}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white/50">
                      {pack.questions.length} câu hỏi
                    </span>
                  </div>

                  {/* Pack Title & Description */}
                  <div className="flex items-start gap-4">
                    <div className="p-3.5 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0">
                      {getPackIcon(pack.icon)}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base md:text-lg text-white group-hover:text-blue-200 transition">
                        {pack.title}
                      </h3>
                      <p className="text-xs md:text-sm text-white/60 line-clamp-2 leading-relaxed">
                        {pack.description}
                      </p>
                    </div>
                  </div>

                  {/* Included Question Types Pill Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/10">
                    {Array.from(new Set(pack.questions.map((q) => q.type))).map((type) => {
                      const typeLabel =
                        type === 'fill_blank'
                          ? 'Điền từ'
                          : type === 'categorize'
                          ? 'Phân loại nhóm'
                          : type === 'matching'
                          ? 'Ghép cặp'
                          : 'Sắp xếp thứ tự';

                      return (
                        <span
                          key={type}
                          className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[11px] font-medium"
                        >
                          • {typeLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="relative z-10 flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditPack(pack)}
                      className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-1 transition"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPack(pack)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition border border-white/20 active:scale-[0.98]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Bắt đầu chơi</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
