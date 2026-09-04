import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { OrderingQuestion as OrderingQuestionType, OrderItem } from '../../types';
import { soundFx } from '../../utils/sound';
import { Check, X, ArrowUp, ArrowDown, GripVertical, RotateCcw, HelpCircle } from 'lucide-react';

interface Props {
  question: OrderingQuestionType;
  isSubmitted: boolean;
  onAnswerChange: (orderedItems: OrderItem[], isComplete: boolean) => void;
}

export const OrderingQuestion: React.FC<Props> = ({
  question,
  isSubmitted,
  onAnswerChange,
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Shuffle items initially
  useEffect(() => {
    const shuffled = [...question.items].sort(() => 0.5 - Math.random());
    setItems(shuffled);
    onAnswerChange(shuffled, true);
  }, [question.id]);

  const handleMove = (fromIndex: number, toIndex: number) => {
    if (isSubmitted || toIndex < 0 || toIndex >= items.length) return;
    soundFx.playDrop();
    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setItems(updated);
    onAnswerChange(updated, true);
  };

  const handleReset = () => {
    if (isSubmitted) return;
    const shuffled = [...question.items].sort(() => 0.5 - Math.random());
    setItems(shuffled);
    onAnswerChange(shuffled, true);
  };

  return (
    <div className="w-full flex flex-col gap-6" id="ordering-game-card">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="text-blue-300 font-medium flex items-center gap-1.5">
          <GripVertical className="w-4 h-4 text-blue-400" /> Kéo thả để xếp lại vị trí hoặc dùng nút mũi tên lên/xuống
        </span>
        {!isSubmitted && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-white/60 hover:text-white transition font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Xáo trộn lại
          </button>
        )}
      </div>

      {/* Reorderable List of Items */}
      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const isCorrect = isSubmitted && item.correctPosition === index;
          const isWrong = isSubmitted && item.correctPosition !== index;
          const isBeingDragged = draggedIndex === index;

          return (
            <motion.div
              key={item.id}
              layout
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              draggable={!isSubmitted}
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.setData('text/plain', index.toString());
                soundFx.playPickup();
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sourceIdxStr = e.dataTransfer.getData('text/plain');
                const sourceIdx = parseInt(sourceIdxStr, 10);
                if (!isNaN(sourceIdx) && sourceIdx !== index) {
                  handleMove(sourceIdx, index);
                }
                setDraggedIndex(null);
              }}
              onDragEnd={() => setDraggedIndex(null)}
              className={`p-4 md:p-5 rounded-3xl border transition-all flex items-center justify-between gap-3 shadow-xl select-none backdrop-blur-xl ${
                isCorrect
                  ? 'bg-green-500/15 border-green-500/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                  : isWrong
                  ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                  : isBeingDragged
                  ? 'opacity-40 border-blue-400 scale-95'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {/* Position Number & Grab Handle */}
              <div className="flex items-center gap-3.5">
                {!isSubmitted && (
                  <GripVertical className="w-4 h-4 text-blue-300 opacity-60 cursor-grab active:cursor-grabbing shrink-0" />
                )}
                <div
                  className={`w-8 h-8 rounded-2xl font-bold text-xs flex items-center justify-center shrink-0 shadow-md ${
                    isCorrect
                      ? 'bg-green-500 text-white'
                      : isWrong
                      ? 'bg-rose-500 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="font-semibold text-sm md:text-base text-white">
                    {item.text}
                  </div>
                  {item.detail && (
                    <div className="text-xs text-white/60 mt-0.5">{item.detail}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons or Status Icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isSubmitted ? (
                  isCorrect ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-green-300">
                      <Check className="w-4 h-4 text-green-400" /> Vị trí đúng
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-semibold text-rose-300">
                      <X className="w-4 h-4 text-rose-400" /> Vị trí đúng: #{item.correctPosition + 1}
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, index - 1)}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:pointer-events-none text-white/80 hover:text-white transition"
                      title="Chuyển lên trên"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMove(index, index + 1)}
                      className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 disabled:opacity-20 disabled:pointer-events-none text-white/80 hover:text-white transition"
                      title="Chuyển xuống dưới"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Answer Explanation */}
      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm space-y-3 text-white"
        >
          <div className="font-bold text-white/95 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" /> Thứ tự chuẩn xác:
          </div>
          <div className="space-y-1.5 text-xs">
            {[...question.items]
              .sort((a, b) => a.correctPosition - b.correctPosition)
              .map((item, idx) => (
                <div key={item.id} className="p-3 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-300 font-semibold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-300 flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
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
