import type { Exam, LearningModule, SubjectId, TaskSet } from "./types";
import { SUBJECTS, getSubject } from "./registry";

export { SUBJECTS, getSubject, DEFAULT_SUBJECT } from "./registry";

const examFiles = import.meta.glob<{ default: Exam }>("./content/*/exams/*.json", { eager: true });
const moduleFiles = import.meta.glob<{ default: LearningModule }>("./content/*/modules/*.json", { eager: true });
const taskFiles = import.meta.glob<{ default: TaskSet }>("./content/*/tasks/*.json", { eager: true });

function unwrap<T>(mod: unknown): T {
  const raw = mod as Record<string, unknown>;
  return (raw.default ?? raw) as T;
}

function pathParts(path: string) {
  const seg = path.split("/");
  return { subject: seg[seg.length - 3] as SubjectId, file: seg[seg.length - 1] };
}

export const exams: Exam[] = Object.entries(examFiles)
  .map(([path, mod]) => unwrap<Exam>(mod))
  .filter((e) => e && Array.isArray(e.questions))
  .sort((a, b) => a.subjectId.localeCompare(b.subjectId) || a.label.localeCompare(b.label));

export const modules: LearningModule[] = Object.entries(moduleFiles)
  .map(([path, mod]) => {
    const m = unwrap<LearningModule>(mod);
    if (!m.subjectId) m.subjectId = pathParts(path).subject;
    return m;
  })
  .filter(Boolean)
  .sort((a, b) => a.subjectId.localeCompare(b.subjectId) || a.week.localeCompare(b.week));

export const taskSets: TaskSet[] = Object.entries(taskFiles)
  .map(([path, mod]) => {
    const t = unwrap<TaskSet>(mod);
    if (!t.subjectId) t.subjectId = pathParts(path).subject;
    return t;
  })
  .filter(Boolean)
  .sort((a, b) => a.subjectId.localeCompare(b.subjectId) || String(a.label).localeCompare(String(b.label)));

export function getExams(subjectId: SubjectId) {
  return exams.filter((e) => e.subjectId === subjectId);
}
export function getModules(subjectId: SubjectId) {
  return modules.filter((m) => m.subjectId === subjectId);
}
export function getTaskSets(subjectId: SubjectId) {
  return taskSets.filter((t) => t.subjectId === subjectId);
}
export function getModule(id: string) {
  return modules.find((m) => m.id === id);
}
export function getExam(id: string) {
  return exams.find((e) => e.id === id);
}
export function getTaskSet(id: string) {
  return taskSets.find((t) => t.id === id);
}

export interface SubjectContent {
  exams: Exam[];
  modules: LearningModule[];
  tasks: TaskSet[];
  questions: (Exam["questions"][number] & { examId: string; examLabel: string })[];
  flashcards: {
    id: string;
    moduleId: string;
    moduleTitle: string;
    week: string;
    front: string;
    back: string;
    tag?: string;
  }[];
}

export function getSubjectContent(subjectId: SubjectId): SubjectContent {
  const sExams = getExams(subjectId);
  const sModules = getModules(subjectId);
  const sTasks = getTaskSets(subjectId);
  return {
    exams: sExams,
    modules: sModules,
    tasks: sTasks,
    questions: sExams.flatMap((e) => e.questions.map((q) => ({ ...q, examId: e.id, examLabel: e.label }))),
    flashcards: sModules.flatMap((m) =>
      (m.flashcards ?? []).map((f, i) => ({
        id: `${m.id}-${i}`,
        moduleId: m.id,
        moduleTitle: m.title,
        week: m.week,
        ...f,
      }))
    ),
  };
}

export const subjectCounts = SUBJECTS.map((s) => ({
  ...s,
  exams: getExams(s.id).length,
  modules: getModules(s.id).length,
  tasks: getTaskSets(s.id).length,
}));
