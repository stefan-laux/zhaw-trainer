import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronLeft, ChevronRight, Flag, Grid3X3, Send, AlertTriangle, X, PenLine } from "lucide-react";
import { getExam, getSubjectContent } from "../data";
import type { SubjectId } from "../data/types";
import { useProgress } from "../store/useProgress";
import { cn, formatTime, shuffle } from "../lib/utils";
import type { ExamQuestion } from "../data/types";

export interface RunnerQuestion extends ExamQuestion {
  qid: string;
  examId: string;
}

export type AnswerMap = Record<string, string[]>;
export type TextMap = Record<string, string>;

function buildExamQuestions(examId: string): RunnerQuestion[] {
  const exam = getExam(examId);
  if (!exam) return [];
  return exam.questions.map((q) => ({ ...q, qid: `${exam.id}-${q.number}`, examId: exam.id }));
}

function buildCustom(subject: SubjectId, count: number, doShuffle: boolean): RunnerQuestion[] {
  const pool = getSubjectContent(subject).questions;
  const list = doShuffle ? shuffle(pool) : pool;
  return list.slice(0, Math.max(1, Math.min(count, pool.length))).map((q) => ({ ...q, qid: `${q.examId}-${q.number}`, examId: q.examId }));
}

export default function ExamRunner() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { addResult, recordQuestion, answerOverrides } = useProgress();

  const isCustom = id === "custom";
  const customSubject = (params.get("subject") as SubjectId) || "wr";
  const count = Number(params.get("count") ?? 20);
  const doShuffle = params.get("shuffle") === "true";
  const exam = isCustom ? null : getExam(id!);

  const questions = useMemo(
    () => (isCustom ? buildCustom(customSubject, count, doShuffle) : buildExamQuestions(id!)),
    [id, isCustom, customSubject, count, doShuffle]
  );
  const minutes = exam?.minutes ?? Number(params.get("minutes") ?? 90);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [texts, setTexts] = useState<TextMap>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [showNav, setShowNav] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const submitted = useRef(false);
  const submitRef = useRef<(auto?: boolean) => void>(() => {});

  const current = questions[index];
  const answeredCount = questions.filter((q) => (answers[q.qid]?.length ?? 0) > 0 || (texts[q.qid]?.trim().length ?? 0) > 0).length;

  const submit = useCallback(
    (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;

      let autoPoints = 0;
      let openPoints = 0;
      let correctCount = 0;
      let partialCount = 0;
      let wrongCount = 0;
      const perQuestion = questions.map((q) => {
        const sel = answers[q.qid] ?? [];
        const truth = answerOverrides[q.qid] ?? q.correct;
        if (q.type === "open") {
          openPoints += q.points;
          return { qid: q.qid, selected: sel, points: 0, maxPoints: q.points, errors: 0, isOpen: true, selfScore: null as number | null };
        }
        let pts = 0;
        let exact = false;
        if (q.type === "multi") {
          let errors = 0;
          for (const o of q.options) {
            const isSel = sel.includes(o.label);
            const isTrue = truth.includes(o.label);
            if (isSel !== isTrue) errors += 1;
          }
          const perError = q.points / Math.max(1, q.options.length);
          pts = Math.max(0, q.points - perError * errors);
          exact = sel.length > 0 && errors === 0;
        } else {
          exact = sel.length > 0 && [...sel].sort().join(",") === [...truth].sort().join(",");
          pts = exact ? q.points : 0;
        }
        autoPoints += pts;
        if (exact) correctCount += 1;
        else if (pts > 0) partialCount += 1;
        else wrongCount += 1;
        recordQuestion(q.qid, exact);
        return { qid: q.qid, selected: sel, points: pts, maxPoints: q.points, errors: 0, isOpen: false, selfScore: null as number | null };
      });

      const maxPoints = questions.reduce((a, q) => a + q.points, 0);
      const duration = minutes * 60 - timeLeft;
      const submission = {
        examId: id!,
        subjectId: isCustom ? customSubject : exam!.subjectId,
        label: isCustom ? "Zufallsprüfung" : exam!.label,
        auto,
        autoPoints,
        openPoints,
        maxPoints,
        note: 1,
        correct: correctCount,
        partial: partialCount,
        wrong: wrongCount,
        total: questions.length,
        durationSec: duration,
        perQuestion,
        questions,
        answers,
        texts,
        selfScores: {} as Record<string, number | null>,
      };
      submission.note = Math.max(1, Math.min(6, 1 + 5 * (autoPoints / maxPoints)));
      sessionStorage.setItem("zhaw-last-submission", JSON.stringify(submission));
      navigate(`/pruefung/${id}/resultat`);
    },
    [answers, texts, questions, answerOverrides, navigate, id, minutes, timeLeft, recordQuestion, isCustom, customSubject, exam]
  );

  submitRef.current = submit;

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submitRef.current(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) {
    return (
      <div className="py-20 text-center text-slate-400">
        Prüfung nicht gefunden.
        <button onClick={() => navigate("/pruefung")} className="btn-ghost mx-auto mt-4 block">Zurück</button>
      </div>
    );
  }

  function toggle(label: string) {
    setAnswers((a) => {
      const cur = a[current.qid] ?? [];
      const single = current.type === "single" || current.type === "truefalse";
      const next = single ? [label] : cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label];
      return { ...a, [current.qid]: next };
    });
  }

  function toggleFlag() {
    setFlags((f) => {
      const n = new Set(f);
      n.has(current.qid) ? n.delete(current.qid) : n.add(current.qid);
      return n;
    });
  }

  const lowTime = timeLeft < 5 * 60;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sticky top-0 z-10 -mx-4 mb-6 panel border-b border-amber-100/10 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => navigate("/pruefung")} className="btn-ghost !px-3 !py-1.5 text-xs"><X className="h-4 w-4" /> Abbrechen</button>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:block">{answeredCount}/{questions.length} beantwortet</span>
            <div className={cn("flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold tabular-nums", lowTime ? "animate-pulse border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-amber-100/10 bg-white/5 text-white")}>
              <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
            </div>
            <button onClick={() => setShowNav((s) => !s)} className="btn-ghost !px-3 !py-1.5 text-xs"><Grid3X3 className="h-4 w-4" /> <span className="hidden sm:inline">Übersicht</span></button>
          </div>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-zhaw to-zhaw-light" animate={{ width: `${((index + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <AnimatePresence>
        {showNav && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="rounded-2xl glass p-4">
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                {questions.map((q, i) => {
                  const ans = (answers[q.qid]?.length ?? 0) > 0 || (texts[q.qid]?.trim().length ?? 0) > 0;
                  const flagged = flags.has(q.qid);
                  return (
                    <button key={q.qid} onClick={() => { setIndex(i); setShowNav(false); }} className={cn("relative flex h-9 items-center justify-center rounded-lg border text-xs font-medium transition", i === index && "ring-2 ring-zhaw-light", ans ? "border-zhaw-light/40 bg-zhaw/25 text-white" : "border-amber-100/10 bg-white/5 text-slate-400 hover:bg-white/10")}>
                      {i + 1}
                      {flagged && <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber-400 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div key={current.qid} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <div className="rounded-2xl glass p-5 sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zhaw/25 text-sm font-semibold text-zhaw-light">{index + 1}</span>
              <div>
                {current.title && <div className="text-sm font-medium text-white">{current.title}</div>}
                <div className="text-xs text-slate-500">
                  {isCustom ? "Zufallsprüfung" : exam?.label} · {current.type === "open" ? "Offene Aufgabe" : current.type === "multi" ? "Mehrfachauswahl" : "Eine Antwort"} · {current.points} P
                </div>
              </div>
            </div>
            <button onClick={toggleFlag} className={cn("rounded-lg p-2 transition", flags.has(current.qid) ? "bg-amber-400/20 text-amber-300" : "text-slate-500 hover:bg-white/10 hover:text-white")}><Flag className="h-5 w-5" /></button>
          </div>

          {current.scenario && <p className="mb-3 whitespace-pre-line rounded-xl border border-amber-100/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300">{current.scenario}</p>}
          {current.prompt && <p className="mb-5 whitespace-pre-line text-base font-medium leading-relaxed text-white">{current.prompt}</p>}

          {current.type === "open" ? (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><PenLine className="h-3.5 w-3.5" /> Eigene Antwort (wird nicht automatisch bewertet, Selbstbewertung im Resultat)</div>
              <textarea
                value={texts[current.qid] ?? ""}
                onChange={(e) => setTexts((t) => ({ ...t, [current.qid]: e.target.value }))}
                rows={7}
                placeholder="Antwort hier eingeben..."
                className="w-full rounded-xl border border-amber-100/10 bg-white/5 p-4 text-sm text-white placeholder:text-slate-500 focus:border-zhaw-light/50 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {current.options.map((o) => {
                const sel = (answers[current.qid] ?? []).includes(o.label);
                return (
                  <button key={o.label} onClick={() => toggle(o.label)} className={cn("flex items-start gap-3 rounded-xl border p-4 text-left text-sm transition-all", sel ? "border-zhaw-light/60 bg-zhaw/20 shadow-glow" : "border-amber-100/10 bg-white/5 hover:border-white/25 hover:bg-white/10")}>
                    <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold", sel ? "border-zhaw-light bg-zhaw text-white" : "border-white/20 text-slate-400")}>{o.label}</span>
                    <span className="text-slate-200">{o.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="btn-ghost"><ChevronLeft className="h-4 w-4" /> Zurück</button>
            {(answers[current.qid]?.length ?? 0) > 0 && current.type !== "open" && (
              <button onClick={() => setAnswers((a) => ({ ...a, [current.qid]: [] }))} className="text-xs text-slate-500 hover:text-rose-300">Auswahl löschen</button>
            )}
            {index < questions.length - 1 ? (
              <button onClick={() => setIndex((i) => i + 1)} className="btn-primary">Weiter <ChevronRight className="h-4 w-4" /></button>
            ) : (
              <button onClick={() => setConfirmSubmit(true)} className="btn-primary"><Send className="h-4 w-4" /> Prüfung abgeben</button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mt-5 flex justify-center">
        <button onClick={() => setConfirmSubmit(true)} className="btn-ghost text-xs"><Send className="h-3.5 w-3.5" /> Vorzeitig abgeben</button>
      </div>

      <AnimatePresence>
        {confirmSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-2xl panel-solid border border-amber-100/10 p-6">
              <div className="flex items-center gap-2 text-lg font-semibold text-white"><AlertTriangle className="h-5 w-5 text-amber-300" /> Prüfung abgeben?</div>
              <p className="mt-2 text-sm text-slate-400">{answeredCount} von {questions.length} Fragen beantwortet. Offene Fragen werden danach selbst bewertet.</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setConfirmSubmit(false)} className="btn-ghost flex-1">Weiter prüfen</button>
                <button onClick={() => submit(false)} className="btn-primary flex-1">Abgeben</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
