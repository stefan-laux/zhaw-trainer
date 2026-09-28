import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Upload, Trash2, FileText, ExternalLink, AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { PageHeader, SectionTitle } from "../components/ui";
import { SUBJECTS, getSubjectContent } from "../data";
import type { SubjectId } from "../data/types";
import { useAuth } from "../lib/auth";
import { firebaseConfigured, uploadSlide, listSlides, deleteSlide, loadFileUrl, type SlideMeta } from "../lib/firebase";
import { cn } from "../lib/utils";

const WEEKS = Array.from({ length: 14 }, (_, i) => `SW ${String(i + 1).padStart(2, "0")}`);

export default function Admin() {
  const { user, isAdmin, configured } = useAuth();
  const [subjectId, setSubjectId] = useState<SubjectId>("wins");
  const [week, setWeek] = useState("SW 01");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [slides, setSlides] = useState<SlideMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const subject = SUBJECTS.find((s) => s.id === subjectId)!;
  const content = getSubjectContent(subjectId);

  async function refresh() {
    if (!firebaseConfigured) return;
    setLoading(true);
    try {
      setSlides(await listSlides(subjectId));
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [subjectId]);

  async function doUpload() {
    if (!user || !file) return;
    setBusy(true);
    setMsg("");
    try {
      await uploadSlide(subjectId, week, title || file.name, file, user.uid);
      setMsg("Hochgeladen.");
      setFile(null);
      setTitle("");
      await refresh();
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div>
        <PageHeader title="Admin" subtitle="Inhalte verwalten" icon={<Shield className="h-6 w-6" />} />
        <div className="rounded-2xl glass p-6 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle className="h-4 w-4" /> Firebase nicht konfiguriert</div>
          <p className="text-slate-400">Der Admin-Bereich benötigt Firebase (Auth + Storage + Firestore). Siehe <Link to="/einstellungen" className="text-zhaw-light hover:underline">Einstellungen</Link>.</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div>
        <PageHeader title="Admin" subtitle="Inhalte verwalten" icon={<Shield className="h-6 w-6" />} />
        <div className="rounded-2xl glass p-8 text-center">
          <Shield className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 text-sm text-slate-400">{user ? "Dein Konto ist kein Admin. Trage deine E-Mail in VITE_ADMIN_EMAILS ein." : "Bitte zuerst anmelden."}</p>
          {!user && <Link to="/login" className="btn-primary mt-4"><LogIn className="h-4 w-4" /> Anmelden</Link>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Admin" subtitle="Folien & fehlende Wochen hochladen, Inhalte pflegen." icon={<Shield className="h-6 w-6" />} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl glass p-6">
          <SectionTitle>Folien / Unterlagen hochladen</SectionTitle>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">Fach
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value as SubjectId)} className="rounded-xl panel-solid border border-amber-100/10 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none">
                {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">Woche
                <input list="weeks" value={week} onChange={(e) => setWeek(e.target.value)} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none" />
                <datalist id="weeks">{WEEKS.map((w) => <option key={w} value={w} />)}</datalist>
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-slate-400">Titel
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Folien SW 04" className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none" />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-xs text-slate-400">Datei (PDF, PPTX)
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zhaw file:px-3 file:py-1.5 file:text-xs file:text-white" />
            </label>
            <button onClick={doUpload} disabled={busy || !file} className="btn-primary"><Upload className="h-4 w-4" /> {busy ? "Lädt hoch..." : "Hochladen"}</button>
            {msg && <div className="rounded-xl border border-amber-100/10 bg-white/5 p-2.5 text-xs text-slate-300">{msg}</div>}
          </div>
        </div>

        <div className="rounded-2xl glass p-6">
          <SectionTitle right={<button onClick={refresh} className="text-xs text-zhaw-light hover:underline"><RefreshCw className="mr-1 inline h-3 w-3" />Aktualisieren</button>}>
            Inhalte · {subject.short}
          </SectionTitle>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-amber-100/10 bg-white/5 p-2"><div className="text-lg font-semibold text-white">{content.modules.length}</div><div className="text-slate-500">Module</div></div>
            <div className="rounded-xl border border-amber-100/10 bg-white/5 p-2"><div className="text-lg font-semibold text-white">{content.exams.length}</div><div className="text-slate-500">Prüfungen</div></div>
            <div className="rounded-xl border border-amber-100/10 bg-white/5 p-2"><div className="text-lg font-semibold text-white">{slides.length}</div><div className="text-slate-500">Folien</div></div>
          </div>
          <div className="mb-2 text-xs text-slate-400">Vorhandene Lernmodule (Wochen):</div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {content.modules.map((m) => <span key={m.id} className="chip" style={{ borderColor: subject.accent + "44" }}>{m.week}</span>)}
            {content.modules.length === 0 && <span className="text-xs text-slate-500">keine</span>}
          </div>
          <div className="mb-2 text-xs text-slate-400">Hochgeladene Folien:</div>
          {loading ? <p className="text-xs text-slate-500">Lädt...</p> : slides.length ? (
            <div className="flex flex-col gap-2">
              {slides.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-amber-100/10 bg-white/5 p-2.5">
                  <FileText className="h-4 w-4 text-zhaw-light" />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs text-white">{s.title}</div><div className="text-[10px] text-slate-500">{s.week}</div></div>
                  <button onClick={async () => { const url = await loadFileUrl(s); window.open(url, "_blank"); }} className="text-slate-400 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /></button>
                  <button onClick={async () => { await deleteSlide(s); refresh(); }} className="text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500">Noch keine Folien für {subject.short} hochgeladen.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl glass p-6">
        <SectionTitle>Wochen-Abdeckung (Module)</SectionTitle>
        <div className="flex flex-col gap-4">
          {SUBJECTS.map((s) => {
            const covered = new Set<number>();
            for (const m of getSubjectContent(s.id).modules) {
              for (const n of weekNumbers(m.week)) covered.add(n);
            }
            return (
              <div key={s.id}>
                <div className="mb-1.5 flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} /><span className="text-slate-300">{s.name}</span><span className="text-slate-500">({covered.size}/14 Wochen)</span></div>
                <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => {
                    const has = covered.has(n);
                    return <span key={n} className={cn("rounded-md border py-1 text-center text-[11px]", has ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-100/10 bg-white/5 text-slate-600")}>{String(n).padStart(2, "0")}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">Grün = Lernmodul vorhanden. Fehlende Wochen können durch Folien-Upload ergänzt werden (danach Modul generieren lassen).</p>
      </div>
    </div>
  );
}

function weekNumbers(label: string): number[] {
  const nums = (label.match(/\d+/g) ?? []).map(Number);
  const isRange = label.includes("-") || label.includes("–") || /\bbis\b/i.test(label);
  if (nums.length >= 2 && isRange) {
    const out: number[] = [];
    for (let n = nums[0]; n <= nums[1] && n - nums[0] < 30; n++) out.push(n);
    return out;
  }
  return nums;
}
