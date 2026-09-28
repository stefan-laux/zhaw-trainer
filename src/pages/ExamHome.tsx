import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Clock, ListChecks, Play, Trophy, Shuffle, Info, Settings2, FileText, BookOpen } from "lucide-react";
import { PageHeader, StatCard } from "../components/ui";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress } from "../store/useProgress";
import { noteColor, cn } from "../lib/utils";

export default function ExamHome() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const content = getSubjectContent(active);
  const results = useProgress((s) => s.results).filter((r) => r.examId.startsWith(active + "-"));
  const [minutes, setMinutes] = useState(subject.id === "bwl" ? 60 : subject.id === "wins" ? 60 : 90);
  const [count, setCount] = useState(20);
  const [shuffled, setShuffled] = useState(true);

  if (!subject.hasExams) {
    return (
      <div>
        <PageHeader title={`Prüfungsmodus · ${subject.short}`} subtitle={subject.name} icon={<GraduationCap className="h-6 w-6" />} />
        <div className="rounded-2xl glass p-10 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="font-display mt-3 text-lg font-semibold text-white">Keine Altprüfungen verfügbar</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Für {subject.name} liegen keine Multiple-Choice-Altprüfungen vor. Nutze die Lernmodule, Karteikarten und das Quiz, um dich vorzubereiten.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/module" className="btn-primary"><BookOpen className="h-4 w-4" /> Lernmodule</Link>
            <Link to="/karten" className="btn-ghost">Karteikarten</Link>
            {subject.hasTasks && <Link to="/aufgaben" className="btn-ghost"><FileText className="h-4 w-4" /> Aufgaben</Link>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Prüfungsmodus · ${subject.short}`} subtitle={subject.name + " · echte Altprüfungen unter realistischen Bedingungen"} icon={<GraduationCap className="h-6 w-6" />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Altprüfungen" value={content.exams.length} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Fragenpool" value={content.questions.length} icon={<Shuffle className="h-5 w-5" />} />
        <StatCard label="Absolviert" value={results.length} icon={<Trophy className="h-5 w-5" />} />
        <StatCard label="Beste Note" value={results.length ? Math.max(...results.map((r) => r.note)).toFixed(2) : "-"} icon={<Clock className="h-5 w-5" />} accent="from-emerald-500/25 to-teal-500/10" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {content.exams.map((e, i) => {
          const eResults = results.filter((r) => r.examId === e.id);
          const best = eResults.length ? Math.max(...eResults.map((r) => r.note)) : null;
          return (
            <motion.div key={e.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <SpotlightCard className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="chip" style={{ borderColor: subject.accent + "55", color: subject.accent }}>{e.label}</span>
                    <h3 className="font-display mt-3 text-xl font-semibold text-white">{subject.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{e.questions.length} Fragen · {e.minutes} Min · max. {e.maxPoints} P</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zhaw/20 text-zhaw-light"><GraduationCap className="h-6 w-6" /></div>
                </div>
                <div className="mt-5 flex items-center gap-4 text-sm">
                  {best !== null ? (
                    <>
                      <div><div className="text-xs text-slate-500">Beste</div><div className={cn("text-lg font-semibold", noteColor(best))}>{best.toFixed(2)}</div></div>
                      <div><div className="text-xs text-slate-500">Versuche</div><div className="text-lg font-semibold text-white">{eResults.length}</div></div>
                    </>
                  ) : <span className="text-slate-500">Noch nicht absolviert</span>}
                </div>
                <Link to={`/pruefung/${e.id}`} className="btn-primary mt-6 w-full"><Play className="h-4 w-4" /> Prüfung starten</Link>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>

      <SpotlightCard className="mt-8 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><Settings2 className="h-4 w-4 text-zhaw-light" /> Eigene Prüfung zusammenstellen</div>
        <p className="mt-1 text-sm text-slate-400">Zufällige Fragen aus allen Jahrgängen, eigene Dauer und Anzahl.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs text-slate-400">Dauer (Minuten)
            <input type="number" min={5} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-zhaw-light/50 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs text-slate-400">Anzahl Fragen
            <input type="number" min={5} max={content.questions.length} value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-zhaw-light/50 focus:outline-none" />
          </label>
          <label className="flex items-center gap-2 self-end text-sm text-slate-300">
            <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} className="h-4 w-4 accent-[#C6A15B]" /> Fragen mischen
          </label>
        </div>
        <Link to={`/pruefung/custom?minutes=${minutes}&count=${count}&shuffle=${shuffled}&subject=${active}`} className="btn-ghost mt-5"><Shuffle className="h-4 w-4" /> Zufallsprüfung starten</Link>
      </SpotlightCard>

      <div className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-100/10 bg-white/5 p-4 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-zhaw-light" />
        <div><strong className="text-slate-300">Bewertung:</strong> {subject.id === "wins" ? "Single-Choice (genau eine Antwort), volle Punktzahl oder 0." : subject.id === "bwl" ? "Richtig/Falsch automatisch; offene Aufgaben per Selbstbewertung." : "Pro Frage max. 2.5 Punkte, jede falsche Antwort -0.5."} Note = 1 + 5 × (Punkte / Maximalpunkte).</div>
      </div>
    </div>
  );
}
