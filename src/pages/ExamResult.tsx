import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Sparkles, Check, X, Pencil, ArrowLeft, Clock, Target, TrendingUp, Save, PenLine, CheckCheck, Minus } from "lucide-react";
import { PageHeader, StatCard } from "../components/ui";
import ProgressRing from "../components/reactbits/ProgressRing";
import AiModal from "../components/AiModal";
import { celebrate } from "../components/reactbits/confetti";
import { useProgress } from "../store/useProgress";
import { getSubject } from "../data/registry";
import { cn, noteColor, formatTime } from "../lib/utils";
import { explainPrompt } from "../lib/ai";
import type { SubjectId } from "../data/types";
import type { RunnerQuestion } from "./ExamRunner";

interface PerQ {
  qid: string;
  selected: string[];
  points: number;
  maxPoints: number;
  errors: number;
  isOpen: boolean;
  selfScore: number | null;
}
interface Submission {
  examId: string;
  subjectId: SubjectId;
  label: string;
  auto: boolean;
  autoPoints: number;
  openPoints: number;
  maxPoints: number;
  note: number;
  correct: number;
  partial: number;
  wrong: number;
  total: number;
  durationSec: number;
  perQuestion: PerQ[];
  questions: RunnerQuestion[];
  answers: Record<string, string[]>;
  texts: Record<string, string>;
  selfScores: Record<string, number | null>;
}

