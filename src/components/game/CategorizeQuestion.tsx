import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CategorizeQuestion as CategorizeQuestionType, CategoryItem } from '../../types';
import { soundFx } from '../../utils/sound';
import { Check, X, RotateCcw, Folder, HelpCircle, GripVertical, Plus } from 'lucide-react';

interface Props {
  question: CategorizeQuestionType;
  isSubmitted: boolean;
  onAnswerChange: (answers: Record<string, string>, isComplete: boolean) => void;
}

export const CategorizeQuestion: React.FC<Props> = ({
  question,
  isSubmitted,
  onAnswerChange,
}) => {
  // Mapping of itemId -> categoryId
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeBucketId, setActiveBucketId] = useState<string | null>(null);

  useEffect(() => {
    setPlacements({});
    setSelectedItemId(null);
    setDraggedItemId(null);
  }, [question.id]);

  const updatePlacements = (newPlacements: Record<string, string>) => {
    setPlacements(newPlacements);
    const placedCount = Object.keys(newPlacements).length;
    const isComplete = placedCount === question.items.length;
    onAnswerChange(newPlacements, isComplete);
  };

  const handlePlaceInBucket = (itemId: string, categoryId: string) => {
    if (isSubmitted) return;
    soundFx.playDrop();
    const updated = { ...placements, [itemId]: categoryId };
    updatePlacements(updated);
    setSelectedItemId(null);
  };

  const handleRemoveFromBucket = (itemId: string) => {
    if (isSubmitted) return;
    soundFx.playPickup();
    const updated = { ...placements };
    delete updated[itemId];
    updatePlacements(updated);
  };

  const unassignedItems = question.items.filter((item) => !placements[item.id]);

  // Color mapper for categories
  const getCategoryStyles = (color?: string, isHighlighted?: boolean) => {
    switch (color) {
      case 'emerald':
        return {
          border: isHighlighted ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-emerald-500/30',
          bg: 'bg-emerald-500/5 backdrop-blur-xl',
          headerBg: 'bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300',
          itemBg: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/25',
        };
      case 'rose':
        return {
          border: isHighlighted ? 'border-rose-400 ring-2 ring-rose-400/50' : 'border-rose-500/30',
          bg: 'bg-rose-500/5 backdrop-blur-xl',
          headerBg: 'bg-rose-500/20 border-b border-rose-500/30 text-rose-300',
          itemBg: 'bg-rose-500/15 text-rose-200 border-rose-500/30 hover:bg-rose-500/25',
        };
      case 'amber':
        return {
          border: isHighlighted ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-amber-500/30',
          bg: 'bg-amber-500/5 backdrop-blur-xl',
          headerBg: 'bg-amber-500/20 border-b border-amber-500/30 text-amber-300',
          itemBg: 'bg-amber-500/15 text-amber-200 border-amber-500/30 hover:bg-amber-500/25',
        };
      case 'indigo':
      default:
        return {
          border: isHighlighted ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-blue-500/30',
          bg: 'bg-blue-500/5 backdrop-blur-xl',
          headerBg: 'bg-blue-500/20 border-b border-blue-500/30 text-blue-300',
          itemBg: 'bg-blue-500/15 text-blue-200 border-blue-500/30 hover:bg-blue-500/25',
        };
    }
  };

  return (
    <div className="w-full flex flex-col gap-6" id="categorize-game-card">
      {/* Category Buckets Container */}
      <div className={`grid grid-cols-1 ${question.categories.length === 2 ? 'md:grid-cols-2' : question.categories.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4`}>
        {question.categories.map((category) => {
          const itemsInCat = question.items.filter((item) => placements[item.id] === category.id);
          const isHighlighted = activeBucketId === category.id || (selectedItemId !== null);
          const styles = getCategoryStyles(category.color, activeBucketId === category.id);

          return (
            <div
              key={category.id}
              id={`bucket-${category.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isSubmitted) setActiveBucketId(category.id);
              }}
              onDragLeave={() => setActiveBucketId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setActiveBucketId(null);
                const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
                if (itemId) {
                  handlePlaceInBucket(itemId, category.id);
                }
              }}
              onClick={() => {
                if (selectedItemId) {
                  handlePlaceInBucket(selectedItemId, category.id);
                }
              }}
              className={`flex flex-col rounded-3xl border transition-all min-h-[230px] shadow-xl overflow-hidden ${styles.bg} ${styles.border} ${
                isHighlighted && !isSubmitted ? 'cursor-pointer hover:border-blue-400' : ''
              }`}
            >
              {/* Category Header */}
              <div className={`px-4 py-3 font-bold flex items-center justify-between backdrop-blur-md ${styles.headerBg}`}>
                <div className="flex items-center gap-2 text-sm md:text-base">
                  <Folder className="w-4 h-4 opacity-90" />
                  <span>{category.name}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-mono font-bold">
                  {itemsInCat.length}
                </span>
              </div>

              {category.description && (
                <div className="px-4 py-2 text-xs text-white/60 border-b border-white/5 leading-relaxed">
                  {category.description}
                </div>
              )}

              {/* Bucket Body / Dropped Items */}
              <div className="p-3.5 flex-1 flex flex-col gap-2">
                <AnimatePresence>
                  {itemsInCat.map((item) => {
                    const isCorrect = isSubmitted && item.targetCategoryId === category.id;
                    const isWrong = isSubmitted && item.targetCategoryId !== category.id;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        draggable={!isSubmitted}
                        onDragStart={(e) => {
                          setDraggedItemId(item.id);
                          e.dataTransfer.setData('text/plain', item.id);
                          soundFx.playPickup();
                        }}
                        onDragEnd={() => setDraggedItemId(null)}
                        className={`p-3 rounded-2xl text-sm font-semibold border flex items-center justify-between gap-2 shadow-md select-none backdrop-blur-md ${
                          isCorrect
                            ? 'bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                            : isWrong
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                            : styles.itemBg
                        } ${!isSubmitted ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 opacity-40 text-blue-300" />
                          <span>{item.text}</span>
                        </div>
                        {isSubmitted ? (
                          isCorrect ? (
                            <Check className="w-4 h-4 text-green-400 shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-rose-400 shrink-0" />
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromBucket(item.id);
                            }}
                            className="p-1 rounded-lg hover:bg-white/20 text-white/50 hover:text-white transition"
                            title="Bỏ ra ngoài"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {itemsInCat.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-white/15 rounded-2xl text-xs text-white/40 text-center">
                    {selectedItemId ? (
                      <span className="text-blue-300 font-semibold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-blue-400" /> Nhấn để chuyển mục vào đây
                      </span>
                    ) : (
                      'Kéo thả mục vào nhóm này'
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned Pool of Items */}
      {!isSubmitted && (
        <div className="p-5 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-300/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
              Các mục cần phân loại ({unassignedItems.length}/{question.items.length})
            </div>
            {Object.keys(placements).length > 0 && (
              <button
                type="button"
                id="reset-categories-btn"
                onClick={() => updatePlacements({})}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-rose-400 transition font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Thu hồi tất cả
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 min-h-[50px] items-center">
            <AnimatePresence>
              {unassignedItems.map((item) => {
                const isSelected = selectedItemId === item.id;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    draggable
                    onDragStart={(e) => {
                      setSelectedItemId(item.id);
                      setDraggedItemId(item.id);
                      e.dataTransfer.setData('text/plain', item.id);
                      soundFx.playPickup();
                    }}
                    onDragEnd={() => setDraggedItemId(null)}
                    onClick={() => {
                      soundFx.playPickup();
                      setSelectedItemId(isSelected ? null : item.id);
                    }}
                    className={`px-4 py-3 rounded-2xl font-semibold text-sm md:text-base cursor-grab active:cursor-grabbing select-none transition-all shadow-md flex items-center gap-2.5 border backdrop-blur-md ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-white/40 ring-2 ring-blue-400/50 scale-105 shadow-blue-900/50'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40'
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 opacity-40 text-blue-300" />
                    <span>{item.text}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {unassignedItems.length === 0 && (
              <span className="text-xs text-white/50 italic py-1">
                Tất cả các mục đã được phân loại vào nhóm. Bạn có thể nhấn KIỂM TRA ĐÁP ÁN.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Answer Explanation & Feedback */}
      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm space-y-3 text-white"
        >
          <div className="font-bold text-white/95 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" /> Kết quả phân loại chính xác:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {question.items.map((item) => {
              const correctCat = question.categories.find((c) => c.id === item.targetCategoryId);
              const userCatId = placements[item.id];
              const isCorrect = userCatId === item.targetCategoryId;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl flex items-center justify-between border font-semibold ${
                    isCorrect
                      ? 'bg-green-500/10 border-green-500/30 text-green-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <span>{item.text}</span>
                  <span className="text-blue-300 text-xs ml-2">➜ {correctCat?.name}</span>
                </div>
              );
            })}
          </div>
          {question.explanation && (
            <p className="text-white/70 pt-1 text-xs md:text-sm leading-relaxed">
              💡 {question.explanation}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};
