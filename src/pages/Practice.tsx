import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, Lightbulb, Code2, ArrowLeft, Target } from "lucide-react";
import { PageHeader, StatCard } from "../components/ui";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { cn } from "../lib/utils";
import type { TaskSet } from "../data/types";

export default function Practice() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const { tasks } = getSubjectContent(active);
  const [openSet, setOpenSet] = useState<TaskSet | null>(null);

  if (!subject.hasTasks) {
    return (
      <div>
        <PageHeader title={`Aufgaben · ${subject.short}`} subtitle={subject.name} icon={<FileText className="h-6 w-6" />} />
        <div className="rounded-2xl glass p-10 text-center text-sm text-slate-400">Für dieses Fach sind keine Aufgabenserien vorhanden.</div>
      </div>
    );
  }

  if (openSet) return <TaskSetView set={openSet} accent={subject.accent} onBack={() => setOpenSet(null)} />;

  const totalTasks = tasks.reduce((a, t) => a + t.tasks.length, 0);

  return (
    <div>
      <PageHeader title={`Aufgaben · ${subject.short}`} subtitle="Echte Altprüfungen mit offiziellen Musterlösungen. Lösen, dann Lösung aufdecken." icon={<FileText className="h-6 w-6" />} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Prüfungsserien" value={tasks.length} icon={<FileText className="h-5 w-5" />} />
        <StatCard label="Teilaufgaben" value={totalTasks} icon={<Target className="h-5 w-5" />} />
        <StatCard label="Mit Lösungen" value={tasks.length} accent="from-emerald-500/25 to-teal-500/10" />
        <StatCard label="Fach" value={subject.short} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tasks.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <SpotlightCard className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="chip" style={{ borderColor: subject.accent + "55", color: subject.accent }}>{t.label}</span>
                  <h3 className="font-display mt-3 text-xl font-semibold text-white">Aufgabenserie {t.year}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t.tasks.length} Teilaufgaben · max. {t.maxPoints} P · {t.minutes} Min</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zhaw/20 text-zhaw-light"><Code2 className="h-6 w-6" /></div>
              </div>
              <button onClick={() => setOpenSet(t)} className="btn-primary mt-6 w-full">Aufgaben öffnen</button>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TaskSetView({ set, accent, onBack }: { set: TaskSet; accent: string; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Alle Serien</button>
      <PageHeader title={`Aufgabenserie ${set.year}`} subtitle={`${set.tasks.length} Teilaufgaben · max. ${set.maxPoints} Punkte`} icon={<Code2 className="h-6 w-6" />} />
      <div className="flex flex-col gap-4">
        {set.tasks.map((t) => <TaskCard key={t.number} task={t} accent={accent} />)}
      </div>
    </div>
  );
}

function TaskCard({ task, accent }: { task: TaskSet["tasks"][number]; accent: string }) {
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="rounded-2xl border-l-2 bg-white/[0.03] p-5 backdrop-blur-xl" style={{ borderColor: accent + "88" }}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-white">{task.number}. {task.title}</h3>
        <span className="chip">{task.points} P</span>
      </div>
      <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-amber-100/10 bg-black/30 p-4 text-xs leading-relaxed text-slate-300">{task.task}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        {task.hints && <button onClick={() => setShowHint((s) => !s)} className="btn-ghost !py-1.5 text-xs"><Lightbulb className="h-3.5 w-3.5" /> Hinweis</button>}
        <button onClick={() => setShowSolution((s) => !s)} className="btn-primary !py-1.5 text-xs"><ChevronDown className={cn("h-3.5 w-3.5 transition", showSolution && "rotate-180")} /> {showSolution ? "Lösung verbergen" : "Lösung zeigen"}</button>
      </div>
      <AnimatePresence>
        {showHint && task.hints && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100">{task.hints}</div>
          </motion.div>
        )}
        {showSolution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">Offizielle Musterlösung</div>
              <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs leading-relaxed text-slate-200">{task.solution}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
