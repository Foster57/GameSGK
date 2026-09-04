import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FillBlankQuestion as FillBlankQuestionType } from '../../types';
import { soundFx } from '../../utils/sound';
import { Check, X, RotateCcw, HelpCircle, GripVertical } from 'lucide-react';

interface Props {
  question: FillBlankQuestionType;
  isSubmitted: boolean;
  onAnswerChange: (answers: Record<string, string>, isComplete: boolean) => void;
}

export const FillBlankQuestion: React.FC<Props> = ({
  question,
  isSubmitted,
  onAnswerChange,
}) => {
  // Mapping of slotId -> option string
  const [slotAnswers, setSlotAnswers] = useState<Record<string, string>>({});
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);

  // Reset when question changes
  useEffect(() => {
    setSlotAnswers({});
    setSelectedToken(null);
    setDraggedToken(null);
  }, [question.id]);

  // Compute remaining pool of options
  const usedOptions = Object.values(slotAnswers);
  const availableOptions = question.options.filter(
    (opt) => !usedOptions.includes(opt)
  );

  const updateAnswers = (newAnswers: Record<string, string>) => {
    setSlotAnswers(newAnswers);
    const filledCount = Object.keys(newAnswers).filter((k) => newAnswers[k]).length;
    const isComplete = filledCount === question.slots.length;
    onAnswerChange(newAnswers, isComplete);
  };

  const handlePlaceInSlot = (slotId: string, token: string) => {
    if (isSubmitted) return;
    soundFx.playDrop();
    const updated = { ...slotAnswers };
    // If token was in another slot, remove it from that slot
    Object.keys(updated).forEach((k) => {
      if (updated[k] === token) delete updated[k];
    });
    updated[slotId] = token;
    updateAnswers(updated);
    setSelectedToken(null);
  };

  const handleRemoveFromSlot = (slotId: string) => {
    if (isSubmitted) return;
    soundFx.playPickup();
    const updated = { ...slotAnswers };
    delete updated[slotId];
    updateAnswers(updated);
  };

  const handleTokenClick = (token: string) => {
    if (isSubmitted) return;
    soundFx.playPickup();
    if (selectedToken === token) {
      setSelectedToken(null);
    } else {
      setSelectedToken(token);
      // Auto-fill into the first empty slot if only one empty slot exists
      const emptySlot = question.slots.find((s) => !slotAnswers[s.id]);
      if (emptySlot) {
        handlePlaceInSlot(emptySlot.id, token);
      }
    }
  };

  // Parse templateText to render segments and slots
  const renderTemplateWithSlots = () => {
    // Regex splits by [slotId]
    const parts = question.templateText.split(/(\[slot\w+\])/g);

    return (
      <div className="text-lg md:text-xl leading-relaxed text-white/95 font-medium my-4 p-6 md:p-8 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
        {parts.map((part, index) => {
          const match = part.match(/\[(slot\w+)\]/);
          if (match) {
            const slotId = match[1];
            const slotConfig = question.slots.find((s) => s.id === slotId);
            const currentVal = slotAnswers[slotId];
            const isCorrect = isSubmitted && currentVal === slotConfig?.correctAnswer;
            const isWrong = isSubmitted && currentVal && currentVal !== slotConfig?.correctAnswer;
            const isMissing = isSubmitted && !currentVal;
            const isHovered = hoveredSlotId === slotId;
            const isTargetActive = selectedToken !== null;

            return (
              <span
                key={slotId}
                id={`slot-${slotId}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isSubmitted) setHoveredSlotId(slotId);
                }}
                onDragLeave={() => setHoveredSlotId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredSlotId(null);
                  const data = e.dataTransfer.getData('text/plain') || draggedToken;
                  if (data) {
                    handlePlaceInSlot(slotId, data);
                  }
                }}
                onClick={() => {
                  if (selectedToken) {
                    handlePlaceInSlot(slotId, selectedToken);
                  } else if (currentVal) {
                    handleRemoveFromSlot(slotId);
                  }
                }}
                className={`inline-flex items-center justify-center min-w-[130px] min-h-[46px] px-3.5 py-1.5 mx-1.5 align-middle rounded-2xl border-2 transition-all cursor-pointer select-none text-base font-semibold shadow-md backdrop-blur-md ${
                  isCorrect
                    ? 'bg-green-500/15 border-green-500 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                    : isWrong
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 line-through shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                    : isMissing
                    ? 'bg-amber-500/10 border-amber-400 border-dashed text-amber-300'
                    : isHovered || isTargetActive
                    ? 'bg-blue-500/15 border-blue-400 scale-105 ring-2 ring-blue-400/40 text-blue-200'
                    : currentVal
                    ? 'bg-white/10 border-white/30 text-white shadow-inner'
                    : 'bg-black/25 border-dashed border-white/20 text-white/40 hover:border-blue-400/60 hover:text-white/60'
                }`}
              >
                {currentVal ? (
                  <span className="flex items-center gap-1.5">
                    <span>{currentVal}</span>
                    {isSubmitted ? (
                      isCorrect ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-rose-400" />
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromSlot(slotId);
                        }}
                        className="p-0.5 rounded-lg hover:bg-white/20 text-white/50 hover:text-white"
                        title="Gỡ bỏ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="text-xs text-white/40 font-normal italic">
                    {isSubmitted ? 'Chưa điền' : 'Kéo từ vào đây'}
                  </span>
                )}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6" id="fill-blank-game-card">
      {/* Instructions */}
      <div className="flex items-center justify-between text-sm text-white/70">
        <span className="font-medium text-blue-300 flex items-center gap-1.5">
          <GripVertical className="w-4 h-4 text-blue-400" /> Kéo đáp án hoặc nhấn vào từ để đặt vào chỗ trống
        </span>
        {!isSubmitted && Object.keys(slotAnswers).length > 0 && (
          <button
            type="button"
            id="reset-answers-btn"
            onClick={() => updateAnswers({})}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-rose-400 transition font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Đặt lại các ô
          </button>
        )}
      </div>

      {/* Main Sentence with interactive slots */}
      {renderTemplateWithSlots()}

      {/* Token Options Bank */}
      {!isSubmitted && (
        <div className="p-5 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-300/80 mb-3.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
            Kho từ đáp án khả dụng ({availableOptions.length})
          </div>
          <div className="flex flex-wrap gap-3 min-h-[50px] items-center">
            <AnimatePresence>
              {availableOptions.map((opt) => {
                const isSelected = selectedToken === opt;
                return (
                  <motion.div
                    key={opt}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    draggable
                    onDragStart={(e) => {
                      setDraggedToken(opt);
                      e.dataTransfer.setData('text/plain', opt);
                      soundFx.playPickup();
                    }}
                    onDragEnd={() => setDraggedToken(null)}
                    onClick={() => handleTokenClick(opt)}
                    className={`px-4 py-3 rounded-2xl font-semibold text-sm md:text-base cursor-grab active:cursor-grabbing select-none transition-all shadow-md flex items-center gap-2.5 border backdrop-blur-md ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-white/40 ring-2 ring-blue-400/50 scale-105 shadow-blue-900/50'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40'
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 opacity-40 text-blue-300" />
                    <span>{opt}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {availableOptions.length === 0 && (
              <span className="text-xs text-white/50 italic py-1">
                Tất cả từ đã được phân bổ vào các ô trống. Hãy kiểm tra lại hoặc gỡ bớt nếu muốn đổi.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Answer Explanation & Correct Answers when submitted */}
      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-sm space-y-3 text-white"
        >
          <div className="font-bold text-white/95 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" /> Đáp án chính xác:
          </div>
          <div className="flex flex-wrap gap-3">
            {question.slots.map((slot, idx) => (
              <span key={slot.id} className="bg-green-500/10 text-green-300 px-3.5 py-1.5 rounded-2xl border border-green-500/30 font-semibold text-xs md:text-sm">
                Ô {idx + 1}: <strong className="ml-1 text-white">{slot.correctAnswer}</strong>
              </span>
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
