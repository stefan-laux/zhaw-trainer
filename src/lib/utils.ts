import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function gradeFromPoints(points: number, max = 90) {
  const pct = max > 0 ? points / max : 0;
  const note = 1 + 5 * pct;
  return Math.max(1, Math.min(6, Math.round(note * 100) / 100));
}

export function noteColor(note: number) {
  if (note >= 5.5) return "text-emerald-400";
  if (note >= 5) return "text-teal-300";
  if (note >= 4) return "text-sky-300";
  if (note >= 3) return "text-amber-300";
  return "text-rose-400";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
