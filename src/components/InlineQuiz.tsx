import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCcw, Lightbulb, Sparkles } from "lucide-react";
import type { QuizQuestion } from "../data/types";
import { cn, shuffle } from "../lib/utils";
import { burst, celebrate } from "./reactbits/confetti";

interface Props {
  questions: QuizQuestion[];
  onAskAI?: (payload: { question: string; options: string[]; correct: number[]; user: number[] }) => void;
}

export default function InlineQuiz({ questions, onAskAI }: Props) {
  const [order, setOrder] = useState(() => shuffle(questions.map((_, i) => i)));
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[order[idx]];
  const isLast = idx === order.length - 1;

  const exact = useMemo(() => {
    if (!q) return false;
    const a = [...selected].sort().join(",");
    const b = [...q.correct].sort().join(",");
    return a === b;
  }, [selected, q]);

  function toggle(i: number) {
    if (checked) return;
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }

  function check() {
    if (!selected.length) return;
    setChecked(true);
    if (exact) {
      setScore((s) => s + 1);
      burst();
    }
  }

  function next() {
    if (isLast) {
      setFinished(true);
      celebrate();
      return;
    }
    setIdx((i) => i + 1);
    setSelected([]);
    setChecked(false);
  }

  function reset() {
    setOrder(shuffle(questions.map((_, i) => i)));
    setIdx(0);
    setSelected([]);
    setChecked(false);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="rounded-2xl glass p-8 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-semibold text-white">
          {pct}%
        </motion.div>
        <p className="mt-2 text-slate-400">
          {score} von {questions.length} Fragen vollständig richtig.
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          <RotateCcw className="h-4 w-4" /> Nochmals üben
        </button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
        <span>Frage {idx + 1} / {questions.length}</span>
        <span>Punkte: {score}</span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full bg-zhaw-light" animate={{ width: `${((idx + (checked ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <div className="rounded-2xl glass p-5 sm:p-6">
        <p className="text-base font-medium text-white">{q.question}</p>
        {q.difficulty && <span className="chip mt-2">{q.difficulty}</span>}

        <div className="mt-5 flex flex-col gap-2.5">
          {q.options.map((opt, i) => {
            const isSel = selected.includes(i);
            const isCorrect = q.correct.includes(i);
            const showState = checked;
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-all",
                  !showState && isSel && "border-zhaw-light/60 bg-zhaw/20",
                  !showState && !isSel && "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10",
                  showState && isCorrect && "border-emerald-400/60 bg-emerald-400/10",
                  showState && !isCorrect && isSel && "border-rose-400/60 bg-rose-400/10",
                  showState && !isCorrect && !isSel && "border-white/10 bg-white/5 opacity-70"
                )}
              >
                <span className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold",
                  isSel ? "border-zhaw-light bg-zhaw text-white" : "border-white/20 text-slate-400"
                )}>
                  {showState ? (isCorrect ? <Check className="h-3 w-3" /> : isSel ? <X className="h-3 w-3" /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-200">{opt}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {checked && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={cn("mt-4 rounded-xl border p-4 text-sm", exact ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-400/30 bg-amber-400/5")}>
                <div className={cn("mb-1 font-semibold", exact ? "text-emerald-300" : "text-amber-300")}>
                  {exact ? "Vollständig richtig!" : "Noch nicht ganz"}
                </div>
                <p className="text-slate-300">{q.explanation}</p>
                <div className="mt-2 text-xs text-slate-400">Richtig: {q.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!checked ? (
            <button onClick={check} disabled={!selected.length} className="btn-primary">
              Antwort prüfen
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              {isLast ? "Auswertung" : "Weiter"}
            </button>
          )}
          {onAskAI && checked && !exact && (
            <button
              onClick={() => onAskAI({ question: q.question, options: q.options, correct: q.correct, user: selected })}
              className="btn-ghost"
            >
              <Sparkles className="h-4 w-4" /> KI erklärt es mir
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500">
            <Lightbulb className="h-3.5 w-3.5" /> Mehrfachauswahl möglich
          </span>
        </div>
      </div>
    </div>
  );
}
