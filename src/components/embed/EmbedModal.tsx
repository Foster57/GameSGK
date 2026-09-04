import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionPack, GameSettings } from '../../types';
import {
  Code,
  Copy,
  Check,
  X,
  FileJson,
  Layers,
  Globe,
  Download,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPack: QuestionPack;
  settings: GameSettings;
}

export const EmbedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentPack,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'iframe' | 'react' | 'json' | 'api'>('iframe');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [embedTheme, setEmbedTheme] = useState<string>('indigo');
  const [embedHeight, setEmbedHeight] = useState<number>(650);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const iframeUrl = `${currentUrl}/?pack=${currentPack.id}&theme=${embedTheme}&embedded=true`;

  const iframeSnippet = `<!-- EduDrop Drag & Drop Quiz Embed -->
<div style="position: relative; width: 100%; max-width: 850px; margin: 0 auto;">
  <iframe
    src="${iframeUrl}"
    width="100%"
    height="${embedHeight}px"
    frameborder="0"
    style="border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);"
    allow="autoplay"
  ></iframe>
</div>`;

  const reactSnippet = `// 1. Cài đặt các thư viện cần thiết:
// npm install motion lucide-react canvas-confetti

// 2. Nhúng vào Component React / Next.js của bạn:
import React from 'react';
import { GameEngine } from '@/components/game/GameEngine';

const quizData = ${JSON.stringify(currentPack, null, 2)};

export default function LearningQuizPage() {
  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <GameEngine
        pack={quizData}
        settings={{
          soundEnabled: true,
          timerEnabled: false,
          timePerQuestion: 0,
          instantFeedback: true,
          allowRetry: true,
          shuffleQuestions: false,
          themeColor: 'indigo'
        }}
        onBackToMenu={() => console.log('Back clicked')}
        onOpenEmbedModal={() => {}}
        onUpdateSettings={() => {}}
      />
    </div>
  );
}`;

  const jsonPackString = JSON.stringify(currentPack, null, 2);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonPackString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPack.id || 'edudrop-quiz'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl bg-[#0a0a1a]/90 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Tích hợp Game vào Website / LMS
              </h3>
              <p className="text-xs text-white/60">
                Gói câu hỏi: <strong className="text-blue-300">{currentPack.title}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 flex border-b border-white/10 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('iframe')}
            className={`pb-3 px-3 text-xs md:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'iframe'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" /> Mã nhúng iFrame (HTML)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('react')}
            className={`pb-3 px-3 text-xs md:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'react'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> React / Next.js Component
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`pb-3 px-3 text-xs md:text-sm font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'json'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" /> Dữ liệu JSON học liệu
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'iframe' && (
            <div className="space-y-4">
              <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                Sao chép đoạn mã dưới đây và dán trực tiếp vào bất kỳ website nào (WordPress, LMS, Notion, Blog, Web App) để hiển thị game:
              </p>

              {/* Customizer controls */}
              <div className="p-3.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex flex-wrap items-center gap-4 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white/80">Chiều cao iFrame:</span>
                  <input
                    type="number"
                    value={embedHeight}
                    onChange={(e) => setEmbedHeight(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white text-center focus:outline-none focus:border-blue-400"
                  />
                  <span>px</span>
                </div>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-xs text-blue-200 overflow-x-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleCopy(iframeSnippet, 'iframe')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition text-xs font-sans font-medium border border-white/10 backdrop-blur-md"
                >
                  {copiedKey === 'iframe' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'iframe' ? 'Đã sao chép!' : 'Copy Code'}</span>
                </button>
                <pre className="pt-6">{iframeSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === 'react' && (
            <div className="space-y-4">
              <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                Tích hợp trực tiếp dưới dạng component React nguyên bản. Có thể truyền prop <code>pack</code> tùy chỉnh từ database hoặc API của bạn:
              </p>

              <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-xs text-blue-200 overflow-x-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleCopy(reactSnippet, 'react')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition text-xs font-sans font-medium border border-white/10 backdrop-blur-md"
                >
                  {copiedKey === 'react' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'react' ? 'Đã sao chép!' : 'Copy Code'}</span>
                </button>
                <pre className="max-h-[300px] overflow-y-auto pt-6">{reactSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs md:text-sm text-white/80">
                  Cấu trúc dữ liệu chuẩn của gói học liệu (hỗ trợ 4 dạng câu hỏi: Điền từ, Phân loại, Ghép cặp, Sắp xếp).
                </p>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ml-2"
                >
                  <Download className="w-3.5 h-3.5" /> Tải .JSON
                </button>
              </div>

              <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-xs text-blue-200 overflow-x-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleCopy(jsonPackString, 'json')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition text-xs font-sans font-medium border border-white/10 backdrop-blur-md"
                >
                  {copiedKey === 'json' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'json' ? 'Đã sao chép!' : 'Copy JSON'}</span>
                </button>
                <pre className="max-h-[300px] overflow-y-auto pt-6">{jsonPackString}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
          <span className="text-xs text-white/60">
            Hỗ trợ cảm ứng điện thoại, máy tính bảng và kéo thả chuột trên máy tính.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};
