export type QuestionType = 'fill_blank' | 'categorize' | 'matching' | 'ordering';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  instruction?: string;
  explanation?: string;
  hint?: string;
  points?: number;
}

// 1. Fill in the blanks question
// Text with markers like: "Nước sôi ở nhiệt độ [slot1] độ C và đóng băng ở [slot2] độ C."
export interface FillBlankSlot {
  id: string; // e.g. "slot1"
  correctAnswer: string; // token text
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank';
  templateText: string; // e.g., "Thủ đô của Việt Nam là [slot1], còn thành phố đông dân nhất là [slot2]."
  slots: FillBlankSlot[];
  options: string[]; // pool of draggable options (including distractors)
}

// 2. Categorize question
export interface CategoryBucket {
  id: string;
  name: string;
  description?: string;
  color?: string; // e.g., "blue", "emerald", "amber", "purple"
}

export interface CategoryItem {
  id: string;
  text: string;
  icon?: string;
  targetCategoryId: string;
}

export interface CategorizeQuestion extends BaseQuestion {
  type: 'categorize';
  categories: CategoryBucket[];
  items: CategoryItem[];
}

// 3. Matching question
export interface MatchPair {
  id: string;
  left: string; // e.g., "CPU"
  right: string; // e.g., "Bộ xử lý trung tâm"
  leftSubtext?: string;
  rightSubtext?: string;
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  pairs: MatchPair[];
  distractors?: string[]; // optional extra right-hand side items
}

// 4. Ordering sequence question
export interface OrderItem {
  id: string;
  text: string;
  detail?: string;
  correctPosition: number; // 0, 1, 2...
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  items: OrderItem[];
}

export type Question = FillBlankQuestion | CategorizeQuestion | MatchingQuestion | OrderingQuestion;

export interface QuestionPack {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Nâng cao';
  icon: string;
  color: string;
  questions: Question[];
}

export interface GameSettings {
  soundEnabled: boolean;
  timerEnabled: boolean;
  timePerQuestion: number; // in seconds, 0 = unlimited
  instantFeedback: boolean; // if true, checks right after drag/submit, else only at the end
  allowRetry: boolean;
  shuffleQuestions: boolean;
  themeColor: 'indigo' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan';
}

export interface QuestionResult {
  questionId: string;
  isCorrect: boolean;
  userScore: number;
  maxScore: number;
  timeSpent: number; // seconds
  userAnswers: any;
}

export interface GameState {
  currentQuestionIndex: number;
  score: number;
  streak: number;
  maxStreak: number;
  lives?: number;
  isFinished: boolean;
  isAnswerSubmitted: boolean;
  isCurrentAnswerCorrect?: boolean;
  results: QuestionResult[];
  startedAt: number;
}
