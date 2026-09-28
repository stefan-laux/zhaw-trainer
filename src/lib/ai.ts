import { useProgress } from "../store/useProgress";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const TUTOR_SYSTEM = `Du bist der "WR-Tutor", ein geduldiger, präziser Schweizer Wirtschaftsrechts-Dozent an der ZHAW für Wirtschaftsinformatik-Studierende.
Du hilfst bei der Vorbereitung auf die Modulendprüfung (Multiple Choice, Open Book, Schweizer Recht).

Stilregeln:
- Antworte auf Deutsch in Schweizer Orthografie: immer "ss" statt "ß". Keine Em-Dashes oder En-Dashes.
- Strukturiere Antworten kurz und lernfreundlich: Kernaussage, Begründung, Gesetzesartikel (OR, ZGB, DSG, UWG, KG, URG, PatG, MSchG, DesG, SVG, PrH).
- Nenne bei Prüfungsfragen zuerst die richtige(n) Option(en), danach die Begründung.
- Wenn unsicher, sag es klar und verweise auf Skript/Gesetzestext.
- Keine erfundenen Artikel.`;

export class MissingKeyError extends Error {
  constructor() {
    super("Kein KI-Schlüssel hinterlegt. Bitte in den Einstellungen deinen OpenRouter-API-Key eintragen.");
    this.name = "MissingKeyError";
  }
}

function getKey(): string {
  return (useProgress.getState().openrouterKey ?? "").trim();
}

export function hasApiKey(): boolean {
  return getKey().length > 0;
}

/** Calls OpenRouter directly from the browser using the user's own API key (stored locally). */
export async function chat(messages: ChatMessage[], model = "openai/gpt-4o-mini"): Promise<string> {
  const key = getKey();
  if (!key) throw new MissingKeyError();
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://zhaw.ch",
      "X-Title": "ZHAW Trainer",
    },
    body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 1500 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.error || "KI-Anfrage fehlgeschlagen");
  return data?.choices?.[0]?.message?.content ?? "";
}

export function makeTutorMessages(history: ChatMessage[]): ChatMessage[] {
  return [{ role: "system", content: TUTOR_SYSTEM }, ...history];
}

export function explainPrompt(questionText: string, options: string[], correct: string[], userAnswer: string[]) {
  return `Erkläre mir diese Prüfungsfrage Schritt für Schritt.

Frage: ${questionText}

Optionen:
${options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("\n")}

Gesuchte Lösung: ${correct.join(", ") || "unbekannt"}
Meine Auswahl: ${userAnswer.join(", ") || "keine"}

Erkläre: 1) warum die richtigen Optionen zutreffen (mit Gesetzesartikel), 2) warum meine Auswahl falsch ist, 3) eine Eselsbrücke zum Merken.`;
}

export { TUTOR_SYSTEM };
