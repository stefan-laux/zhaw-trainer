import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Search, CheckCircle2, Play, Layers } from "lucide-react";
import { PageHeader, ProgressBar } from "../components/ui";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress } from "../store/useProgress";

export default function Modules() {
  const [query, setQuery] = useState("");
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const { modules } = getSubjectContent(active);
  const { moduleCompleted, moduleViewed } = useProgress();

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return modules.filter((m) => m.title.toLowerCase().includes(q) || m.week.toLowerCase().includes(q) || m.tagline?.toLowerCase().includes(q));
  }, [query, modules]);

  return (
    <div>
      <PageHeader title={`Lernmodule · ${subject.short}`} subtitle={subject.name} icon={<BookOpen className="h-6 w-6" />}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Modul suchen..."
            className="w-full rounded-xl border border-amber-100/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-zhaw-light/50 focus:outline-none focus:ring-2 focus:ring-zhaw-light/30 sm:w-64"
          />
        </div>
      </PageHeader>

      {filtered.length === 0 && (
        <div className="rounded-2xl glass p-8 text-center text-sm text-slate-400">
          Noch keine Lernmodule für dieses Fach. Sobald Folien vorliegen (oder ein Admin sie hochlädt), erscheinen sie hier.
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m, i) => {
          const viewed = moduleViewed[m.id]?.length ?? 0;
          const total = m.blocks?.length ?? 1;
          const done = moduleCompleted.includes(m.id);
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/module/${m.id}`}>
                <SpotlightCard className="h-full p-5">
                  <div className="flex items-start justify-between">
                    <span className="chip" style={{ borderColor: subject.accent + "55", color: subject.accent }}>{m.week}</span>
                    {done && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-white">{m.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{m.tagline}</p>
                  <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Fortschritt</span>
                      <span>{Math.round((viewed / total) * 100)}%</span>
                    </div>
                    <ProgressBar value={viewed / total} />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {m.flashcards?.length ?? 0} Karten</span>
                    <span className="inline-flex items-center gap-1 text-zhaw-light"><Play className="h-3.5 w-3.5" /> Öffnen</span>
                  </div>
                </SpotlightCard>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
