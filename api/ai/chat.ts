export const config = { runtime: "nodejs" };

interface Body {
  model?: string;
  messages: unknown;
  temperature?: number;
  max_tokens?: number;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    res.status(500).json({ error: "OPENROUTER_API_KEY fehlt in den Vercel Environment Variables." });
    return;
  }
  try {
    const body: Body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://zhaw.ch",
        "X-Title": "ZHAW Trainer",
      },
      body: JSON.stringify({
        model: body.model || "openai/gpt-4o-mini",
        messages: body.messages,
        temperature: body.temperature ?? 0.3,
        max_tokens: body.max_tokens ?? 1500,
      }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