export default function ExamResult() {
  const navigate = useNavigate();
  const { answerOverrides, setOverride, clearOverride } = useProgress();
  const [aiPrompt, setAiPrompt] = useState<string | undefined>();
  const [aiOpen, setAiOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [self, setSelf] = useState<Record<string, number | null>>({});

  const sub = useMemo<Submission | null>(() => {
    try {
      const raw = sessionStorage.getItem("zhaw-last-submission");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (sub) setSelf(sub.selfScores ?? {});
  }, [sub]);

  const openPointsRealized = useMemo(() => {
    if (!sub) return 0;
    return sub.questions.reduce((a, q) => a + (q.type === "open" ? self[q.qid] ?? 0 : 0), 0);
  }, [sub, self]);

  const totalPoints = sub ? sub.autoPoints + openPointsRealized : 0;
  const note = sub ? Math.max(1, Math.min(6, 1 + 5 * (totalPoints / sub.maxPoints))) : 1;
  const pct = sub ? totalPoints / sub.maxPoints : 0;
  const passed = note >= 4;

  useEffect(() => {
    if (sub && note >= 4) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sub) {
    return (
      <div className="py-20 text-center text-slate-400">
        Kein Resultat gefunden.
        <button onClick={() => navigate("/pruefung")} className="btn-ghost mx-auto mt-4 block">Zur Prüfungsübersicht</button>
      </div>
    );
  }

  const subject = getSubject(sub.subjectId);

  return (
    <div>
      <Link to="/pruefung" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Prüfungsübersicht</Link>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl glass">
        <div className="h-1.5 w-full" style={{ background: passed ? "linear-gradient(90deg,#34d399,#2dd4bf)" : "linear-gradient(90deg,#fbbf24,#fb7185)" }} />
        <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="chip" style={{ borderColor: subject.accent + "55", color: subject.accent }}>{subject.short} · {sub.label}</span>
            <h1 className="font-display mt-3 text-3xl font-semibold text-white">{passed ? "Bestanden" : "Noch nicht bestanden"}</h1>
            <p className="mt-1 text-sm text-slate-400">{totalPoints.toFixed(2)} von {sub.maxPoints} Punkten · {sub.correct} richtig, {sub.partial} teilweise, {sub.wrong} falsch{sub.openPoints > 0 ? " (ohne offene)" : ""}</p>
            <div className={cn("mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-4 py-2 text-2xl font-bold", noteColor(note))}><Trophy className="h-5 w-5" /> Note {note.toFixed(2)}</div>
            {sub.openPoints > 0 && <p className="mt-2 text-xs text-slate-500">Offene Aufgaben: {openPointsRealized.toFixed(1)} / {sub.openPoints} P durch Selbstbewertung.</p>}
          </div>
          <ProgressRing value={pct} size={150} label={`${Math.round(pct * 100)}%`} sublabel="erreicht" color={passed ? "#34d399" : subject.accent} />
        </div>
      </motion.div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Richtig" value={sub.correct} icon={<Check className="h-5 w-5" />} accent="from-emerald-500/25 to-teal-500/10" />
        <StatCard label="Teilweise" value={sub.partial} icon={<Target className="h-5 w-5" />} accent="from-amber-500/25 to-orange-500/10" />
        <StatCard label="Falsch" value={sub.wrong} icon={<X className="h-5 w-5" />} accent="from-rose-500/25 to-pink-500/10" />
        <StatCard label="Dauer" value={formatTime(sub.durationSec)} icon={<Clock className="h-5 w-5" />} hint={sub.auto ? "Zeit abgelaufen" : "manuell abgegeben"} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/pruefung/${sub.examId === "custom" ? "custom?subject=" + sub.subjectId : sub.examId}`} className="btn-primary"><RotateCcw className="h-4 w-4" /> Nochmals versuchen</Link>
        <Link to="/statistik" className="btn-ghost"><TrendingUp className="h-4 w-4" /> Statistik</Link>
        <button onClick={() => { setAiPrompt(`Ich habe in ${subject.name} ${totalPoints.toFixed(2)} von ${sub.maxPoints} Punkten erreicht (Note ${note.toFixed(2)}). Analysiere meine Lücken und gib mir einen 3-Punkte-Lernplan.`); setAiOpen(true); }} className="btn-ghost"><Sparkles className="h-4 w-4" /> KI-Lernplan</button>
      </div>

      <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-wider text-slate-400">Detailauswertung</h2>
      <div className="flex flex-col gap-4">
        {sub.perQuestion.map((pq, i) => {
          const q = sub.questions[i];
          const truth = answerOverrides[q.qid] ?? q.correct;
          const exact = pq.isOpen ? false : pq.points >= q.points && pq.selected.length > 0;
          const isEditing = editing === q.qid;
          return (
            <motion.div key={q.qid} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={cn("rounded-2xl border-l-2 bg-white/[0.03] p-5 backdrop-blur-xl", pq.isOpen ? "border-sky-400/50" : exact ? "border-emerald-400/50" : pq.points > 0 ? "border-amber-400/50" : "border-rose-400/50")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 font-semibold text-slate-300">{i + 1}</span>
                  {q.title || `Frage ${q.number}`} · {q.type === "open" ? "offen" : q.type === "multi" ? "multi" : "single"}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("chip", pq.isOpen ? "border-sky-400/30 text-sky-300" : exact ? "border-emerald-400/30 text-emerald-300" : pq.points > 0 ? "border-amber-400/30 text-amber-300" : "border-rose-400/30 text-rose-300")}>
                    {pq.isOpen ? `${(self[q.qid] ?? 0).toFixed(1)} / ${q.points} P` : `${pq.points.toFixed(2)} / ${q.points} P`}
                  </span>
                  {!pq.isOpen && <button onClick={() => { setEditing(isEditing ? null : q.qid); setDraft(truth); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-white" title="Lösungsschlüssel korrigieren"><Pencil className="h-3.5 w-3.5" /></button>}
                </div>
              </div>

              {(q.scenario || q.prompt) && <p className="mt-3 line-clamp-3 text-sm text-slate-400">{q.prompt || q.scenario}</p>}

              {pq.isOpen ? (
                <div className="mt-4 grid gap-3">
                  {sub.texts?.[q.qid] && <div className="rounded-xl border border-amber-100/10 bg-white/5 p-3 text-xs text-slate-300"><div className="mb-1 text-slate-500">Deine Antwort:</div>{sub.texts[q.qid]}</div>}
                  {q.modelAnswer && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-slate-200"><div className="mb-1 font-semibold text-emerald-300">Musterlösung:</div>{q.modelAnswer}</div>}
                  {q.explanation && <p className="text-xs text-slate-400">{q.explanation}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">Selbstbewertung:</span>
                    <button onClick={() => setSelf((s) => ({ ...s, [q.qid]: q.points }))} className={cn("chip", self[q.qid] === q.points && "border-emerald-400/50 text-emerald-300")}><CheckCheck className="h-3.5 w-3.5" /> gewusst</button>
                    <button onClick={() => setSelf((s) => ({ ...s, [q.qid]: q.points / 2 }))} className={cn("chip", self[q.qid] === q.points / 2 && "border-amber-400/50 text-amber-300")}><Minus className="h-3.5 w-3.5" /> teilweise</button>
                    <button onClick={() => setSelf((s) => ({ ...s, [q.qid]: 0 }))} className={cn("chip", self[q.qid] === 0 && "border-rose-400/50 text-rose-300")}><X className="h-3.5 w-3.5" /> nicht</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-1.5">
                    {q.options.map((o) => {
                      const sel = pq.selected.includes(o.label);
                      const isTrue = truth.includes(o.label);
                      return (
                        <div key={o.label} className={cn("flex items-start gap-3 rounded-lg border p-2.5 text-xs", isTrue ? "border-emerald-400/30 bg-emerald-400/5" : "border-amber-100/10 bg-white/[0.02]")}>
                          <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold", isTrue ? "border-emerald-400/50 text-emerald-300" : "border-white/20 text-slate-500")}>{o.label}</span>
                          <span className="flex-1 text-slate-300">{o.text}</span>
                          <span className="flex shrink-0 gap-1">
                            {sel && <span className="rounded bg-zhaw/30 px-1.5 py-0.5 text-[10px] text-zhaw-light">gewählt</span>}
                            {sel !== isTrue && <span className={cn("rounded px-1.5 py-0.5 text-[10px]", isTrue ? "bg-amber-400/20 text-amber-300" : "bg-rose-400/20 text-rose-300")}>{isTrue ? "gefehlt" : "falsch"}</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && !isEditing && <div className="mt-3 rounded-xl border border-amber-100/10 bg-white/5 p-3 text-xs text-slate-300"><span className="font-semibold text-slate-200">Lösung: {truth.join(", ")}. </span>{q.explanation}</div>}
                  {isEditing && (
                    <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-400/5 p-3">
                      <div className="mb-2 text-xs text-violet-200">Lösungsschlüssel anpassen:</div>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o) => {
                          const on = draft.includes(o.label);
                          return <button key={o.label} onClick={() => setDraft((d) => (on ? d.filter((x) => x !== o.label) : [...d, o.label].sort()))} className={cn("h-8 w-8 rounded-lg border text-xs font-semibold", on ? "border-violet-400 bg-violet-500/30 text-white" : "border-white/20 text-slate-400")}>{o.label}</button>;
                        })}
                        <button onClick={() => { setOverride(q.qid, draft); setEditing(null); }} className="btn-primary !py-1.5 text-xs"><Save className="h-3.5 w-3.5" /> Speichern</button>
                        {answerOverrides[q.qid] && <button onClick={() => { clearOverride(q.qid); setEditing(null); }} className="btn-ghost !py-1.5 text-xs">Zurücksetzen</button>}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { setAiPrompt(explainPrompt(`${q.scenario ?? ""} ${q.prompt}`.trim(), q.options.map((o) => o.text), truth, pq.selected)); setAiOpen(true); }} className="inline-flex items-center gap-1.5 text-xs text-zhaw-light hover:underline"><Sparkles className="h-3.5 w-3.5" /> KI-Erklärung</button>
                {q.type === "open" && <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><PenLine className="h-3.5 w-3.5" /> selbst bewertet</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center"><Link to="/pruefung" className="btn-ghost">Zurück zur Übersicht</Link></div>
      <AiModal open={aiOpen} onClose={() => setAiOpen(false)} prompt={aiPrompt} />
    </div>
  );
}
