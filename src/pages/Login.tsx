import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Mail, Lock, Chrome, AlertTriangle, ArrowLeft, GraduationCap } from "lucide-react";
import { PageHeader } from "../components/ui";
import { useAuth } from "../lib/auth";

export default function Login({ standalone = false }: { standalone?: boolean }) {
  const { configured, loginGoogle, loginMicrosoft, loginEmail, registerEmail } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await loginEmail(email, password);
      else await registerEmail(email, password);
      navigate("/");
    } catch (e) {
      setError(String(e).replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      {!standalone && (
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      )}
      {standalone && (
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zhaw to-zhaw-dark shadow-glow ring-1 ring-zhaw-light/40">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div className="font-display mt-3 text-xl font-semibold text-white">ZHAW Trainer</div>
          <div className="text-xs text-slate-400">Melde dich an, um zu starten</div>
        </div>
      )}
      <PageHeader title={mode === "login" ? "Anmelden" : "Registrieren"} subtitle="Fortschritt geräteübergreifend speichern." icon={<LogIn className="h-6 w-6" />} />

      {!configured ? (
        <div className="rounded-2xl glass p-6 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2 font-semibold text-amber-300"><AlertTriangle className="h-4 w-4" /> Firebase nicht konfiguriert</div>
          <p className="text-slate-400">Erstelle ein Firebase-Projekt und trage die Keys in <code className="rounded bg-white/10 px-1">.env.local</code> ein:</p>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-amber-100/10 bg-black/30 p-3 text-[11px] text-slate-300">{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAILS=deine@mail.ch`}</pre>
          <p className="mt-3 text-xs text-slate-500">Danach App neu starten und in Firebase Authentication (Google & E-Mail/Passwort) sowie Storage aktivieren.</p>
        </div>
      ) : (
        <div className="rounded-2xl glass p-6">
          <button onClick={() => loginGoogle().then(() => navigate("/")).catch((e) => setError(String(e)))} className="btn-ghost w-full">
            <Chrome className="h-4 w-4" /> Mit Google anmelden
          </button>
          <button onClick={() => loginMicrosoft().then(() => navigate("/")).catch((e) => setError(String(e)))} className="btn-ghost mt-2 w-full">
            <GraduationCap className="h-4 w-4" /> Mit ZHAW-/Microsoft-Konto
          </button>
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><div className="h-px flex-1 bg-white/10" /> oder <div className="h-px flex-1 bg-white/10" /></div>
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-3 focus-within:border-zhaw-light/50">
            <Mail className="h-4 w-4 text-slate-500" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-Mail" className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
          </label>
          <label className="mb-4 flex items-center gap-2 rounded-xl border border-amber-100/10 bg-white/5 px-3 focus-within:border-zhaw-light/50">
            <Lock className="h-4 w-4 text-slate-500" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" onKeyDown={(e) => e.key === "Enter" && submit()} className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
          </label>
          {error && <div className="mb-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-2.5 text-xs text-rose-200">{error}</div>}
          <button onClick={submit} disabled={busy || !email || !password} className="btn-primary w-full">{busy ? "..." : mode === "login" ? "Anmelden" : "Konto erstellen"}</button>
          <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-white">
            {mode === "login" ? "Noch kein Konto? Registrieren" : "Bereits ein Konto? Anmelden"}
          </button>
        </div>
      )}
    </div>
  );
}
