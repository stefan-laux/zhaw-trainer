import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chat, makeTutorMessages, type ChatMessage } from "../lib/ai";
import { useProgress } from "../store/useProgress";

export default function AiModal({
  open,
  onClose,
  prompt,
}: {
  open: boolean;
  onClose: () => void;
  prompt?: string;
}) {
  const model = useProgress((s) => s.aiModel);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && prompt) {
      setMessages([{ role: "user", content: prompt }]);
      run([{ role: "user", content: prompt }]);
    }
    if (!open) {
      setMessages([]);
      setInput("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prompt]);

  async function run(history: ChatMessage[]) {
    setLoading(true);
    setError("");
    try {
      const res = await chat(makeTutorMessages(history), model);
      setMessages([...history, { role: "assistant", content: res }]);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function send() {
    if (!input.trim()) return;
    const history = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(history);
    setInput("");
    run(history);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl panel border border-white/10 sm:h-[70vh] sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-zhaw-light" /> KI-Erklärung
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : ""}>
                  <div
                    className={
                      m.role === "user"
                        ? "ml-auto inline-block max-w-[85%] rounded-2xl rounded-br-sm bg-zhaw px-4 py-2.5 text-left text-sm text-white"
                        : "max-w-[92%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm"
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="prose-wr prose-invert prose-sm max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Denkt nach...
                </div>
              )}
              {error && <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</div>}
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Rückfrage stellen..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-zhaw-light/50 focus:outline-none"
              />
              <button onClick={send} disabled={loading} className="btn-primary !px-3">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
