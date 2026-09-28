import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, User, Bot, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/ui";
import { chat, makeTutorMessages, hasApiKey, type ChatMessage } from "../lib/ai";
import { useProgress } from "../store/useProgress";
import { useSubject } from "../store/useSubject";
import { getSubject } from "../data";
import { cn } from "../lib/utils";

const BASE_SUGGESTIONS = [
  "Erkläre mir die wichtigsten Konzepte dieses Fachs prüfungsorientiert.",
  "Fasse die 5 zentralen Modelle/Themen zusammen, die ich können muss.",
  "Prüfe mich mündlich: Stelle mir 3 Fragen und korrigiere mich.",
  "Erstelle mir eine Eselsbrücke für die schwierigsten Begriffe.",
  "Wo liegen typische Verwechslungsgefahren in diesem Fach?",
  "Gib mir einen 7-Tage-Lernplan für die Modulendprüfung.",
];

export default function AITutor() {
  const model = useProgress((s) => s.aiModel);
  const active = useSubject((s) => s.active);
  const subject = getSubject(active);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { setMessages([]); }, [active]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const withSubject: ChatMessage[] = [{ role: "system", content: `Fach: ${subject.name}. Antworte prüfungsorientiert für dieses ZHAW-Modul.` }, ...history];
      const reply = await chat(makeTutorMessages(withSubject), model);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader title={`KI-Tutor · ${subject.short}`} subtitle={`Frag alles zu ${subject.name}. Antworten prüfungsorientiert mit Begründung.`} icon={<Sparkles className="h-6 w-6" />}>
        {messages.length > 0 && <button onClick={() => setMessages([])} className="btn-ghost"><Trash2 className="h-4 w-4" /> Verlauf löschen</button>}
      </PageHeader>

      {!hasApiKey() && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100">
          <span>Kein KI-Schlüssel hinterlegt. Trage deinen OpenRouter-Key in den Einstellungen ein, um den Tutor zu nutzen.</span>
          <Link to="/einstellungen" className="btn-primary !py-1.5 whitespace-nowrap text-xs">Einstellungen</Link>
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-2xl glass p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zhaw to-zhaw-dark shadow-glow ring-1 ring-zhaw-light/40">
              <Sparkles className="h-8 w-8 text-white" />
              <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-zhaw-light/40" />
            </div>
            <h2 className="font-display mt-5 text-xl font-semibold text-white">Wie kann ich helfen?</h2>
            <p className="mt-1 text-sm text-slate-400">Wähle eine Frage oder tippe deine eigene.</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {BASE_SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border border-amber-100/10 bg-white/5 p-3 text-left text-xs text-slate-300 transition hover:border-zhaw-light/40 hover:bg-white/10">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.role === "user" ? "bg-zhaw text-white" : "bg-white/10 text-zhaw-light")}>
                  {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "rounded-tr-sm bg-zhaw text-white" : "rounded-tl-sm border border-amber-100/10 bg-white/5 text-slate-200")}>
                  {m.role === "assistant" ? (
                    <div className="prose-wr prose-invert prose-sm max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h2]:text-sm [&_h2]:text-white [&_h3]:text-sm [&_strong]:text-white [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zhaw-light"><Bot className="h-4 w-4" /></div>
                <div className="flex items-center gap-2 rounded-2xl border border-amber-100/10 bg-white/5 px-4 py-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> formuliert Antwort...</div>
              </div>
            )}
            {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</div>}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1 rounded-2xl border border-amber-100/10 bg-white/5 p-2 focus-within:border-zhaw-light/50">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Frage zu ${subject.short}... (Enter zum Senden)`} className="max-h-32 w-full resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none" />
        </div>
        <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary !px-4 !py-3"><Send className="h-4 w-4" /></button>
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500">Modell: {model} · Antworten können Fehler enthalten.</p>
    </div>
  );
}
