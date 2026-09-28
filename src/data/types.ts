export type SubjectId = "wr" | "wins" | "bwl" | "swe1" | "wischr";

export type QuestionType = "multi" | "single" | "truefalse" | "open";
export type Scoring = "penalty" | "exact" | "mixed";

export interface ExamOption {
  label: string;
  text: string;
}

export interface ExamQuestion {
  number: number;
  type: QuestionType;
  title?: string;
  scenario?: string;
  prompt: string;
  options: ExamOption[];
  correct: string[];
  points: number;
  explanation?: string;
  modelAnswer?: string;
  source?: string;
  aiGenerated?: boolean;
  confidence?: string;
}

export interface Exam {
  id: string;
  subjectId: SubjectId;
  year: string;
  label: string;
  minutes: number;
  maxPoints: number;
  scoring: Scoring;
  questions: ExamQuestion[];
}

export interface ModuleArticle {
  ref: string;
  text: string;
}

export interface ModuleBlock {
  title: string;
  body: string;
  bullets?: string[];
  articles?: ModuleArticle[];
  type?: string;
}

export interface KeyTerm {
  term: string;
  definition: string;
  article?: string;
}

export interface FlashcardSeed {
  front: string;
  back: string;
  tag?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number[];
  explanation: string;
  difficulty?: string;
}

export interface LearningModule {
  id: string;
  subjectId: SubjectId;
  week: string;
  title: string;
  tagline: string;
  summary: string;
  learningGoals: string[];
  blocks: ModuleBlock[];
  keyTerms: KeyTerm[];
  flashcards: FlashcardSeed[];
  quiz: QuizQuestion[];
}

export interface PracticeTask {
  number: number;
  title: string;
  points: number;
  task: string;
  solution: string;
  hints?: string;
}

export interface TaskSet {
  id: string;
  subjectId: SubjectId;
  year: string;
  label: string;
  minutes: number;
  maxPoints: number;
  tasks: PracticeTask[];
}

export interface SlideResource {
  id: string;
  subjectId: SubjectId;
  week: string;
  title: string;
  url: string;
  storagePath?: string;
  uploadedBy?: string;
  createdAt?: string;
}

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  short: string;
  code: string;
  accent: string;
  description: string;
  examKind: "auto" | "mixed" | "tasks" | "none";
  hasExams: boolean;
  hasModules: boolean;
  hasTasks: boolean;
}
