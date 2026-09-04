import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QuestionPack,
  Question,
  FillBlankQuestion,
  CategorizeQuestion,
  MatchingQuestion,
  OrderingQuestion,
  QuestionType,
} from '../../types';
import {
  X,
  Plus,
  Trash2,
  Save,
  FileText,
  FolderPlus,
  Link,
  ListOrdered,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSavePack: (pack: QuestionPack) => void;
  initialPack?: QuestionPack | null;
}

export const PackEditorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSavePack,
  initialPack,
}) => {
  const [packTitle, setPackTitle] = useState<string>(initialPack?.title || 'Bộ học liệu tự tạo');
  const [packCategory, setPackCategory] = useState<string>(initialPack?.category || 'Tổng hợp');
  const [packDesc, setPackDesc] = useState<string>(initialPack?.description || 'Bộ câu hỏi kéo thả tương tác rèn luyện kiến thức.');
  const [packDifficulty, setPackDifficulty] = useState<'Dễ' | 'Trung bình' | 'Nâng cao'>(initialPack?.difficulty || 'Trung bình');

  const [questions, setQuestions] = useState<Question[]>(
    initialPack?.questions || [
      {
        id: `q-${Date.now()}-1`,
        type: 'fill_blank',
        title: 'Điền từ còn thiếu vào câu',
        instruction: 'Kéo thả từ thích hợp vào các vị trí trống trong câu.',
        templateText: 'Mặt trời mọc ở hướng [slot1] và lặn ở hướng [slot2].',
        slots: [
          { id: 'slot1', correctAnswer: 'Đông' },
          { id: 'slot2', correctAnswer: 'Tây' },
        ],
        options: ['Đông', 'Tây', 'Nam', 'Bắc'],
        hint: 'Hướng mặt trời mọc vào buổi sáng là phía Đông.',
        explanation: 'Quy luật tự nhiên: Mặt trời mọc ở hướng Đông, lặn ở hướng Tây.',
        points: 10,
      },
    ]
  );

  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentQ = questions[selectedQuestionIndex];

  const handleAddQuestion = (type: QuestionType) => {
    let newQ: Question;
    const qId = `q-${Date.now()}-${questions.length + 1}`;

    if (type === 'fill_blank') {
      newQ = {
        id: qId,
        type: 'fill_blank',
        title: 'Điền từ vào chỗ trống',
        instruction: 'Kéo các từ vào vị trí thích hợp.',
        templateText: 'Hà Nội là thủ đô của [slot1].',
        slots: [{ id: 'slot1', correctAnswer: 'Việt Nam' }],
        options: ['Việt Nam', 'Lào', 'Campuchia', 'Thái Lan'],
        points: 10,
        hint: 'Tên đất nước thân yêu hình chữ S.',
        explanation: 'Hà Nội là thủ đô ngàn năm văn hiến của Việt Nam.',
      };
    } else if (type === 'categorize') {
      newQ = {
        id: qId,
        type: 'categorize',
        title: 'Phân loại các mục vào nhóm',
        instruction: 'Kéo thả từng mục vào đúng nhóm tương ứng.',
        categories: [
          { id: 'cat-1', name: 'Nhóm A', color: 'indigo' },
          { id: 'cat-2', name: 'Nhóm B', color: 'emerald' },
        ],
        items: [
          { id: 'item-1', text: 'Mục 1', targetCategoryId: 'cat-1' },
          { id: 'item-2', text: 'Mục 2', targetCategoryId: 'cat-2' },
        ],
        points: 15,
      };
    } else if (type === 'matching') {
      newQ = {
        id: qId,
        type: 'matching',
        title: 'Ghép cặp khái niệm tương ứng',
        instruction: 'Nối các cặp tương ứng giữa 2 cột.',
        pairs: [
          { id: 'p1', left: 'Khái niệm A', right: 'Định nghĩa A' },
          { id: 'p2', left: 'Khái niệm B', right: 'Định nghĩa B' },
        ],
        points: 15,
      };
    } else {
      newQ = {
        id: qId,
        type: 'ordering',
        title: 'Sắp xếp theo thứ tự đúng',
        instruction: 'Kéo thả để sắp xếp các bước từ trước đến sau.',
        items: [
          { id: 'ord-1', text: 'Bước 1: Bắt đầu', correctPosition: 0 },
          { id: 'ord-2', text: 'Bước 2: Thực hiện', correctPosition: 1 },
          { id: 'ord-3', text: 'Bước 3: Hoàn thành', correctPosition: 2 },
        ],
        points: 15,
      };
    }

    setQuestions([...questions, newQ]);
    setSelectedQuestionIndex(questions.length);
  };

  const handleUpdateCurrentQuestion = (updated: Partial<Question>) => {
    const nextList = [...questions];
    nextList[selectedQuestionIndex] = {
      ...nextList[selectedQuestionIndex],
      ...updated,
    } as Question;
    setQuestions(nextList);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const nextList = questions.filter((_, idx) => idx !== index);
    setQuestions(nextList);
    setSelectedQuestionIndex(Math.max(0, index - 1));
  };

  const handleSave = () => {
    const finalPack: QuestionPack = {
      id: initialPack?.id || `pack-custom-${Date.now()}`,
      title: packTitle,
      category: packCategory,
      description: packDesc,
      difficulty: packDifficulty,
      icon: 'Layers',
      color: 'indigo',
      questions,
    };
    onSavePack(finalPack);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-5xl bg-[#0a0a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col h-[90vh] text-white"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                Soạn & Tùy biến Bộ Câu Hỏi Kéo Thả
              </h3>
              <p className="text-xs text-white/60">
                Tạo gói học liệu kéo thả tương tác cho học sinh, sinh viên hoặc người học trên website của bạn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 text-white text-xs md:text-sm font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition border border-white/20"
            >
              <Save className="w-4 h-4" /> Lưu & Dùng ngay
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Pack Meta & Question List */}
          <div className="w-full md:w-72 border-r border-white/10 p-4 overflow-y-auto flex flex-col gap-4 bg-white/5 backdrop-blur-md shrink-0">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-blue-300/80">Tên gói học liệu</label>
              <input
                type="text"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-xl font-semibold text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                placeholder="VD: Từ vựng Toeic cơ bản"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Chủ đề</label>
                <input
                  type="text"
                  value={packCategory}
                  onChange={(e) => setPackCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Độ khó</label>
                <select
                  value={packDifficulty}
                  onChange={(e) => setPackDifficulty(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                >
                  <option value="Dễ" className="bg-slate-900 text-white">Dễ</option>
                  <option value="Trung bình" className="bg-slate-900 text-white">Trung bình</option>
                  <option value="Nâng cao" className="bg-slate-900 text-white">Nâng cao</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-blue-300/80">
                Câu hỏi ({questions.length})
              </span>
            </div>

            {/* Questions Tabs */}
            <div className="space-y-1.5 flex-1">
              {questions.map((q, idx) => {
                const isSelected = selectedQuestionIndex === idx;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestionIndex(idx)}
                    className={`p-2.5 rounded-2xl text-xs font-semibold cursor-pointer flex items-center justify-between border transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-white/40 shadow-md'
                        : 'bg-white/5 text-white/80 border-white/10 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold opacity-75">#{idx + 1}</span>
                      <span className="truncate">{q.title || 'Câu hỏi chưa đặt tên'}</span>
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="p-1 rounded-md hover:bg-white/20 transition text-white/60 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Question Buttons */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-bold text-white/60 uppercase">Thêm dạng câu hỏi mới:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('fill_blank')}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-blue-400 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Điền từ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('categorize')}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-green-400 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-green-400" />
                  <span>Phân loại</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('matching')}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-amber-400 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Link className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ghép cặp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('ordering')}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:border-rose-400 hover:bg-white/10 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sắp xếp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Main Area: Edit Current Question Fields */}
          {currentQ && (
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-white/80">Tiêu đề câu hỏi</label>
                  <input
                    type="text"
                    value={currentQ.title}
                    onChange={(e) => handleUpdateCurrentQuestion({ title: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-xl font-semibold text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">Điểm số</label>
                  <input
                    type="number"
                    value={currentQ.points || 10}
                    onChange={(e) => handleUpdateCurrentQuestion({ points: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-xl font-semibold text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Specific Field Editors per type */}
              {currentQ.type === 'fill_blank' && (
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4 backdrop-blur-xl">
                  <div className="text-xs font-bold uppercase text-blue-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Cấu hình câu điền từ (Fill in the blanks)
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/80">
                      Đoạn văn có vị trí trống (Dùng cú pháp [slot1], [slot2], [slot3]...)
                    </label>
                    <textarea
                      rows={3}
                      value={currentQ.templateText}
                      onChange={(e) => handleUpdateCurrentQuestion({ templateText: e.target.value })}
                      className="w-full p-3 text-sm font-mono bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">
                      Danh sách từ đáp án khả dụng (phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={currentQ.options.join(', ')}
                      onChange={(e) => {
                        const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                        handleUpdateCurrentQuestion({ options: opts });
                      }}
                      className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-white/80">
                      Cặp Slot ID & Đáp án chuẩn:
                    </div>
                    {currentQ.slots.map((slot, sIdx) => (
                      <div key={slot.id} className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold w-16 text-blue-300">[{slot.id}]:</span>
                        <input
                          type="text"
                          value={slot.correctAnswer}
                          onChange={(e) => {
                            const newSlots = [...currentQ.slots];
                            newSlots[sIdx] = { ...slot, correctAnswer: e.target.value };
                            handleUpdateCurrentQuestion({ slots: newSlots });
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQ.type === 'categorize' && (
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4 backdrop-blur-xl">
                  <div className="text-xs font-bold uppercase text-green-400 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4" /> Cấu hình các nhóm & mục phân loại
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-white/80">
                      Các nhóm/hộp phân loại:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentQ.categories.map((cat, cIdx) => (
                        <input
                          key={cat.id}
                          type="text"
                          value={cat.name}
                          onChange={(e) => {
                            const nextCats = [...currentQ.categories];
                            nextCats[cIdx] = { ...cat, name: e.target.value };
                            handleUpdateCurrentQuestion({ categories: nextCats });
                          }}
                          className="px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl font-medium text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                          placeholder="Tên nhóm..."
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-white/80">
                      Các mục kéo thả và nhóm đích:
                    </div>
                    {currentQ.items.map((item, iIdx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const nextItems = [...currentQ.items];
                            nextItems[iIdx] = { ...item, text: e.target.value };
                            handleUpdateCurrentQuestion({ items: nextItems });
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        />
                        <select
                          value={item.targetCategoryId}
                          onChange={(e) => {
                            const nextItems = [...currentQ.items];
                            nextItems[iIdx] = { ...item, targetCategoryId: e.target.value };
                            handleUpdateCurrentQuestion({ items: nextItems });
                          }}
                          className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        >
                          {currentQ.categories.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQ.type === 'matching' && (
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4 backdrop-blur-xl">
                  <div className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <Link className="w-4 h-4" /> Cấu hình các cặp ghép tương ứng
                  </div>
                  <div className="space-y-2">
                    {currentQ.pairs.map((pair, pIdx) => (
                      <div key={pair.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pair.left}
                          onChange={(e) => {
                            const nextPairs = [...currentQ.pairs];
                            nextPairs[pIdx] = { ...pair, left: e.target.value };
                            handleUpdateCurrentQuestion({ pairs: nextPairs });
                          }}
                          placeholder="Thẻ bên trái"
                          className="flex-1 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        />
                        <span className="text-xs text-white/50">➜</span>
                        <input
                          type="text"
                          value={pair.right}
                          onChange={(e) => {
                            const nextPairs = [...currentQ.pairs];
                            nextPairs[pIdx] = { ...pair, right: e.target.value };
                            handleUpdateCurrentQuestion({ pairs: nextPairs });
                          }}
                          placeholder="Thẻ bên phải tương ứng"
                          className="flex-1 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentQ.type === 'ordering' && (
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-4 backdrop-blur-xl">
                  <div className="text-xs font-bold uppercase text-rose-400 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4" /> Cấu hình các bước sắp xếp thứ tự
                  </div>
                  <div className="space-y-2">
                    {currentQ.items.map((item, oIdx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-12 text-white/60">#{oIdx + 1}:</span>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const nextItems = [...currentQ.items];
                            nextItems[oIdx] = { ...item, text: e.target.value };
                            handleUpdateCurrentQuestion({ items: nextItems });
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hints and Explanations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Gợi ý câu hỏi (Hint)</label>
                  <input
                    type="text"
                    value={currentQ.hint || ''}
                    onChange={(e) => handleUpdateCurrentQuestion({ hint: e.target.value })}
                    placeholder="Mẹo nhỏ khi gặp khó khăn..."
                    className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/80">Giải thích chi tiết (Explanation)</label>
                  <input
                    type="text"
                    value={currentQ.explanation || ''}
                    onChange={(e) => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                    placeholder="Giải thích sau khi học sinh nộp bài..."
                    className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
