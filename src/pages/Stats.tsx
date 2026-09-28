import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { PageHeader, StatCard, SectionTitle, ProgressBar } from "../components/ui";
import CountUp from "../components/reactbits/CountUp";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { getSubjectContent, getSubject } from "../data";
import { useSubject } from "../store/useSubject";
import { useProgress, isDue } from "../store/useProgress";
import { noteColor } from "../lib/utils";

export default function Stats() {
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const content = getSubjectContent(active);
  const { results, moduleCompleted, cards, questionStats, moduleViewed } = useProgress();

  const subjectResults = results.filter((r) => r.examId.startsWith(active + "-"));
  const best = subjectResults.length ? Math.max(...subjectResults.map((r) => r.note)) : null;
  const avg = subjectResults.length ? subjectResults.reduce((a, r) => a + r.note, 0) / subjectResults.length : null;
  const passed = subjectResults.filter((r) => r.note >= 4).length;

  const noteSeries = [...subjectResults].reverse().map((r, i) => ({ i: i + 1, note: r.note }));
  const perExam = content.exams.map((e) => {
    const rs = subjectResults.filter((r) => r.examId === e.id);
    return { name: e.label.replace("MEP ", ""), note: rs.length ? Math.max(...rs.map((r) => r.note)) : 0 };
  });
  const radar = content.modules.map((m) => ({ week: m.week.replace("SW ", ""), v: Math.round(((moduleViewed[m.id]?.length ?? 0) / Math.max(1, m.blocks?.length ?? 1)) * 100) }));
  const acc = (() => {
    const ids = new Set(content.questions.map((q) => `${q.examId}-${q.number}`));
    const s = Object.entries(questionStats).filter(([id]) => ids.has(id)).map(([, v]) => v);
    const a = s.reduce((x, y) => x + y.attempts, 0);
    const c = s.reduce((x, y) => x + y.correct, 0);
    return a ? Math.round((c / a) * 100) : 0;
  })();

  return (
    <div>
      <PageHeader title={`Statistik · ${subject.short}`} subtitle={subject.name} icon={<BarChart3 className="h-6 w-6" />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Prüfungen" value={<CountUp to={subjectResults.length} />} icon={<Award className="h-5 w-5" />} />
        <StatCard label="Beste Note" value={best !== null ? <CountUp to={best} decimals={2} className={noteColor(best)} /> : "-"} accent="from-emerald-500/25 to-teal-500/10" />
        <StatCard label="Ø Note" value={avg !== null ? <CountUp to={avg} decimals={2} className={noteColor(avg)} /> : "-"} />
        <StatCard label="Trefferquote" value={<CountUp to={acc} suffix="%" />} hint={`${passed} bestanden`} icon={<Target className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl glass p-6">
          <SectionTitle>Notenverlauf</SectionTitle>
          {noteSeries.length > 1 ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={noteSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="i" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(10,14,22,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} formatter={(v: number) => [`Note ${v.toFixed(2)}`, ""]} />
                  <Line type="monotone" dataKey="note" stroke={subject.accent} strokeWidth={3} dot={{ r: 4, fill: subject.accent }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="Absolviere mindestens zwei Prüfungen für den Verlauf." />}
        </div>

        <div className="rounded-2xl glass p-6">
          <SectionTitle>Beste Note pro Altprüfung</SectionTitle>
          {perExam.length ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perExam} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 6]} ticks={[0, 2, 4, 6]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(10,14,22,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="note" fill={subject.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="Keine Altprüfungen für dieses Fach." />}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl glass p-6 lg:col-span-2">
          <SectionTitle>Modulfortschritt</SectionTitle>
          {content.modules.length ? (
            <div className="flex flex-col gap-4">
              {content.modules.map((m) => {
                const tot = m.blocks?.length ?? 1;
                const viewed = (moduleViewed[m.id]?.length ?? 0) / tot;
                const done = moduleCompleted.includes(m.id);
                return (
                  <div key={m.id}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-300">{m.week} · {m.title}</span>
                      <span className={done ? "text-emerald-400" : "text-slate-500"}>{done ? "abgeschlossen" : `${Math.round(viewed * 100)}%`}</span>
                    </div>
                    <ProgressBar value={viewed} />
                  </div>
                );
              })}
            </div>
          ) : <Empty text="Keine Module." />}
        </div>

        <div className="rounded-2xl glass p-6">
          <SectionTitle>Karteikarten</SectionTitle>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={[
                { k: "gelernt", v: content.flashcards.filter((c) => cards[c.id]?.learned).length },
                { k: "offen", v: content.flashcards.filter((c) => isDue(cards[c.id])).length },
                { k: "total", v: content.flashcards.length },
                { k: "fragen", v: content.questions.length },
                { k: "module", v: content.modules.length },
              ]} outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="k" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Radar dataKey="v" stroke={subject.accent} fill={subject.accent} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-xs text-slate-400">{content.flashcards.filter((c) => cards[c.id]?.learned).length} von {content.flashcards.length} Karten gelernt</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl glass p-6">
        <SectionTitle right={<span className="inline-flex items-center gap-1 text-xs text-zhaw-light"><TrendingUp className="h-3.5 w-3.5" /> {subject.short}</span>}>Prüfungsprotokoll</SectionTitle>
        {subjectResults.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="pb-2">Datum</th><th className="pb-2">Prüfung</th><th className="pb-2">Punkte</th><th className="pb-2">Note</th><th className="pb-2">Richtig</th><th className="pb-2">Dauer</th></tr>
              </thead>
              <tbody>
                {subjectResults.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 text-slate-300">
                    <td className="py-2 text-xs text-slate-500">{r.date.slice(0, 10)}</td>
                    <td className="py-2">{r.examId.replace(active + "-", "")}</td>
                    <td className="py-2">{r.points.toFixed(1)}/{r.maxPoints}</td>
                    <td className={`py-2 font-semibold ${noteColor(r.note)}`}>{r.note.toFixed(2)}</td>
                    <td className="py-2 text-xs">{r.correct}/{r.total}</td>
                    <td className="py-2 text-xs text-slate-500">{Math.round(r.durationSec / 60)} Min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="Noch keine absolvierten Prüfungen." />}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-amber-100/10 text-sm text-slate-500">{text}</div>;
}
