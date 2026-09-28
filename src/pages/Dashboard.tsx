import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Layers, Flame, Target, ArrowRight, Sparkles, TrendingUp, Award, FileText, Info } from "lucide-react";
import { PageHeader, StatCard, SectionTitle, ProgressBar } from "../components/ui";
import CountUp from "../components/reactbits/CountUp";
import SpotlightCard from "../components/reactbits/SpotlightCard";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress, isDue, streakFromResults } from "../store/useProgress";
import { noteColor } from "../lib/utils";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const content = getSubjectContent(active);
  const { results, moduleCompleted, cards, questionStats, name } = useProgress();

  const subjectResults = results.filter((r) => r.examId.startsWith(active + "-"));
  const streak = streakFromResults(results);
  const totalCards = content.flashcards.length;
  const learnedCards = content.flashcards.filter((c) => cards[c.id]?.learned).length;
  const dueCards = content.flashcards.filter((c) => isDue(cards[c.id])).length;
  const progress = content.modules.length ? moduleCompleted.filter((id) => id.startsWith(active + "-")).length / content.modules.length : 0;
  const attempts = content.questions.reduce((a, q) => a + (questionStats[`${q.examId}-${q.number}`]?.attempts ?? 0), 0);
  const correct = content.questions.reduce((a, q) => a + (questionStats[`${q.examId}-${q.number}`]?.correct ?? 0), 0);
  const accuracy = attempts ? correct / attempts : 0;
  const avgNote = subjectResults.length ? subjectResults.reduce((a, r) => a + r.note, 0) / subjectResults.length : null;

  const chartData = [...subjectResults].slice(0, 12).reverse().map((r, i) => ({ name: `#${i + 1}`, note: r.note }));

  const weakest = Object.entries(questionStats)
    .filter(([id, s]) => id.startsWith(active + "-") && s.attempts >= 1)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts)
    .slice(0, 4)
    .map(([id]) => content.questions.find((q) => `${q.examId}-${q.number}` === id))
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        title={name ? `Hallo ${name}` : subject.name}
        subtitle={subject.description}
        icon={<Target className="h-6 w-6" />}
      >
        {subject.hasExams && (
          <Link to="/pruefung" className="btn-primary">
            <GraduationCap className="h-4 w-4" /> Prüfung starten
          </Link>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Streak" value={<><CountUp to={streak} /> <span className="text-base text-slate-400">Tage</span></>} icon={<Flame className="h-5 w-5" />} accent="from-orange-500/30 to-rose-500/10" />
        <StatCard label="Ø Note" value={avgNote !== null ? <CountUp to={avgNote} decimals={2} className={noteColor(avgNote)} /> : "-"} hint={`${subjectResults.length} Prüfungen`} icon={<Award className="h-5 w-5" />} />
        <StatCard label="Trefferquote" value={<CountUp to={accuracy * 100} suffix="%" />} hint={`${correct}/${attempts} Fragen`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Karten fällig" value={<CountUp to={dueCards} />} hint={`${learnedCards}/${totalCards} gelernt`} icon={<Layers className="h-5 w-5" />} accent="from-emerald-500/25 to-teal-500/10" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SpotlightCard className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${subject.accent}33, transparent 70%)` }} />
          <div className="relative">
            <SectionTitle right={<span className="chip">{progress === 1 ? "Abgeschlossen" : "Im Gang"}</span>}>Lernfortschritt Module</SectionTitle>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div className="text-3xl font-semibold text-white">
                  <CountUp to={moduleCompleted.filter((id) => id.startsWith(active + "-")).length} /> <span className="text-lg text-slate-400">/ {content.modules.length} Module</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">Arbeite die Wochen durch und festige sie mit Karteikarten.</p>
              </div>
              <Link to="/module" className="btn-ghost">Weiter <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <ProgressBar value={progress} className="h-2.5" />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {content.modules.slice(0, 4).map((m) => (
                <Link key={m.id} to={`/module/${m.id}`} className="rounded-xl border border-amber-100/10 bg-white/5 p-3 transition hover:border-zhaw-light/40 hover:bg-white/10">
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: subject.accent }}>{m.week}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-300">{m.title}</div>
                </Link>
              ))}
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6">
          <SectionTitle>Schnellzugriff</SectionTitle>
          <div className="flex flex-col gap-3">
            {[
              { to: "/module", label: "Lernmodule", desc: `${content.modules.length} Wochen`, icon: BookOpen, show: true },
              { to: "/karten", label: "Karteikarten", desc: `${dueCards} fällig`, icon: Layers, show: true },
              { to: "/pruefung", label: "Prüfungsmodus", desc: `${content.exams.length} Altprüfungen`, icon: GraduationCap, show: subject.hasExams },
              { to: "/aufgaben", label: "Aufgaben", desc: `${content.tasks.length} Prüfungsserien`, icon: FileText, show: subject.hasTasks },
              { to: "/tutor", label: "KI-Tutor fragen", desc: "Erklärungen auf Knopfdruck", icon: Sparkles, show: true },
            ].filter((a) => a.show).map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.to} to={a.to} className="group flex items-center gap-3 rounded-xl border border-amber-100/10 bg-white/5 p-3 transition hover:border-zhaw-light/40 hover:bg-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zhaw/20 text-zhaw-light"><Icon className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{a.label}</div>
                    <div className="text-xs text-slate-400">{a.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-zhaw-light" />
                </Link>
              );
            })}
          </div>
        </SpotlightCard>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl glass p-6 lg:col-span-2">
          <SectionTitle right={<Link to="/statistik" className="text-xs text-zhaw-light hover:underline">Details</Link>}>Notenverlauf</SectionTitle>
          {chartData.length > 1 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gNote" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={subject.accent} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={subject.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(10,14,22,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e2e8f0" }} formatter={(v: number) => [`Note ${v.toFixed(2)}`, ""]} />
                  <Area type="monotone" dataKey="note" stroke={subject.accent} strokeWidth={2.5} fill="url(#gNote)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-amber-100/10 text-center">
              <GraduationCap className="h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                {subject.hasExams ? "Noch keine Prüfungsresultate für dieses Fach." : "Für dieses Fach gibt es keine Altprüfungen. Nutze Lernmodule und Karteikarten."}
              </p>
              {subject.hasExams && <Link to="/pruefung" className="btn-primary">Jetzt prüfen</Link>}
            </div>
          )}
        </div>

        <div className="rounded-2xl glass p-6">
          <SectionTitle>Schwächen erkennen</SectionTitle>
          {weakest.length ? (
            <div className="flex flex-col gap-3">
              {weakest.map((q) => {
                const s = questionStats[`${q!.examId}-${q!.number}`];
                const acc = Math.round((s.correct / s.attempts) * 100);
                return (
                  <div key={`${q!.examId}-${q!.number}`} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{q!.examLabel} · Frage {q!.number}</span>
                      <span className={acc < 50 ? "text-rose-300" : "text-amber-300"}>{acc}%</span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-300">{q!.title || q!.prompt}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sobald du Fragen beantwortest, siehst du hier deine Schwachstellen. Gesamtpool: {content.questions.length} Fragen.</p>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100/80">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Lösungsschlüssel sind KI-generiert und mit den Unterlagen abgeglichen. Für {subject.short} strittige Fälle immer in den Originalunterlagen prüfen. Antworten lassen sich im Resultat manuell korrigieren.
      </motion.div>
    </div>
  );
}
