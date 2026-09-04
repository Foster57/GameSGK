import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchingQuestion as MatchingQuestionType } from '../../types';
import { soundFx } from '../../utils/sound';
import { Check, X, RotateCcw, HelpCircle, GripVertical, ArrowRight } from 'lucide-react';

interface Props {
  question: MatchingQuestionType;
  isSubmitted: boolean;
  onAnswerChange: (answers: Record<string, string>, isComplete: boolean) => void;
}

export const MatchingQuestion: React.FC<Props> = ({
  question,
  isSubmitted,
  onAnswerChange,
}) => {
  // Mapping pair.id -> chosen right answer string
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [draggedAnswer, setDraggedAnswer] = useState<string | null>(null);
  const [hoveredPairId, setHoveredPairId] = useState<string | null>(null);

  // All possible right answer options (pairs + distractors)
  const allRightOptions = React.useMemo(() => {
    const list = question.pairs.map((p) => p.right);
    if (question.distractors) {
      list.push(...question.distractors);
    }
    // Shuffle options initially
    return list.sort(() => 0.5 - Math.random());
  }, [question.id]);

  useEffect(() => {
    setMatches({});
    setSelectedAnswer(null);
    setDraggedAnswer(null);
  }, [question.id]);

  const updateMatches = (newMatches: Record<string, string>) => {
    setMatches(newMatches);
    const matchedCount = Object.keys(newMatches).filter((k) => newMatches[k]).length;
    const isComplete = matchedCount === question.pairs.length;
    onAnswerChange(newMatches, isComplete);
  };

  const handleMatch = (pairId: string, answerText: string) => {
    if (isSubmitted) return;
    soundFx.playDrop();
    const updated = { ...matches };
    // If answerText was already used in another pair, remove it
    Object.keys(updated).forEach((k) => {
      if (updated[k] === answerText) delete updated[k];
    });
    updated[pairId] = answerText;
    updateMatches(updated);
    setSelectedAnswer(null);
  };

  const handleRemoveMatch = (pairId: string) => {
    if (isSubmitted) return;
    soundFx.playPickup();
    const updated = { ...matches };
    delete updated[pairId];
    updateMatches(updated);
  };

  const usedAnswers = Object.values(matches);
  const availableOptions = allRightOptions.filter((opt) => !usedAnswers.includes(opt));

  return (
    <div className="w-full flex flex-col gap-6" id="matching-game-card">
      {/* Matching Board */}
      <div className="flex flex-col gap-3.5">
        {question.pairs.map((pair, index) => {
          const currentAnswer = matches[pair.id];
          const isCorrect = isSubmitted && currentAnswer === pair.right;
          const isWrong = isSubmitted && currentAnswer && currentAnswer !== pair.right;
          const isMissing = isSubmitted && !currentAnswer;
          const isHovered = hoveredPairId === pair.id;

            return (
            <div
              key={pair.id}
              className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg backdrop-blur-xl ${
                isCorrect
                  ? 'bg-green-500/10 border-green-500/40 text-white'
                  : isWrong
                  ? 'bg-rose-500/10 border-rose-500/40 text-white'
                  : 'bg-white/5 border-white/10 text-white'
              }`}
            >
              {/* Left Item Prompt */}
              <div className="flex items-center gap-3.5 sm:w-1/2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-white/95 text-sm md:text-base">
                    {pair.left}
                  </div>
                  {pair.leftSubtext && (
                    <div className="text-xs text-blue-200/70">{pair.leftSubtext}</div>
                  )}
                </div>
              </div>

              {/* Arrow Indicator on Desktop */}
              <ArrowRight className="hidden sm:block w-4 h-4 text-white/30 shrink-0" />

              {/* Right Target Drop Slot */}
              <div
                id={`match-slot-${pair.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isSubmitted) setHoveredPairId(pair.id);
                }}
                onDragLeave={() => setHoveredPairId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoveredPairId(null);
                  const data = e.dataTransfer.getData('text/plain') || draggedAnswer;
                  if (data) {
                    handleMatch(pair.id, data);
                  }
                }}
                onClick={() => {
                  if (selectedAnswer) {
                    handleMatch(pair.id, selectedAnswer);
                  } else if (currentAnswer) {
                    handleRemoveMatch(pair.id);
                  }
                }}
                className={`sm:w-1/2 min-h-[50px] p-3 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer select-none text-sm font-medium backdrop-blur-md ${
                  isCorrect
                    ? 'bg-green-500/15 border-green-500 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                    : isWrong
                    ? 'bg-rose-500/15 border-rose-500 text-rose-300 line-through shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                    : isMissing
                    ? 'bg-amber-500/10 border-amber-400 border-dashed text-amber-300'
                    : isHovered || selectedAnswer
                    ? 'bg-blue-500/15 border-blue-400 scale-[1.02] ring-2 ring-blue-400/40 text-blue-200'
                    : currentAnswer
                    ? 'bg-white/10 border-white/30 text-white shadow-inner'
                    : 'bg-black/25 border-dashed border-white/20 text-white/40 hover:border-blue-400/60 hover:text-white/60'
                }`}
              >
                {currentAnswer ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold">{currentAnswer}</span>
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
                          handleRemoveMatch(pair.id);
                        }}
                        className="p-1 rounded-lg hover:bg-white/20 text-white/50 hover:text-white"
                        title="Gỡ bỏ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-white/40 italic">
                    {selectedAnswer ? '⚡ Nhấn để ghép đáp án đã chọn' : 'Kéo thả đáp án tương ứng vào đây'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Answer Bank */}
      {!isSubmitted && (
        <div className="p-5 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-300/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></span>
              Danh sách thẻ cần ghép ({availableOptions.length})
            </div>
            {Object.keys(matches).length > 0 && (
              <button
                type="button"
                id="reset-matching-btn"
                onClick={() => updateMatches({})}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-rose-400 transition font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Ghép lại từ đầu
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 min-h-[50px] items-center">
            <AnimatePresence>
              {availableOptions.map((opt) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <motion.div
                    key={opt}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    draggable
                    onDragStart={(e) => {
                      setSelectedAnswer(opt);
                      setDraggedAnswer(opt);
                      e.dataTransfer.setData('text/plain', opt);
                      soundFx.playPickup();
                    }}
                    onDragEnd={() => setDraggedAnswer(null)}
                    onClick={() => {
                      soundFx.playPickup();
                      setSelectedAnswer(isSelected ? null : opt);
                    }}
                    className={`px-4 py-3 rounded-2xl font-semibold text-sm cursor-grab active:cursor-grabbing select-none transition-all shadow-md flex items-center gap-2.5 border backdrop-blur-md ${
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
                Tất cả thẻ đã được ghép. Bạn có thể kiểm tra lại hoặc nhấn KIỂM TRA ĐÁP ÁN.
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
            <HelpCircle className="w-4 h-4 text-blue-400" /> Cặp ghép chính xác:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {question.pairs.map((p) => (
              <div key={p.id} className="p-3 bg-green-500/10 border border-green-500/30 rounded-2xl text-green-300 flex items-center justify-between font-semibold">
                <span>{p.left}</span>
                <span className="text-blue-300">➜ {p.right}</span>
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
