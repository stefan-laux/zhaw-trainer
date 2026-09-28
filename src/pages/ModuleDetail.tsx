import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  BookOpen,
  Layers,
  ListChecks,
  Lightbulb,
  Gavel,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  FileText,
  ExternalLink,
  Upload,
} from "lucide-react";
import { getModule, getSubjectContent } from "../data";
import { getSubject } from "../data/registry";
import { useProgress } from "../store/useProgress";
import InlineQuiz from "../components/InlineQuiz";
import AiModal from "../components/AiModal";
import { PageHeader, ProgressBar } from "../components/ui";
import { cn } from "../lib/utils";
import { explainPrompt } from "../lib/ai";
import { firebaseConfigured, listSlides, loadFileUrl, type SlideMeta } from "../lib/firebase";

const TABS = [
  { id: "ueberblick", label: "Überblick", icon: BookOpen },
  { id: "konzepte", label: "Konzepte", icon: ListChecks },
  { id: "begriffe", label: "Begriffe", icon: Layers },
  { id: "folien", label: "Folien", icon: FileText },
  { id: "quiz", label: "Quiz", icon: GraduationCap },
] as const;

const TYPE_META: Record<string, { color: string; label: string }> = {
  concept: { color: "border-zhaw-light/30", label: "Konzept" },
  law: { color: "border-violet-400/30", label: "Gesetz" },
  example: { color: "border-emerald-400/30", label: "Beispiel" },
  pitfall: { color: "border-rose-400/30", label: "Fallstrick" },
  mnemonic: { color: "border-amber-400/30", label: "Eselsbrücke" },
  process: { color: "border-sky-400/30", label: "Ablauf" },
};

