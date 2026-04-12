// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cors from "cors";
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });
  app.use(express.json());
  const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://localhost:5173"] : [];
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  }));
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12e3);
      const jinaResponse = await axios.get(`https://r.jina.ai/${url}`, {
        signal: controller.signal,
        headers: {
          "Accept": "text/plain"
        },
        timeout: 12e3,
        validateStatus: (status) => status < 500
        // Don't throw on 4xx
      });
      clearTimeout(timeoutId);
      if (jinaResponse.status >= 400) {
        return res.status(jinaResponse.status).json({
          error: "blocked",
          message: "Portal blokuje automatyczne pobieranie (zabezpieczenia anty-botowe)."
        });
      }
      const text = jinaResponse.data;
      if (!text || typeof text === "string" && text.length < 100) {
        return res.status(422).json({
          error: "empty",
          message: "Nie uda\u0142o si\u0119 wyci\u0105gn\u0105\u0107 tre\u015Bci ze strony."
        });
      }
      return res.json({ text: typeof text === "string" ? text : String(text) });
    } catch (err) {
      if (err.code === "ECONNABORTED" || err.name === "AbortError") {
        return res.status(504).json({ error: "timeout", message: "Przekroczono czas po\u0142\u0105czenia z portalem." });
      }
      console.error("Jina scrape error:", err.message);
      return res.status(502).json({ error: "failed", message: "Nie uda\u0142o si\u0119 pobra\u0107 strony." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
