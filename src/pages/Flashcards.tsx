import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, RotateCcw, Shuffle, Sparkles, Check, Filter } from "lucide-react";
import { PageHeader, StatCard } from "../components/ui";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import CountUp from "../components/reactbits/CountUp";
import AiModal from "../components/AiModal";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress, isDue } from "../store/useProgress";
import { cn, shuffle } from "../lib/utils";

export default function Flashcards() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const allFlashcards = getSubjectContent(active).flashcards;
  const modules = getSubjectContent(active).modules;
  const { cards, gradeCard, resetCards } = useProgress();
  const [filter, setFilter] = useState<string>("due");
  const [sessionOrder, setSessionOrder] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | undefined>();
  const [aiOpen, setAiOpen] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const deck = useMemo(() => {
    let list = allFlashcards;
    if (filter === "due") list = list.filter((c) => isDue(cards[c.id]));
    else if (filter !== "all") list = list.filter((c) => c.moduleId === filter);
    return list;
  }, [filter, cards, allFlashcards]);

  const activeOrder = sessionOrder ?? deck.map((c) => c.id);
  const current = allFlashcards.find((c) => c.id === activeOrder[idx]);
  const learned = allFlashcards.filter((c) => cards[c.id]?.learned).length;
  const dueCount = allFlashcards.filter((c) => isDue(cards[c.id])).length;

  function startSession(shuffled = false) {
    setSessionOrder((shuffled ? shuffle(deck) : deck).map((c) => c.id));
    setIdx(0);
    setFlipped(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
  }

  function grade(g: "again" | "hard" | "good" | "easy") {
    if (!current) return;
    gradeCard(current.id, g);
    setSessionStats((s) => ({ ...s, [g]: s[g] + 1 }));
    setFlipped(false);
    if (idx + 1 >= activeOrder.length) {
      setSessionOrder(null);
      setIdx(0);
    } else setIdx((i) => i + 1);
  }

  const total = deck.length;

  return (
    <div>
      <PageHeader title={`Karteikarten · ${subject.short}`} subtitle="Spaced Repetition: bekannte Karten kommen später wieder, Lücken häufiger." icon={<Layers className="h-6 w-6" />}>
        <div className="flex gap-2">
          <button onClick={() => startSession(false)} className="btn-primary">Session starten</button>
          <button onClick={() => startSession(true)} className="btn-ghost"><Shuffle className="h-4 w-4" /> Gemischt</button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Karten total" value={<CountUp to={allFlashcards.length} />} icon={<Layers className="h-5 w-5" />} />
        <StatCard label="Gelernt" value={<CountUp to={learned} />} accent="from-emerald-500/25 to-teal-500/10" />
        <StatCard label="Fällig" value={<CountUp to={dueCount} />} accent="from-amber-500/25 to-orange-500/10" />
        <StatCard label="Deckgrösse" value={<CountUp to={total} />} hint="aktueller Filter" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500" />
        <button onClick={() => { setFilter("due"); setSessionOrder(null); }} className={cn("chip", filter === "due" && "border-zhaw-light/40 text-zhaw-light")}>Fällig ({dueCount})</button>
        <button onClick={() => { setFilter("all"); setSessionOrder(null); }} className={cn("chip", filter === "all" && "border-zhaw-light/40 text-zhaw-light")}>Alle</button>
        {modules.map((m) => (
          <button key={m.id} onClick={() => { setFilter(m.id); setSessionOrder(null); }} className={cn("chip", filter === m.id && "border-zhaw-light/40 text-zhaw-light")}>{m.week}</button>
        ))}
        <button onClick={resetCards} className="btn-ghost ml-auto !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Lernstand zurücksetzen</button>
      </div>

      <div className="mt-8 flex flex-col items-center">
        {!current ? (
          <div className="w-full max-w-xl rounded-2xl glass p-10 text-center">
            <Check className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="font-display mt-3 text-lg font-semibold text-white">Deck abgeschlossen</h3>
            <p className="mt-1 text-sm text-slate-400">Diese Session: {sessionStats.good + sessionStats.easy} gewusst, {sessionStats.hard} knapp, {sessionStats.again} wiederholen.</p>
            <button onClick={() => startSession(true)} className="btn-primary mt-5">Neue gemischte Session</button>
          </div>
        ) : (
          <div className="w-full max-w-xl">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
              <span>{idx + 1} / {activeOrder.length}</span>
              <span>{current.week} · {current.tag}</span>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full" style={{ background: subject.accent }} animate={{ width: `${((idx + 1) / activeOrder.length) * 100}%` }} />
            </div>

            <div className="[perspective:1600px]">
              <motion.div className="relative h-72 w-full cursor-pointer" onClick={() => setFlipped((f) => !f)} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.5 }} style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl glass-strong p-8 text-center [backface-visibility:hidden]">
                  <span className="chip mb-4">{current.tag}</span>
                  <p className="text-xl font-medium text-white">{current.front}</p>
                  <span className="mt-6 text-xs text-slate-500">Klicken zum Umdrehen</span>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-zhaw-light/30 bg-zhaw/10 p-8 text-center [backface-visibility:hidden]" style={{ transform: "rotateY(180deg)" }}>
                  <p className="text-base leading-relaxed text-slate-100">{current.back}</p>
                  <button onClick={(e) => { e.stopPropagation(); setAiPrompt(`Erkläre mir für die Prüfung: ${current.front}\nAntwort: ${current.back}\nGib ein Alltagsbeispiel und eine Eselsbrücke.`); setAiOpen(true); }} className="mt-4 inline-flex items-center gap-1.5 text-xs text-zhaw-light hover:underline">
                    <Sparkles className="h-3.5 w-3.5" /> Mehr Kontext
                  </button>
                </div>
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              {flipped && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 grid grid-cols-4 gap-2">
                  <button onClick={() => grade("again")} className="btn rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-rose-200 hover:bg-rose-500/20">Wieder</button>
                  <button onClick={() => grade("hard")} className="btn rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-amber-200 hover:bg-amber-500/20">Schwer</button>
                  <button onClick={() => grade("good")} className="btn rounded-xl border border-sky-500/30 bg-sky-500/10 py-3 text-sky-200 hover:bg-sky-500/20">Gut</button>
                  <button onClick={() => grade("easy")} className="btn rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-200 hover:bg-emerald-500/20">Leicht</button>
                </motion.div>
              )}
            </AnimatePresence>
            {!flipped && <p className="mt-5 text-center text-xs text-slate-500">Erst umdrehen, dann bewerten.</p>}
          </div>
        )}
      </div>

      {!!Object.keys(cards).length && (
        <SpotlightCard className="mt-10 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Lernstand pro Modul</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => {
              const totalM = allFlashcards.filter((c) => c.moduleId === m.id).length;
              const learnedM = allFlashcards.filter((c) => c.moduleId === m.id && cards[c.id]?.learned).length;
              return (
                <div key={m.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-400"><span>{m.week}</span><span>{learnedM}/{totalM}</span></div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${totalM ? (learnedM / totalM) * 100 : 0}%`, background: subject.accent }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SpotlightCard>
      )}

      <AiModal open={aiOpen} onClose={() => setAiOpen(false)} prompt={aiPrompt} />
    </div>
  );
}
