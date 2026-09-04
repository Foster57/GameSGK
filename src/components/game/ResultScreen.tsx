import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { QuestionPack, QuestionResult } from '../../types';
import { soundFx } from '../../utils/sound';
import { Trophy, CheckCircle2, XCircle, RotateCcw, ArrowRight, Share2, Clock, Flame, Award } from 'lucide-react';

interface Props {
  pack: QuestionPack;
  results: QuestionResult[];
  totalScore: number;
  maxScore: number;
  maxStreak: number;
  totalTimeSeconds: number;
  onRestart: () => void;
  onChoosePack: () => void;
}

export const ResultScreen: React.FC<Props> = ({
  pack,
  results,
  totalScore,
  maxScore,
  maxStreak,
  totalTimeSeconds,
  onRestart,
  onChoosePack,
}) => {
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const correctCount = results.filter((r) => r.isCorrect).length;

  useEffect(() => {
    if (percentage >= 70) {
      soundFx.playVictory();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [percentage]);

  const getEvaluation = () => {
    if (percentage === 100) return { title: 'Xuất sắc tuyệt đối!', desc: 'Bạn đã trả lời đúng toàn bộ câu hỏi không một sai sót!', color: 'text-amber-500' };
    if (percentage >= 80) return { title: 'Rất tốt!', desc: 'Bạn nắm rất vững kiến thức bài học này.', color: 'text-emerald-500' };
    if (percentage >= 50) return { title: 'Đạt yêu cầu!', desc: 'Hãy ôn tập lại những câu chưa chính xác để đạt điểm tuyệt đối nhé.', color: 'text-indigo-500' };
    return { title: 'Cần cố gắng thêm!', desc: 'Đừng nản lòng, hãy thử lại để ghi nhớ các đáp án nhé.', color: 'text-rose-500' };
  };

  const evalInfo = getEvaluation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto flex flex-col gap-6"
      id="game-result-screen"
    >
      {/* Celebration Header Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 text-white shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(251,191,36,0.3)] border border-white/20">
          <Trophy className="w-10 h-10 text-amber-300 animate-bounce" />
        </div>

        <span className="px-3.5 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider mb-2 text-blue-300">
          {pack.title}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {evalInfo.title}
        </h2>
        <p className="text-white/70 text-sm max-w-md mt-1 mb-6">
          {evalInfo.desc}
        </p>

        {/* Highlight Score Ring / Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center">
            <Award className="w-4 h-4 text-amber-300 mb-1" />
            <div className="text-2xl font-black text-white">{totalScore}/{maxScore}</div>
            <div className="text-[11px] text-white/60 uppercase font-medium">Điểm số ({percentage}%)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center">
            <CheckCircle2 className="w-4 h-4 text-green-400 mb-1" />
            <div className="text-2xl font-black text-white">{correctCount}/{pack.questions.length}</div>
            <div className="text-[11px] text-white/60 uppercase font-medium">Câu chính xác</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center">
            <Flame className="w-4 h-4 text-orange-400 mb-1" />
            <div className="text-2xl font-black text-white">{maxStreak}🔥</div>
            <div className="text-[11px] text-white/60 uppercase font-medium">Chuỗi đúng nhất</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col items-center">
            <Clock className="w-4 h-4 text-cyan-400 mb-1" />
            <div className="text-2xl font-black text-white">{totalTimeSeconds}s</div>
            <div className="text-[11px] text-white/60 uppercase font-medium">Thời gian thi</div>
          </div>
        </div>
      </div>

      {/* Review Questions Breakdown */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          Chi tiết từng câu hỏi ({pack.questions.length})
        </h3>

        <div className="space-y-3">
          {pack.questions.map((q, index) => {
            const res = results.find((r) => r.questionId === q.id);
            const isCorrect = res?.isCorrect ?? false;

            return (
              <div
                key={q.id}
                className={`p-4 rounded-2xl border flex items-start gap-3 transition backdrop-blur-md ${
                  isCorrect
                    ? 'bg-green-500/10 border-green-500/30 text-white'
                    : 'bg-rose-500/10 border-rose-500/30 text-white'
                }`}
              >
                <div className="mt-0.5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Câu {index + 1}: {q.title}
                    </span>
                    <span className="text-xs font-bold text-white/60 font-mono">
                      {res?.userScore || 0}/{q.points || 10} điểm
                    </span>
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-white/60 mt-1 leading-relaxed">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition border border-white/20"
        >
          <RotateCcw className="w-4 h-4" /> Chơi lại gói này
        </button>

        <button
          type="button"
          onClick={onChoosePack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center justify-center gap-2 border border-white/20 transition backdrop-blur-md"
        >
          <span>Khám phá chủ đề khác</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
