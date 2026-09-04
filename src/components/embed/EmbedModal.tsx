import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  Terminal,
  ExternalLink,
  Sparkles,
  Radio,
  BookOpen,
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
}) => {
  const [activeTab, setActiveTab] = useState<'iframe' | 'api' | 'github' | 'react' | 'json'>('iframe');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [embedHeight, setEmbedHeight] = useState<number>(650);

  // Compute the current detected origin & base path (supports GitHub Pages subpath e.g. /my-repo/)
  const getDetectedBaseUrl = () => {
    if (typeof window === 'undefined') return 'https://username.github.io/my-game-repo';
    const origin = window.location.origin;
    // Strip trailing index.html and trailing slashes
    const pathname = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return `${origin}${pathname}`;
  };

  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && !customBaseUrl) {
      setCustomBaseUrl(getDetectedBaseUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveBaseUrl = customBaseUrl.trim() || getDetectedBaseUrl();
  const iframeUrl = `${effectiveBaseUrl.replace(/\/+$/, '')}/?pack=${currentPack.id}&embedded=true`;

  const iframeSnippet = `<!-- 1. Thẻ iFrame nhúng Game vào Project khác / Website / LMS -->
<div style="position: relative; width: 100%; max-width: 900px; margin: 0 auto;">
  <iframe
    id="edudrop-game-frame"
    src="${iframeUrl}"
    width="100%"
    height="${embedHeight}px"
    frameborder="0"
    style="border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.3); overflow: hidden;"
    allow="autoplay"
  ></iframe>
</div>`;

  const postMessageSnippet = `// 2. Lắng nghe Điểm số & Kết quả học sinh trong Project của bạn:
window.addEventListener('message', function (event) {
  // Lọc chỉ nhận sự kiện từ EduDrop Game
  if (!event.data || !event.data.type) return;

  // Khi học sinh hoàn thành toàn bộ bài tập:
  if (event.data.type === 'EDUDROP_QUIZ_COMPLETE') {
    console.log('🎉 Hoàn thành bài quiz:', event.data.packTitle);
    console.log('Điểm đạt được:', event.data.score + ' / ' + event.data.maxScore);
    console.log('Tỷ lệ đúng:', event.data.percentage + '%');
    console.log('Thời gian làm bài:', event.data.totalTimeSeconds + ' giây');
    console.log('Chi tiết từng câu:', event.data.results);

    // TODO: Gửi điểm về Backend API / Database của project bạn:
    // fetch('/api/save-score', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event.data)
    // });
  }

  // Khi học sinh trả lời xong 1 câu (real-time tracking):
  if (event.data.type === 'EDUDROP_QUESTION_ANSWERED') {
    console.log('Câu hỏi số:', event.data.questionIndex + 1);
    console.log('Trả lời đúng?:', event.data.isCorrect);
    console.log('Điểm cộng:', event.data.pointsEarned);
  }
});

// 3. (Tùy chọn) Điều khiển game từ xa từ Project chính:
function restartEduDropGame() {
  const frame = document.getElementById('edudrop-game-frame');
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage({ type: 'EDUDROP_RESTART' }, '*');
  }
}`;

  const reactSnippet = `// 1. Cài đặt thư viện:
// npm install motion lucide-react canvas-confetti

// 2. Nhúng trực tiếp vào Component React / Next.js:
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl bg-[#0a0a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Tích hợp Game vào Website & Deploy GitHub Pages
              </h3>
              <p className="text-xs text-white/60">
                Gói học liệu: <strong className="text-blue-300">{currentPack.title}</strong>
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
        <div className="px-6 pt-3 flex border-b border-white/10 gap-1.5 overflow-x-auto text-xs md:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('iframe')}
            className={`pb-3 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'iframe'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" /> Mã nhúng iFrame
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`pb-3 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" /> Nhận điểm (postMessage API)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'github'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4 text-amber-400" /> Cách Deploy GitHub Pages
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('react')}
            className={`pb-3 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'react'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> React Component
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`pb-3 px-3 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-blue-400 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" /> File JSON
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'iframe' && (
            <div className="space-y-4">
              <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                Dán URL deploy GitHub Pages của bạn vào ô dưới đây (hoặc dùng URL mặc định). Mã iFrame bên dưới sẽ tự động cập nhật để bạn copy nhúng vào bất kỳ project nào:
              </p>

              {/* Custom URL & Height inputs */}
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 space-y-3 text-xs text-white/80">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-white/90 whitespace-nowrap">URL Game đã deploy:</span>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="https://<username>.github.io/<tên-repo>"
                    className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-xl text-xs text-blue-200 placeholder-white/40 focus:outline-none focus:border-blue-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomBaseUrl(getDetectedBaseUrl())}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-medium text-white/70 transition shrink-0"
                  >
                    Reset URL
                  </button>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white/80">Chiều cao iFrame:</span>
                    <input
                      type="number"
                      value={embedHeight}
                      onChange={(e) => setEmbedHeight(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs text-white text-center focus:outline-none focus:border-blue-400"
                    />
                    <span>px</span>
                  </div>
                  <span className="text-[11px] text-white/50">
                    💡 Tham số <code>&embedded=true</code> sẽ ẩn thanh điều hướng ngoài, chỉ hiển thị game toàn màn hình.
                  </span>
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

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                <strong className="text-emerald-300 block mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Tự động giao tiếp giữa Game và Project chính (Cross-Origin postMessage):
                </strong>
                Khi học sinh trả lời hoặc hoàn thành bài quiz trong iFrame, game sẽ gửi tin nhắn <code>postMessage</code> đến cửa sổ cha. Project chính của bạn có thể hứng sự kiện này để lưu điểm vào cơ sở dữ liệu của bạn ngay lập tức!
              </div>

              <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 font-mono text-xs text-emerald-200 overflow-x-auto shadow-inner">
                <button
                  type="button"
                  onClick={() => handleCopy(postMessageSnippet, 'api')}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition text-xs font-sans font-medium border border-white/10 backdrop-blur-md"
                >
                  {copiedKey === 'api' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'api' ? 'Đã sao chép!' : 'Copy JS Code'}</span>
                </button>
                <pre className="pt-6 leading-relaxed max-h-[340px] overflow-y-auto">{postMessageSnippet}</pre>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
                Dự án đã được cấu hình đường dẫn tương đối <code>base: &apos;./&apos;</code> trong <code>vite.config.ts</code> và đã có sẵn file tự động deploy GitHub Actions <code>.github/workflows/deploy.yml</code>. Bạn chỉ cần thực hiện 3 bước sau:
              </div>

              <div className="space-y-3 text-xs text-white/80">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-xs">1</span>
                    Đẩy code lên GitHub Repository của bạn
                  </div>
                  <p className="text-white/60 pl-7">
                    Khởi tạo git và push code lên kho GitHub của bạn (ví dụ branch <code>main</code>):
                  </p>
                  <pre className="ml-7 p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-blue-200 overflow-x-auto">
{`git init
git add .
git commit -m "Deploy EduDrop game"
git branch -M main
git remote add origin https://github.com/<tên-bạn>/<tên-repo>.git
git push -u origin main`}
                  </pre>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-xs">2</span>
                    Bật GitHub Pages trong Settings của Repo
                  </div>
                  <p className="text-white/60 pl-7 leading-relaxed">
                    Vào GitHub của bạn &rarr; <strong>Settings</strong> &rarr; mục <strong>Pages</strong> (ở cột bên trái).<br />
                    Tại phần <strong>Build and deployment</strong>:
                  </p>
                  <div className="ml-7 p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                    <p className="text-emerald-300 font-semibold">
                      Cách khuyên dùng (Tự động 100%):
                    </p>
                    <p className="text-white/70">
                      Chọn <strong>Source: GitHub Actions</strong>. GitHub sẽ tự động đọc file <code>.github/workflows/deploy.yml</code> có sẵn và deploy hoàn tất trong vòng 1 phút!
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center text-xs">3</span>
                    Lấy link và sử dụng trong project khác
                  </div>
                  <p className="text-white/60 pl-7 leading-relaxed">
                    Link GitHub Pages của bạn sẽ có dạng:<br />
                    <code className="text-amber-300 font-mono">https://&lt;username&gt;.github.io/&lt;tên-repo&gt;/</code><br />
                    Copy link đó và dán vào tab <strong>&quot;Mã nhúng iFrame&quot;</strong> để nhúng vào bất kỳ trang web nào!
                  </p>
                </div>
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
