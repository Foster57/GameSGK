import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, X, Send, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, Lightbulb, BookOpen, Globe, Calculator, FlaskConical,
  RotateCcw, Play,
} from 'lucide-react';
import { QuestionPack } from '../types';
import { generatePackWithAIStream } from './service/aiPackGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPackGenerated: (pack: QuestionPack) => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

// Gợi ý prompt nhanh
const QUICK_PROMPTS = [
  { icon: <BookOpen className="w-4 h-4" />, label: 'Lịch sử VN', prompt: 'Tạo 4 câu hỏi tương tác về Lịch sử Việt Nam từ thời phong kiến đến hiện đại, độ khó trung bình, gồm các dạng fill_blank, matching, ordering, categorize.' },
  { icon: <Globe className="w-4 h-4" />,    label: 'Địa lý',     prompt: 'Tạo 4 câu hỏi về Địa lý Việt Nam: các tỉnh thành, địa danh, sông núi nổi tiếng. Dạng câu hỏi đa dạng, độ khó dễ.' },
  { icon: <Calculator className="w-4 h-4" />, label: 'Toán học', prompt: 'Tạo 4 câu hỏi về Toán học cơ bản lớp 6: số học, hình học, thống kê. Độ khó dễ đến trung bình.' },
  { icon: <FlaskConical className="w-4 h-4" />, label: 'Khoa học', prompt: 'Tạo 4 câu hỏi về Khoa học tự nhiên: vật lý, hóa học, sinh học cơ bản. Độ khó trung bình.' },
  { icon: <Lightbulb className="w-4 h-4" />, label: 'IQ & Tư duy', prompt: 'Tạo 4 câu hỏi rèn luyện tư duy logic và IQ cho học sinh: phân loại, sắp xếp quy luật, ghép cặp khái niệm.' },
];

export const AIGeneratorModal: React.FC<Props> = ({ isOpen, onClose, onPackGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [steps, setSteps] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedPack, setGeneratedPack] = useState<QuestionPack | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || status === 'loading') return;

    setStatus('loading');
    setSteps([]);
    setErrorMsg('');
    setGeneratedPack(null);

    cancelRef.current = generatePackWithAIStream(prompt.trim(), {
      onProgress: (step) => {
        setSteps((prev) => [...prev, step]);
        setTimeout(scrollToBottom, 50);
      },
      onDone: (pack) => {
        setGeneratedPack(pack);
        setStatus('success');
        setTimeout(scrollToBottom, 50);
      },
      onError: (err) => {
        setErrorMsg(err);
        setStatus('error');
      },
    });
  }, [prompt, status]);

  const handleCancel = () => {
    cancelRef.current?.();
    setStatus('idle');
    setSteps([]);
  };

  const handleUse = () => {
    if (generatedPack) {
      onPackGenerated(generatedPack);
      onClose();
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setSteps([]);
    setErrorMsg('');
    setGeneratedPack(null);
  };

  const handleClose = () => {
    if (status === 'loading') handleCancel();
    else handleReset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ai-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            key="ai-modal-panel"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/15 shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-3xl">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-500/20 rounded-full blur-[60px]" />
                <div className="absolute -top-10 -left-10 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px]" />
              </div>
              <div className="flex items-center gap-3 z-10">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-white/15">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Tạo Câu Hỏi bằng AI</h2>
                  <p className="text-xs text-white/50">Powered by DeepSeek + MCP</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="z-10 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body – scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Quick prompts */}
              {status === 'idle' && (
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                    Gợi ý nhanh
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q.label}
                        onClick={() => setPrompt(q.prompt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white text-xs font-medium transition"
                      >
                        {q.icon}
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Textarea */}
              {(status === 'idle' || status === 'error') && (
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-2">
                    Mô tả yêu cầu bộ câu hỏi
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
                    }}
                    placeholder="Ví dụ: Tạo 5 câu hỏi tương tác về Lịch sử Việt Nam thời phong kiến, độ khó trung bình, gồm các dạng fill_blank, matching, ordering..."
                    className="w-full resize-none rounded-2xl bg-white/5 border border-white/10 focus:border-purple-400/50 focus:ring-0 focus:outline-none text-white placeholder-white/25 text-sm px-4 py-3 leading-relaxed transition"
                    disabled={status === 'loading'}
                  />
                  <p className="mt-1.5 text-[11px] text-white/30">
                    Ctrl + Enter để gửi • Càng mô tả chi tiết, kết quả càng tốt
                  </p>
                </div>
              )}

              {/* Error banner */}
              {status === 'error' && errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">Có lỗi xảy ra</p>
                    <p className="text-xs mt-0.5 text-rose-300/80">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Progress log */}
              {(status === 'loading' || (status === 'success' && steps.length > 0)) && (
                <div>
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                    {status === 'loading' ? 'Agent đang xử lý...' : 'Quá trình hoàn thành'}
                  </p>
                  <div className="rounded-2xl bg-black/30 border border-white/8 p-4 space-y-2 max-h-52 overflow-y-auto font-mono text-xs">
                    {steps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 text-white/70"
                      >
                        <span className="text-white/25 shrink-0 select-none">{String(i + 1).padStart(2, '0')}</span>
                        <span>{step}</span>
                      </motion.div>
                    ))}
                    {status === 'loading' && (
                      <div className="flex items-center gap-2 text-purple-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </div>
                    )}
                    <div ref={stepsEndRef} />
                  </div>
                </div>
              )}

              {/* Success preview */}
              {status === 'success' && generatedPack && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold text-sm">
                      Đã tạo thành công!
                    </span>
                  </div>

                  {/* Pack summary */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white text-base">{generatedPack.title}</p>
                        <p className="text-xs text-white/60 mt-0.5">{generatedPack.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">
                          {generatedPack.difficulty}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <span className="text-xs text-white/50">
                        {generatedPack.questions.length} câu •
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(generatedPack.questions.map((q) => q.type))).map((type) => {
                          const label =
                            type === 'fill_blank' ? 'Điền từ' :
                            type === 'categorize' ? 'Phân loại' :
                            type === 'matching'   ? 'Ghép cặp' : 'Sắp xếp';
                          return (
                            <span key={type} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-[11px]">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              {/* Left */}
              <div>
                {status === 'loading' && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm font-medium transition"
                  >
                    Huỷ
                  </button>
                )}
                {(status === 'success' || status === 'error') && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm font-medium transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Tạo lại
                  </button>
                )}
              </div>

              {/* Right */}
              <div className="flex items-center gap-2">
                {status === 'idle' && (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 text-sm font-medium transition"
                  >
                    Đóng
                  </button>
                )}

                {status === 'idle' && (
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-purple-900/30 transition border border-white/20 active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Tạo bằng AI
                  </button>
                )}

                {status === 'loading' && (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tạo...
                  </div>
                )}

                {status === 'error' && (
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 disabled:opacity-40 text-white font-bold text-sm transition border border-white/20 active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Thử lại
                  </button>
                )}

                {status === 'success' && generatedPack && (
                  <button
                    onClick={handleUse}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 transition border border-white/20 active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Dùng ngay
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
