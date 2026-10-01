import { useProgress } from "../store/useProgress";
import { MissingKeyError } from "./ai";

export interface VisionQuestion {
  number: number;
  type: string;
  prompt: string;
  options: { label: string; text: string }[];
}

export type ExtractedAnswers = Record<number, string[]>;

const SYSTEM = `Du bist ein präziser OCR-Assistent. Du liest handschriftlich oder gedruckt ausgefüllte Schweizer Prüfungsblätter (Multiple-Choice mit Ankreuzkästchen) aus Fotos oder Scans.
Regeln:
- Erkenne pro Frage, welche der Kästchen A bis E angekreuzt, ausgefüllt oder markiert sind.
- Berücksichtige handgeschriebene Buchstaben im Antwortblatt, falls das Kästchen nicht klar erkennbar ist.
- Rate nicht: wenn nichts erkennbar ist, gib eine leere Liste zurück.
Antworte AUSSCHLIESSLICH mit gültigem JSON, kein Markdown:
{"answers":[{"number":1,"selected":["A","C"]},{"number":2,"selected":[]}]}`;

export function hasVisionKey(): boolean {
  return ((useProgress.getState().openrouterKey ?? "").trim().length > 0);
}

export async function extractAnswers(
  images: string[],
  questions: VisionQuestion[],
  model?: string
): Promise<ExtractedAnswers> {
  const key = (useProgress.getState().openrouterKey ?? "").trim();
  if (!key) throw new MissingKeyError();
  const useModel = model || useProgress.getState().visionModel || "google/gemini-3.1-flash-lite";

  const catalog = questions
    .filter((q) => q.type !== "open")
    .map((q) => {
      const opts = q.options.map((o) => `${o.label}) ${o.text}`).join("\n   ");
      return `${q.number}) ${q.prompt}\n   ${opts}`;
    })
    .join("\n");

  const content: unknown[] = [
    {
      type: "text",
      text:
        `Lies die beigefügten Seiten der ausgefüllten Prüfung aus.\n` +
        `Hier ist der Fragenkatalog mit den Optionen:\n\n${catalog}\n\n` +
        `Gib jetzt das JSON mit den angekreuzten Buchstaben pro Frage zurück.`,
    },
    ...images.map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://zhaw.ch",
      "X-Title": "ZHAW Trainer PDF",
    },
    body: JSON.stringify({
      model: useModel,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.error || "Vision-Auswertung fehlgeschlagen");

  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: { answers?: { number: number; selected: string[] | string }[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    parsed = s >= 0 ? JSON.parse(raw.slice(s, e + 1)) : {};
  }
  const out: ExtractedAnswers = {};
  for (const a of parsed.answers ?? []) {
    const sel = Array.isArray(a.selected) ? a.selected : a.selected ? [a.selected] : [];
    out[Number(a.number)] = sel.map((x) => String(x).toUpperCase()).filter((x) => /^[A-E]$/.test(x));
  }
  return out;
}
