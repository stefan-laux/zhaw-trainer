import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileDown, Upload, Sparkles, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, KeyRound, FileScan, Clock } from "lucide-react";
import { PageHeader, SectionTitle } from "../components/ui";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress } from "../store/useProgress";
import { shuffle } from "../lib/utils";
import { downloadExamPdf, filesToImages } from "../lib/pdfExam";
import { extractAnswers, hasVisionKey } from "../lib/vision";
import { loadSets, saveSet, newCode, type PdfSet } from "../lib/pdfSets";
import type { RunnerQuestion } from "./ExamRunner";

interface BuiltSubmission {
  examId: string;
  subjectId: string;
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
  perQuestion: {
    qid: string;
    selected: string[];
    points: number;
    maxPoints: number;
    errors: number;
    isOpen: boolean;
    selfScore: number | null;
  }[];
  questions: RunnerQuestion[];
  answers: Record<string, string[]>;
  texts: Record<string, string>;
  selfScores: Record<string, number | null>;
}

export default function ExamPdf() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const content = getSubjectContent(active);
  const navigate = useNavigate();
  const openrouterKey = useProgress((s) => s.openrouterKey);
  const visionModel = useProgress((s) => s.visionModel);

  const [sourceId, setSourceId] = useState<string>(content.exams[0]?.id ?? "random");
  const [count, setCount] = useState(36);
  const [sets, setSets] = useState<PdfSet[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const all = loadSets().filter((s) => s.subjectId === active);
    setSets(all);
    setSelectedCode(all[0]?.code ?? "");
  }, [active]);

  const selected = useMemo<PdfSet | null>(() => {
    if (selectedCode.startsWith("exam:")) {
      const id = selectedCode.slice(5);
      const exam = content.exams.find((e) => e.id === id);
      if (!exam) return null;
      return { code: exam.id, subjectId: active, examId: exam.id, label: exam.label, createdAt: 0, questions: exam.questions.map((q) => ({ ...q, qid: `${exam.id}-${q.number}`, examId: exam.id })) };
    }
    return sets.find((s) => s.code === selectedCode) ?? null;
  }, [sets, selectedCode, content.exams, active]);

  const makeQuestions = (): { id: string; label: string; examId: string; questions: RunnerQuestion[] } => {
    if (sourceId === "random") {
      const pool = content.questions;
      const picked = shuffle(pool).slice(0, Math.max(1, Math.min(count, pool.length)));
      return { id: "custom", label: "Zufallsprüfung", examId: "custom", questions: picked.map((q) => ({ ...q, qid: `${q.examId}-${q.number}`, examId: q.examId })) };
    }
    const exam = content.exams.find((e) => e.id === sourceId)!;
    return { id: exam.id, label: exam.label, examId: exam.id, questions: exam.questions.map((q) => ({ ...q, qid: `${exam.id}-${q.number}`, examId: exam.id })) };
  };

  const download = () => {
    const built = makeQuestions();
    const code = newCode();
    downloadExamPdf({
      subjectName: subject.name,
      label: built.label,
      minutes: sourceId === "random" ? 90 : content.exams.find((e) => e.id === sourceId)?.minutes ?? 90,
      code,
      questions: built.questions.map((q) => ({ number: q.number, type: q.type, title: q.title, scenario: q.scenario, prompt: q.prompt, options: q.options, points: q.points })),
    });
    const set: PdfSet = { code, subjectId: active, examId: built.examId, label: built.label, createdAt: Date.now(), questions: built.questions };
    saveSet(set);
    setSets(loadSets().filter((s) => s.subjectId === active));
    setSelectedCode(code);
    setError("");
  };

  const evaluate = async () => {
    if (!selected) {
      setError("Bitte zuerst ein PDF generieren (und ausfüllen).");
      return;
    }
    if (!files.length) {
      setError("Bitte die ausgefüllte Prüfung als Foto oder PDF hochladen.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Seiten werden gelesen...");
    try {
      const images = await filesToImages(files, (done, total) => setStatus(`Seiten werden gelesen... ${done}/${total}`));
      setStatus(`KI liest deine Antworten (${visionModel})...`);
      const answers = await extractAnswers(images, selected.questions, visionModel);
      const submission = buildSubmission(selected, answers, active);
      sessionStorage.setItem("zhaw-last-submission", JSON.stringify(submission));
      setStatus("Fertig - Auswertung wird geöffnet...");
      navigate(`/pruefung/${submission.examId}/resultat`);
    } catch (e) {
      setError(String(e));
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  if (!subject.hasExams) {
    return (
      <div>
        <PageHeader title={`PDF-Prüfung · ${subject.short}`} subtitle={subject.name} icon={<FileScan className="h-6 w-6" />} />
        <div className="rounded-2xl glass p-10 text-center text-sm text-slate-400">Für dieses Fach gibt es keine Multiple-Choice-Prüfungen.</div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/pruefung" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Prüfungsübersicht</Link>
      <PageHeader title={`PDF-Prüfung · ${subject.short}`} subtitle="Prüfung als PDF generieren, ausfüllen, später hochladen und auswerten lassen. Du kannst die Website zwischendurch schliessen." icon={<FileScan className="h-6 w-6" />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SpotlightCard className="p-6">
          <SectionTitle>1. Neue Prüfung generieren</SectionTitle>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">Quelle
              <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="rounded-xl panel-solid border border-amber-100/10 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none">
                {content.exams.map((e) => <option key={e.id} value={e.id}>{e.label} ({e.questions.length} Fragen)</option>)}
                <option value="random">Zufallsprüfung</option>
              </select>
            </label>
            {sourceId === "random" && (
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">Anzahl Fragen
                <input type="number" min={5} max={content.questions.length} value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none" />
              </label>
            )}
            <button onClick={download} className="btn-primary"><FileDown className="h-4 w-4" /> PDF herunterladen</button>
            {selected && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-xs text-emerald-200">
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> Gespeichert als Set <strong>{selected.code}</strong> ({selected.questions.length} Fragen, {selected.label}). Du kannst die Seite jetzt schliessen und später hochladen.
              </div>
            )}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6">
          <SectionTitle>2. Ausgefüllte Prüfung hochladen & auswerten</SectionTitle>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">Gespeicherte Prüfung (Set-Code)
              <select value={selectedCode} onChange={(e) => setSelectedCode(e.target.value)} className="rounded-xl panel-solid border border-amber-100/10 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none">
                {sets.length === 0 && <option value="">— keine gespeicherten Sets —</option>}
                {sets.map((s) => <option key={s.code} value={s.code}>Set {s.code} · {s.label} · {new Date(s.createdAt).toLocaleDateString("de-CH")}</option>)}
                {content.exams.map((e) => <option key={e.id} value={`exam:${e.id}`}>Altprüfung {e.label} (ohne Set)</option>)}
              </select>
            </label>
            <input ref={fileRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setError(""); }} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload className="h-4 w-4" /> Dateien wählen (PDF oder Fotos)</button>
            {files.length > 0 && <div className="text-xs text-slate-400">{files.length} Datei(en): {files.map((f) => f.name).join(", ")}</div>}
            <button onClick={evaluate} disabled={busy} className="btn-primary">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Auswerten mit KI
            </button>
            {status && <div className="text-xs text-slate-400">{status}</div>}
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</div>}
            <div className="text-[11px] text-slate-500">Vision-Modell: {visionModel}{!openrouterKey && " — Achtung: kein API-Key gesetzt."}</div>
          </div>
        </SpotlightCard>
      </div>

      {sets.length > 0 && (
        <div className="mt-6 rounded-2xl glass p-5">
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" /> Gespeicherte Prüfungen ({sets.length}) – bleiben in diesem Browser erhalten, auch nach dem Schliessen.</div>
          <div className="flex flex-wrap gap-2">
            {sets.slice(0, 8).map((s) => (
              <button key={s.code} onClick={() => setSelectedCode(s.code)} className={`chip ${selectedCode === s.code ? "border-zhaw-light/50 text-zhaw-light" : ""}`}>{s.code} · {s.label}</button>
            ))}
          </div>
        </div>
      )}

      {!hasVisionKey() && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100">
          <span>Für die Auswertung brauchst du einen OpenRouter-Key (auch für das Vision-Modell).</span>
          <Link to="/einstellungen" className="btn-primary !py-1.5 whitespace-nowrap text-xs"><KeyRound className="h-3.5 w-3.5" /> Einstellungen</Link>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-100/10 bg-white/5 p-4 text-xs text-slate-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <strong className="text-slate-300">Ablauf:</strong> PDF herunterladen → ausfüllen (Ankreuzen/Handschrift) → Fotos machen oder scannen → hier hochladen. Der Set-Code steht oben rechts und auf jeder Seite; die Prüfung bleibt in diesem Browser gespeichert. Für ein anderes Gerät einfach dieselbe Quelle wählen (bei «Zufallsprüfung» ist die Auswahl nicht reproduzierbar).
        </div>
      </div>
    </div>
  );
}

function buildSubmission(set: PdfSet, byNumber: Record<number, string[]>, subjectId: string): BuiltSubmission {
  let autoPoints = 0;
  let openPoints = 0;
  let correct = 0;
  let partial = 0;
  let wrong = 0;
  const perQuestion: BuiltSubmission["perQuestion"] = [];
  const answers: Record<string, string[]> = {};

  for (const q of set.questions) {
    const sel = (byNumber[q.number] ?? []).map((x) => x.toUpperCase());
    answers[q.qid] = sel;
    if (q.type === "open") {
      openPoints += q.points;
      perQuestion.push({ qid: q.qid, selected: sel, points: 0, maxPoints: q.points, errors: 0, isOpen: true, selfScore: null });
      continue;
    }
    let pts = 0;
    let exact = false;
    if (q.type === "multi") {
      let errors = 0;
      for (const o of q.options) {
        const isSel = sel.includes(o.label);
        const isTrue = q.correct.includes(o.label);
        if (isSel !== isTrue) errors += 1;
      }
      const perError = q.points / Math.max(1, q.options.length);
      pts = Math.max(0, q.points - perError * errors);
      exact = sel.length > 0 && errors === 0;
    } else {
      exact = sel.length > 0 && [...sel].sort().join(",") === [...q.correct].sort().join(",");
      pts = exact ? q.points : 0;
    }
    autoPoints += pts;
    if (exact) correct += 1;
    else if (pts > 0) partial += 1;
    else wrong += 1;
    perQuestion.push({ qid: q.qid, selected: sel, points: pts, maxPoints: q.points, errors: 0, isOpen: false, selfScore: null });
  }

  const maxPoints = set.questions.reduce((a, q) => a + q.points, 0);
  const note = Math.max(1, Math.min(6, 1 + 5 * (autoPoints / maxPoints)));
  return {
    examId: set.examId,
    subjectId,
    label: `${set.label} (PDF ${set.code})`,
    auto: false,
    autoPoints,
    openPoints,
    maxPoints,
    note: Math.round(note * 100) / 100,
    correct,
    partial,
    wrong,
    total: set.questions.length,
    durationSec: 0,
    perQuestion,
    questions: set.questions,
    answers,
    texts: {},
    selfScores: {},
  };
}
