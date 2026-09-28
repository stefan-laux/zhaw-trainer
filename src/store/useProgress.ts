import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayKey } from "../lib/utils";

export interface ExamResult {
  examId: string;
  date: string;
  points: number;
  maxPoints: number;
  note: number;
  correct: number;
  partial: number;
  wrong: number;
  total: number;
  durationSec: number;
}

export interface CardState {
  ease: number;
  interval: number;
  due: string;
  reps: number;
  lapses: number;
  learned: boolean;
}

export interface QuestionStat {
  attempts: number;
  correct: number;
  lastWrong: boolean;
}

interface ProgressState {
  name: string;
  results: ExamResult[];
  moduleViewed: Record<string, string[]>;
  moduleCompleted: string[];
  cards: Record<string, CardState>;
  questionStats: Record<string, QuestionStat>;
  answerOverrides: Record<string, string[]>;
  aiModel: string;
  setModel: (m: string) => void;
  setName: (n: string) => void;
  addResult: (r: ExamResult) => void;
  markBlockViewed: (moduleId: string, blockIdx: number) => void;
  toggleModuleCompleted: (moduleId: string) => void;
  gradeCard: (cardId: string, grade: "again" | "hard" | "good" | "easy") => void;
  recordQuestion: (qid: string, correct: boolean) => void;
  setOverride: (qid: string, correct: string[]) => void;
  clearOverride: (qid: string) => void;
  resetAll: () => void;
  resetCards: () => void;
}

const DAY = 86400000;

function plusDays(days: number) {
  return new Date(Date.now() + days * DAY).toISOString();
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      name: "",
      results: [],
      moduleViewed: {},
      moduleCompleted: [],
      cards: {},
      questionStats: {},
      answerOverrides: {},
      aiModel: "openai/gpt-4o-mini",
      setModel: (aiModel) => set({ aiModel }),
      setName: (name) => set({ name }),
      addResult: (r) => set({ results: [r, ...get().results].slice(0, 100) }),
      markBlockViewed: (moduleId, blockIdx) => {
        const cur = get().moduleViewed[moduleId] ?? [];
        if (!cur.includes(String(blockIdx))) {
          set({ moduleViewed: { ...get().moduleViewed, [moduleId]: [...cur, String(blockIdx)] } });
        }
      },
      toggleModuleCompleted: (moduleId) => {
        const c = get().moduleCompleted;
        set({
          moduleCompleted: c.includes(moduleId) ? c.filter((x) => x !== moduleId) : [...c, moduleId],
        });
      },
      gradeCard: (cardId, grade) => {
        const prev = get().cards[cardId] ?? { ease: 2.5, interval: 0, due: new Date().toISOString(), reps: 0, lapses: 0, learned: false };
        let { ease, interval, reps, lapses } = prev;
        if (grade === "again") {
          ease = Math.max(1.3, ease - 0.2);
          interval = 0;
          lapses += 1;
        } else {
          const factor = grade === "hard" ? 1.2 : grade === "good" ? 2.4 : 3.1;
          if (reps === 0) interval = grade === "hard" ? 1 : grade === "good" ? 2 : 4;
          else interval = Math.max(1, Math.round(interval * factor * (ease / 2.5)));
          if (grade === "hard") ease = Math.max(1.3, ease - 0.1);
          if (grade === "easy") ease = Math.min(3.2, ease + 0.1);
          reps += 1;
        }
        set({
          cards: {
            ...get().cards,
            [cardId]: { ease, interval, due: plusDays(interval), reps, lapses, learned: reps > 0 },
          },
        });
      },
      recordQuestion: (qid, correct) => {
        const prev = get().questionStats[qid] ?? { attempts: 0, correct: 0, lastWrong: false };
        set({
          questionStats: {
            ...get().questionStats,
            [qid]: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0), lastWrong: !correct },
          },
        });
      },
      setOverride: (qid, correct) =>
        set({ answerOverrides: { ...get().answerOverrides, [qid]: correct } }),
      clearOverride: (qid) => {
        const rest = { ...get().answerOverrides };
        delete rest[qid];
        set({ answerOverrides: rest });
      },
      resetAll: () =>
        set({ results: [], moduleViewed: {}, moduleCompleted: [], cards: {}, questionStats: {}, answerOverrides: {} }),
      resetCards: () => set({ cards: {} }),
    }),
    { name: "wr-trainer-progress", version: 2 }
  )
);

export function isDue(card: CardState | undefined, ref = Date.now()) {
  if (!card) return true;
  return new Date(card.due).getTime() <= ref;
}

export function streakFromResults(results: ExamResult[]) {
  const daysDone = new Set(results.map((r) => r.date.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  while (daysDone.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export { todayKey };
