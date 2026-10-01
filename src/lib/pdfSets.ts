import type { RunnerQuestion } from "../pages/ExamRunner";

export interface PdfSet {
  code: string;
  subjectId: string;
  examId: string;
  label: string;
  createdAt: number;
  questions: RunnerQuestion[];
}

const KEY = "zhaw-pdf-sets";

export function loadSets(): PdfSet[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSet(set: PdfSet) {
  const all = loadSets().filter((s) => s.code !== set.code);
  all.unshift(set);
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 40)));
  } catch {
    /* ignore quota */
  }
}

export function getSet(code: string): PdfSet | undefined {
  return loadSets().find((s) => s.code === code);
}

export function newCode(): string {
  const part = () => Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${part()}-${part()}`;
}
