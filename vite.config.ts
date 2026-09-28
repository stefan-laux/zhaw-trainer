import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function aiProxy(env: Record<string, string>): Plugin {
  return {
    name: "wr-ai-proxy",
    configureServer(server) {
      server.middlewares.use("/api/ai/chat", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }
        const key = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
        if (!key) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "OPENROUTER_API_KEY fehlt (.env)." }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const incoming = JSON.parse(body || "{}");
            const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://zhaw.ch",
                "X-Title": "WR Trainer",
              },
              body: JSON.stringify({
                model: incoming.model || "openai/gpt-4o-mini",
                messages: incoming.messages,
                temperature: incoming.temperature ?? 0.3,
                max_tokens: incoming.max_tokens ?? 2000,
              }),
            });
            const data = await upstream.json();
            res.statusCode = upstream.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: String(e) }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), aiProxy(env)],
    server: { port: 5173, open: true },
    build: { chunkSizeWarningLimit: 1500 },
  };
});