export default function ModuleDetail() {
  const { id } = useParams();
  const mod = getModule(id!);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ueberblick");
  const [aiPrompt, setAiPrompt] = useState<string | undefined>();
  const [aiOpen, setAiOpen] = useState(false);
  const { moduleViewed, markBlockViewed, toggleModuleCompleted, moduleCompleted } = useProgress();

  if (!mod) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400">Modul nicht gefunden.</p>
        <Link to="/module" className="btn-ghost mt-4">Zurück</Link>
      </div>
    );
  }

  const subject = getSubject(mod.subjectId);
  const viewed = new Set(moduleViewed[mod.id] ?? []);
  const done = moduleCompleted.includes(mod.id);
  const cards = getSubjectContent(mod.subjectId).flashcards.filter((c) => c.moduleId === mod.id);

  function askAI(prompt: string) {
    setAiPrompt(prompt);
    setAiOpen(true);
  }

  return (
    <div>
      <Link to="/module" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Alle Module
      </Link>

      <PageHeader title={mod.title} subtitle={`${subject.short} · ${mod.tagline}`} icon={<BookOpen className="h-6 w-6" />}>
        <button onClick={() => toggleModuleCompleted(mod.id)} className={done ? "btn-ghost" : "btn-primary"}>
          {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4" />}
          {done ? "Abgeschlossen" : "Als gelernt markieren"}
        </button>
      </PageHeader>

      <div className="mb-8 max-w-3xl">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Lernfortschritt</span>
          <span>{viewed.size} / {mod.blocks?.length ?? 0} Konzepte angesehen</span>
        </div>
        <ProgressBar value={(mod.blocks?.length ?? 1) > 0 ? viewed.size / mod.blocks.length : 0} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition", active ? "text-white" : "text-slate-400 hover:text-slate-200")}>
              {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl border border-zhaw-light/30 bg-zhaw/20" />}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {tab === "ueberblick" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl glass p-6 lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Zusammenfassung</h2>
              <p className="prose-wr">{mod.summary}</p>
              <div className="mt-6 grid gap-2">
                {(mod.learningGoals ?? []).map((g, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 rounded-xl border border-amber-100/10 bg-white/5 p-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-zhaw/30 text-[11px] text-zhaw-light">{i + 1}</span>
                    <span className="text-sm text-slate-300">{g}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl glass p-5">
                <div className="text-xs uppercase tracking-wider text-slate-400">Enthalten</div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
                  <span>{mod.blocks?.length ?? 0} Konzepte</span>
                  <span>{mod.keyTerms?.length ?? 0} Fachbegriffe</span>
                  <span>{cards.length} Karteikarten</span>
                  <span>{mod.quiz?.length ?? 0} Quizfragen</span>
                </div>
              </div>
              <button onClick={() => askAI(`Erkläre mir das Thema "${mod.title}" (${subject.name}) kompakt und prüfungsorientiert.`)} className="btn-primary">
                <Sparkles className="h-4 w-4" /> Modul per KI erklären
              </button>
              <Link to="/karten" className="btn-ghost"><Layers className="h-4 w-4" /> Karteikarten üben</Link>
            </div>
          </div>
        )}

        {tab === "konzepte" && (
          <div className="flex flex-col gap-4">
            {(mod.blocks ?? []).map((b, i) => {
              const meta = TYPE_META[b.type ?? "concept"] ?? TYPE_META.concept;
              const isViewed = viewed.has(String(i));
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} onViewportEnter={() => markBlockViewed(mod.id, i)} className={cn("rounded-2xl border-l-2 bg-white/[0.03] p-5 backdrop-blur-xl", meta.color)}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="chip mb-2">{meta.label}</span>
                      <h3 className="font-display text-lg font-semibold text-white">{b.title}</h3>
                    </div>
                    {isViewed && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400/70" />}
                  </div>
                  {b.body && <p className="mt-2 prose-wr">{b.body}</p>}
                  {!!b.bullets?.length && (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {b.bullets.map((x, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zhaw-light" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!!b.articles?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {b.articles.map((a, j) => (
                        <span key={j} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200" title={a.text}>
                          <Gavel className="h-3 w-3" /> {a.ref}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => askAI(`Erkläre mir "${b.title}" aus dem Modul ${mod.title} genauer. ${b.body ?? ""}`)} className="mt-4 inline-flex items-center gap-1.5 text-xs text-zhaw-light hover:underline">
                    <Sparkles className="h-3.5 w-3.5" /> Vertieft erklären
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "begriffe" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(mod.keyTerms ?? []).map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }} className="rounded-2xl glass p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-white">{t.term}</h3>
                  {t.article && <span className="chip border-violet-400/25 text-violet-200">{t.article}</span>}
                </div>
                <p className="mt-2 text-sm text-slate-300">{t.definition}</p>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "folien" && <SlidesTab subjectId={mod.subjectId} week={mod.week} />}

        {tab === "quiz" && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
              <Lightbulb className="h-4 w-4 text-amber-300" /> Mehrfachauswahl möglich. Volle Punktzahl nur bei exakt richtiger Auswahl.
            </div>
            <InlineQuiz
              questions={mod.quiz ?? []}
              onAskAI={({ question, options, correct, user }) => askAI(explainPrompt(question, options, correct.map((c) => String.fromCharCode(65 + c)), user.map((u) => String.fromCharCode(65 + u))))}
            />
          </div>
        )}
      </motion.div>

      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100/80">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Inhalte KI-gestützt aus den offiziellen Folien erstellt. Für die Prüfung immer die Originalunterlagen als Referenz nutzen.
      </div>

      <AiModal open={aiOpen} onClose={() => setAiOpen(false)} prompt={aiPrompt} />
    </div>
  );
}

function SlidesTab({ subjectId, week }: { subjectId: string; week: string }) {
  const [slides, setSlides] = useState<SlideMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    listSlides(subjectId)
      .then((all) => alive && setSlides(all.filter((s) => !week || s.week === week || s.week === "all")))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [subjectId, week]);

  return (
    <div className="rounded-2xl glass p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Folien & Unterlagen · {week}</h2>
        <Link to="/admin" className="btn-ghost !py-1.5 text-xs"><Upload className="h-3.5 w-3.5" /> Hochladen</Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Lädt...</p>
      ) : slides.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {slides.map((s) => (
            <button key={s.id} onClick={async () => { const url = await loadFileUrl(s); window.open(url, "_blank"); }} className="flex items-center gap-3 rounded-xl border border-amber-100/10 bg-white/5 p-4 text-left transition hover:border-zhaw-light/40 hover:bg-white/10">
              <FileText className="h-5 w-5 text-zhaw-light" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white">{s.title}</div>
                <div className="text-[11px] text-slate-500">{s.week}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-amber-100/10 p-6 text-center text-sm text-slate-400">
          {firebaseConfigured
            ? "Noch keine Folien für diese Woche hochgeladen. Ein Admin kann sie im Admin-Bereich ergänzen."
            : "Firebase ist nicht konfiguriert. Nach dem Verbinden können Folien hochgeladen werden."}
        </div>
      )}
    </div>
  );
}
