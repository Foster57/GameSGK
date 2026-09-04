import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QuestionPack,
  Question,
  GameSettings,
  QuestionResult,
  GameState,
} from '../../types';
import { FillBlankQuestion } from './FillBlankQuestion';
import { CategorizeQuestion } from './CategorizeQuestion';
import { MatchingQuestion } from './MatchingQuestion';
import { OrderingQuestion } from './OrderingQuestion';
import { ResultScreen } from './ResultScreen';
import { soundFx } from '../../utils/sound';
import {
  HelpCircle,
  Flame,
  Clock,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  X,
  Code,
  Share2,
} from 'lucide-react';

interface Props {
  pack: QuestionPack;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onBackToMenu: () => void;
  onOpenEmbedModal: () => void;
}

export const GameEngine: React.FC<Props> = ({
  pack,
  settings,
  onUpdateSettings,
  onBackToMenu,
  onOpenEmbedModal,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    currentQuestionIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    isFinished: false,
    isAnswerSubmitted: false,
    results: [],
    startedAt: Date.now(),
  });

  const [currentAnswerData, setCurrentAnswerData] = useState<any>(null);
  const [isCurrentAnswerComplete, setIsCurrentAnswerComplete] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timerSeconds, setTimerSeconds] = useState<number>(settings.timePerQuestion || 0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion: Question | undefined = pack.questions[gameState.currentQuestionIndex];
  const maxScore = pack.questions.reduce((acc, q) => acc + (q.points || 10), 0);

  // Sync sound settings
  useEffect(() => {
    soundFx.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Question timer effect
  useEffect(() => {
    if (gameState.isFinished) return;

    if (settings.timerEnabled && settings.timePerQuestion > 0) {
      setTimerSeconds(settings.timePerQuestion);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Auto submit on time-out
            handleSubmitAnswer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.currentQuestionIndex, settings.timerEnabled, settings.timePerQuestion, gameState.isFinished]);

  // Reset answer states when changing questions
  useEffect(() => {
    setCurrentAnswerData(null);
    setIsCurrentAnswerComplete(false);
    setShowHint(false);
    setQuestionStartTime(Date.now());
  }, [gameState.currentQuestionIndex]);

  // Answer validation engine
  const evaluateCurrentQuestion = (): { isCorrect: boolean; pointsEarned: number } => {
    if (!currentQuestion) return { isCorrect: false, pointsEarned: 0 };
    const qPoints = currentQuestion.points || 10;

    if (currentQuestion.type === 'fill_blank') {
      const answers = currentAnswerData as Record<string, string> || {};
      let correctSlots = 0;
      currentQuestion.slots.forEach((slot) => {
        if (answers[slot.id] === slot.correctAnswer) {
          correctSlots++;
        }
      });
      const isCorrect = correctSlots === currentQuestion.slots.length;
      const pointsEarned = isCorrect ? qPoints : Math.round((correctSlots / currentQuestion.slots.length) * qPoints);
      return { isCorrect, pointsEarned };
    }

    if (currentQuestion.type === 'categorize') {
      const placements = currentAnswerData as Record<string, string> || {};
      let correctItems = 0;
      currentQuestion.items.forEach((item) => {
        if (placements[item.id] === item.targetCategoryId) {
          correctItems++;
        }
      });
      const isCorrect = correctItems === currentQuestion.items.length;
      const pointsEarned = isCorrect ? qPoints : Math.round((correctItems / currentQuestion.items.length) * qPoints);
      return { isCorrect, pointsEarned };
    }

    if (currentQuestion.type === 'matching') {
      const matches = currentAnswerData as Record<string, string> || {};
      let correctPairs = 0;
      currentQuestion.pairs.forEach((pair) => {
        if (matches[pair.id] === pair.right) {
          correctPairs++;
        }
      });
      const isCorrect = correctPairs === currentQuestion.pairs.length;
      const pointsEarned = isCorrect ? qPoints : Math.round((correctPairs / currentQuestion.pairs.length) * qPoints);
      return { isCorrect, pointsEarned };
    }

    if (currentQuestion.type === 'ordering') {
      const ordered = currentAnswerData as Array<{ id: string; correctPosition: number }> || [];
      let correctPositions = 0;
      ordered.forEach((item, index) => {
        if (item.correctPosition === index) {
          correctPositions++;
        }
      });
      const isCorrect = correctPositions === currentQuestion.items.length;
      const pointsEarned = isCorrect ? qPoints : Math.round((correctPositions / currentQuestion.items.length) * qPoints);
      return { isCorrect, pointsEarned };
    }

    return { isCorrect: false, pointsEarned: 0 };
  };

  const handleSubmitAnswer = () => {
    if (gameState.isAnswerSubmitted) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const { isCorrect, pointsEarned } = evaluateCurrentQuestion();
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));

    if (isCorrect) {
      soundFx.playSuccess();
      const newStreak = gameState.streak + 1;
      if (newStreak >= 2) soundFx.playStreak(newStreak);
    } else {
      soundFx.playError();
    }

    const newResult: QuestionResult = {
      questionId: currentQuestion.id,
      isCorrect,
      userScore: pointsEarned,
      maxScore: currentQuestion.points || 10,
      timeSpent,
      userAnswers: currentAnswerData,
    };

    setGameState((prev) => {
      const nextStreak = isCorrect ? prev.streak + 1 : 0;
      const nextScore = prev.score + pointsEarned;

      // Broadcast answer result to parent window (if inside iframe)
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'EDUDROP_QUESTION_ANSWERED',
          packId: pack.id,
          questionIndex: prev.currentQuestionIndex,
          questionId: currentQuestion.id,
          isCorrect,
          pointsEarned,
          currentScore: nextScore,
        }, '*');
      }

      return {
        ...prev,
        score: nextScore,
        streak: nextStreak,
        maxStreak: Math.max(prev.maxStreak, nextStreak),
        isAnswerSubmitted: true,
        isCurrentAnswerCorrect: isCorrect,
        results: [...prev.results, newResult],
      };
    });
  };

  // Broadcast quiz completion to parent window (if inside iframe)
  useEffect(() => {
    if (gameState.isFinished && typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const totalTime = Math.round((Date.now() - gameState.startedAt) / 1000);
      window.parent.postMessage({
        type: 'EDUDROP_QUIZ_COMPLETE',
        packId: pack.id,
        packTitle: pack.title,
        score: gameState.score,
        maxScore,
        percentage: Math.round((gameState.score / (maxScore || 1)) * 100),
        correctCount: gameState.results.filter((r) => r.isCorrect).length,
        totalQuestions: pack.questions.length,
        totalTimeSeconds: totalTime,
        results: gameState.results,
      }, '*');
    }
  }, [gameState.isFinished, gameState.score, maxScore, pack.id, pack.questions.length, pack.title]);

  // Listen to remote commands from parent window
  useEffect(() => {
    const handleRemoteMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'EDUDROP_RESTART') {
        handleRestart();
      }
    };
    window.addEventListener('message', handleRemoteMessage);
    return () => window.removeEventListener('message', handleRemoteMessage);
  }, []);

  const handleNextQuestion = () => {
    if (gameState.currentQuestionIndex + 1 >= pack.questions.length) {
      setGameState((prev) => ({
        ...prev,
        isFinished: true,
      }));
    } else {
      setGameState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        isAnswerSubmitted: false,
        isCurrentAnswerCorrect: undefined,
      }));
    }
  };

  const handleRestart = () => {
    setGameState({
      currentQuestionIndex: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      isFinished: false,
      isAnswerSubmitted: false,
      results: [],
      startedAt: Date.now(),
    });
  };

  // Render Result Screen when game is finished
  if (gameState.isFinished) {
    const totalTime = Math.round((Date.now() - gameState.startedAt) / 1000);
    return (
      <ResultScreen
        pack={pack}
        results={gameState.results}
        totalScore={gameState.score}
        maxScore={maxScore}
        maxStreak={gameState.maxStreak}
        totalTimeSeconds={totalTime}
        onRestart={handleRestart}
        onChoosePack={onBackToMenu}
        onOpenEmbed={onOpenEmbedModal}
      />
    );
  }

  const progressPercent = ((gameState.currentQuestionIndex + 1) / pack.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6" id="game-engine-container">
      {/* Top Header Bar: Pack Info, Progress, Streak & Settings */}
      <div className="p-4 md:p-6 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Pack Title and Question index */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMenu}
              className="px-3.5 py-1.5 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition flex items-center gap-1.5"
            >
              ← Trở về
            </button>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white/90 flex items-center gap-2">
                <span>{pack.title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-semibold">
                  Câu {gameState.currentQuestionIndex + 1}/{pack.questions.length}
                </span>
              </h2>
            </div>
          </div>

          {/* Right: Score, Streak, Timer, Audio toggle */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Streak indicator */}
            {gameState.streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold text-xs shadow-xs animate-pulse">
                <Flame className="w-3.5 h-3.5" />
                <span>{gameState.streak}x</span>
              </div>
            )}

            {/* Score */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold hidden sm:inline">Điểm</span>
              <span className="text-sm md:text-base font-mono font-bold text-blue-400">
                {String(gameState.score).padStart(4, '0')}
              </span>
            </div>

            {/* Timer if enabled */}
            {settings.timerEnabled && (
              <div className={`bg-white/5 backdrop-blur-xl border rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-mono font-bold ${
                timerSeconds <= 5
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 animate-pulse'
                  : 'border-white/10 text-purple-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timerSeconds}s</span>
              </div>
            )}

            {/* Mute Audio Toggle */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className="p-2 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition"
              title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>

            {/* Quick Embed Button */}
            <button
              type="button"
              onClick={onOpenEmbedModal}
              className="hidden sm:flex items-center gap-1 text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition font-medium"
              title="Lấy mã nhúng HTML/React"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>Nhúng</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Question Card Area */}
      <div className="p-6 md:p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Question Title & Instruction */}
        <div className="relative z-10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-white/95 tracking-tight">
              {currentQuestion.title}
            </h1>
            {currentQuestion.hint && !gameState.isAnswerSubmitted && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20 transition shrink-0"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
                <span>Gợi ý</span>
              </button>
            )}
          </div>
          {currentQuestion.instruction && (
            <p className="text-sm text-blue-300/80 leading-relaxed">
              {currentQuestion.instruction}
            </p>
          )}
        </div>

        {/* Hint banner dropdown */}
        <AnimatePresence>
          {showHint && currentQuestion.hint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs md:text-sm text-amber-200 flex items-start justify-between gap-2 backdrop-blur-md"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-300">Mẹo nhỏ: </strong>
                  <span>{currentQuestion.hint}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHint(false)}
                className="text-amber-400 hover:text-amber-200"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Question Component Rendering */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentQuestion.type === 'fill_blank' && (
                <FillBlankQuestion
                  question={currentQuestion}
                  isSubmitted={gameState.isAnswerSubmitted}
                  onAnswerChange={(answers, isComplete) => {
                    setCurrentAnswerData(answers);
                    setIsCurrentAnswerComplete(isComplete);
                  }}
                />
              )}

              {currentQuestion.type === 'categorize' && (
                <CategorizeQuestion
                  question={currentQuestion}
                  isSubmitted={gameState.isAnswerSubmitted}
                  onAnswerChange={(answers, isComplete) => {
                    setCurrentAnswerData(answers);
                    setIsCurrentAnswerComplete(isComplete);
                  }}
                />
              )}

              {currentQuestion.type === 'matching' && (
                <MatchingQuestion
                  question={currentQuestion}
                  isSubmitted={gameState.isAnswerSubmitted}
                  onAnswerChange={(answers, isComplete) => {
                    setCurrentAnswerData(answers);
                    setIsCurrentAnswerComplete(isComplete);
                  }}
                />
              )}

              {currentQuestion.type === 'ordering' && (
                <OrderingQuestion
                  question={currentQuestion}
                  isSubmitted={gameState.isAnswerSubmitted}
                  onAnswerChange={(orderedItems, isComplete) => {
                    setCurrentAnswerData(orderedItems);
                    setIsCurrentAnswerComplete(isComplete);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Interaction & Submit / Next Controls */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Message */}
          <div>
            {gameState.isAnswerSubmitted ? (
              gameState.isCurrentAnswerCorrect ? (
                <div className="flex items-center gap-2 text-green-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>Chính xác tuyệt vời! (+{currentQuestion.points || 10} điểm)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                  <span>Chưa chính xác hoàn toàn! Xem lại lời giải phía trên.</span>
                </div>
              )
            ) : (
              <span className="text-xs text-white/50">
                {isCurrentAnswerComplete
                  ? 'Tất cả các vị trí đã được điền. Nhấn Kiểm tra đáp án!'
                  : 'Hãy kéo thả hoặc chọn để hoàn tất các vị trí.'}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!gameState.isAnswerSubmitted ? (
              <button
                type="button"
                id="submit-answer-btn"
                onClick={handleSubmitAnswer}
                disabled={!isCurrentAnswerComplete && currentQuestion.type !== 'ordering'}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:brightness-110 disabled:opacity-35 disabled:pointer-events-none text-white font-bold text-sm shadow-lg shadow-blue-900/40 border border-white/20 transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>KIỂM TRA ĐÁP ÁN</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="next-question-btn"
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 border border-white/20 transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>
                  {gameState.currentQuestionIndex + 1 >= pack.questions.length
                    ? 'Xem tổng kết điểm'
                    : 'Câu tiếp theo'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
