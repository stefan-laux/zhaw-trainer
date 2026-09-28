import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, User, Cpu, Download, Upload, Trash2, RefreshCw, ShieldAlert, LogIn, LogOut, Shield, Cloud, CloudOff, KeyRound, Eye, EyeOff, ExternalLink, Check } from "lucide-react";
import { PageHeader, SectionTitle } from "../components/ui";
import { useProgress } from "../store/useProgress";
import { useAuth } from "../lib/auth";
import { SUBJECTS } from "../data";

const MODELS = [
  { id: "qwen/qwen3.8-27b", label: "Qwen3.8 27B" },
  { id: "deepseek/deepseek-v4.1-flash", label: "DeepSeek V4.1 Flash" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini (schnell, günstig)" },
  { id: "openai/gpt-4o", label: "GPT-4o (stark)" },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5" },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek Chat (V3)" },
];

export default function Settings() {
  const { name, setName, aiModel, setModel, resetAll, resetCards, answerOverrides, openrouterKey, setOpenrouterKey } = useProgress();
  const { user, isAdmin, configured, logout } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);

  function exportData() {
    const data = localStorage.getItem("wr-trainer-progress") ?? localStorage.getItem("zhaw-trainer-progress") ?? "{}";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zhaw-trainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Backup heruntergeladen.");
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result);
        localStorage.setItem("zhaw-trainer-progress", txt);
        localStorage.setItem("wr-trainer-progress", txt);
        flash("Backup importiert. Seite wird neu geladen...");
        setTimeout(() => location.reload(), 800);
      } catch {
        flash("Import fehlgeschlagen.");
      }
    };
    reader.readAsText(file);
  }

  function flash(msg: string) {
    setSaved(msg);
    setTimeout(() => setSaved(""), 2500);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Einstellungen" subtitle="Profil, KI-Modell, Konto und Lerndaten." icon={<SettingsIcon className="h-6 w-6" />} />

      <div className="rounded-2xl glass p-6">
        <SectionTitle right={configured ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Cloud className="h-3.5 w-3.5" /> verbunden</span> : <span className="inline-flex items-center gap-1 text-xs text-slate-500"><CloudOff className="h-3.5 w-3.5" /> lokal</span>}>
          Konto & Synchronisation
        </SectionTitle>
        {!configured ? (
          <p className="text-sm text-slate-400">
            Firebase ist nicht konfiguriert. Trage die <code className="rounded bg-white/10 px-1">VITE_FIREBASE_*</code> Variablen in <code className="rounded bg-white/10 px-1">.env.local</code> ein (siehe Anleitung), um Anmeldung, Cloud-Sync und Folien-Upload zu aktivieren.
          </p>
        ) : user ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zhaw/30 text-white"><User className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-medium text-white">{user.email}</div>
                <div className="text-xs text-emerald-400">Fortschritt wird synchronisiert</div>
              </div>
            </div>
            <div className="flex gap-2">
              {isAdmin && <Link to="/admin" className="btn-ghost"><Shield className="h-4 w-4" /> Admin</Link>}
              <button onClick={() => logout()} className="btn-ghost"><LogOut className="h-4 w-4" /> Abmelden</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Melde dich an, um Fortschritt zu speichern und über Geräte zu synchronisieren.</p>
            <Link to="/login" className="btn-primary"><LogIn className="h-4 w-4" /> Anmelden</Link>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl glass p-6">
        <SectionTitle>Profil</SectionTitle>
        <label className="flex items-center gap-3">
          <User className="h-5 w-5 text-slate-400" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" className="w-full rounded-xl border border-amber-100/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-zhaw-light/50 focus:outline-none" />
        </label>
      </div>

      <div className="mt-4 rounded-2xl glass p-6">
        <SectionTitle>KI-Modell</SectionTitle>
        <label className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-slate-400" />
          <select value={aiModel} onChange={(e) => setModel(e.target.value)} className="w-full rounded-xl panel-solid border border-amber-100/10 px-3 py-2.5 text-sm text-white focus:border-zhaw-light/50 focus:outline-none">
            {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-2xl glass p-6">
        <SectionTitle
          right={
            openrouterKey ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" /> hinterlegt</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-300">nicht gesetzt</span>
            )
          }
        >
          KI-Schlüssel (OpenRouter)
        </SectionTitle>
        <p className="mb-3 text-sm text-slate-400">
          Der KI-Tutor und die Erklärungen nutzen <strong className="text-slate-300">deinen eigenen</strong> OpenRouter-API-Key. Er wird nur lokal in diesem Browser gespeichert und nie an unsere Server gesendet.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-3 focus-within:border-zhaw-light/50">
            <KeyRound className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              type={showKey ? "text" : "password"}
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={openrouterKey ? "sk-or-... (gespeichert)" : "sk-or-..."}
              autoComplete="off"
              className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
            <button onClick={() => setShowKey((s) => !s)} className="text-slate-500 hover:text-white" title="Anzeigen/Verbergen">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>
          <button
            onClick={() => { setOpenrouterKey(keyDraft.trim()); setKeyDraft(""); flash("KI-Schlüssel gespeichert."); }}
            disabled={!keyDraft.trim()}
            className="btn-primary"
          >
            Speichern
          </button>
          {openrouterKey && (
            <button onClick={() => { setOpenrouterKey(""); setKeyDraft(""); flash("KI-Schlüssel entfernt."); }} className="btn-ghost">Entfernen</button>
          )}
        </div>
        <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-zhaw-light hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> Kostenlosen OpenRouter-Key erstellen (openrouter.ai/keys)
        </a>
      </div>

      <div className="mt-4 rounded-2xl glass p-6">
        <SectionTitle>Daten</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportData} className="btn-ghost"><Download className="h-4 w-4" /> Backup exportieren</button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost"><Upload className="h-4 w-4" /> Backup importieren</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <button onClick={() => { resetCards(); flash("Karteikarten-Fortschritt zurückgesetzt."); }} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Karten zurücksetzen</button>
          <button onClick={() => { if (confirm("Wirklich ALLE Lerndaten löschen?")) { resetAll(); flash("Alle Daten gelöscht."); } }} className="btn-danger"><Trash2 className="h-4 w-4" /> Alles zurücksetzen</button>
        </div>
        {saved && <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2.5 text-xs text-emerald-200">{saved}</div>}
      </div>

      <div className="mt-4 rounded-2xl glass p-6">
        <SectionTitle>Fächer</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUBJECTS.map((s) => (
            <div key={s.id} className="rounded-xl border border-amber-100/10 bg-white/5 p-3">
              <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.accent }} /><span className="text-sm font-medium text-white">{s.short}</span></div>
              <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{s.name}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Korrigierte Lösungsschlüssel gesamt: {Object.keys(answerOverrides).length}</p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-amber-100/80">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div><strong className="text-amber-200">Verantwortung:</strong> Privates Studientool. Lösungsschlüssel sind KI-gestützt erstellt und mit Unterlagen abgeglichen, aber keine offiziellen Musterlösungen. Strittige Punkte anhand der Originalunterlagen prüfen.</div>
      </div>
    </div>
  );
}
