/**
 * Express API Server
 * Cung cấp endpoint để frontend React gọi tạo bộ câu hỏi bằng AI (qua OpenRouter).
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import { generateQuestionPack } from "./agent/agentRunner.js";
import { OPENROUTER_MODEL } from "./agent/openAI.js";

const app = express();
app.use(express.json());

// CORS đơn giản cho dev (frontend React chạy port 3000)
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});

// ──────────────────────────────────────────────────────────
// POST /api/ai/generate-pack
// Body: { prompt: string }
// Response: { success: true, pack: QuestionPack }
//        or { success: false, error: string }
// ──────────────────────────────────────────────────────────
app.post("/api/ai/generate-pack", async (req: Request, res: Response) => {
  const { prompt } = req.body ?? {};

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    res.status(400).json({
      success: false,
      error: 'Thiếu field "prompt". Ví dụ: { "prompt": "Tạo 5 câu về Lịch sử Việt Nam" }',
    });
    return;
  }

  const controller = new AbortController();
  let disconnected = false;
  req.on("close", () => {
    disconnected = true;
    controller.abort();
  });

  try {
    const steps: string[] = [];
    const pack = await generateQuestionPack({
      prompt: prompt.trim(),
      signal: controller.signal,
      onProgress: (step) => {
        console.log(`[Agent] ${step}`);
        steps.push(step);
      },
    });

    if (disconnected) return;
    res.json({ success: true, pack, steps });
  } catch (err: any) {
    console.error("[Agent Error]", err);
    if (disconnected) return;
    res.status(500).json({
      success: false,
      error: err?.message ?? "Lỗi không xác định khi tạo bộ câu hỏi.",
    });
  }
});

// ──────────────────────────────────────────────────────────
// POST /api/ai/generate-pack/stream
// Streaming SSE – gửi từng bước tiến trình rồi pack cuối cùng
// ──────────────────────────────────────────────────────────
app.post("/api/ai/generate-pack/stream", async (req: Request, res: Response) => {
  const { prompt } = req.body ?? {};

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ success: false, error: 'Thiếu "prompt".' });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const controller = new AbortController();
  let disconnected = false;
  req.on("close", () => {
    disconnected = true;
    controller.abort();
  });

  const send = (data: object) => {
    if (!disconnected) res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const pack = await generateQuestionPack({
      prompt: prompt.trim(),
      signal: controller.signal,
      onProgress: (step) => send({ type: "progress", step }),
    });
    if (!disconnected) send({ type: "done", pack });
  } catch (err: any) {
    if (!disconnected) send({ type: "error", error: err?.message });
  } finally {
    res.end();
  }
});

// ──────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: OPENROUTER_MODEL });
});

// ──────────────────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  const hasKey = !!process.env.OPENROUTER_API_KEY;
  console.log(`✅ AI Server đang chạy tại http://localhost:${PORT}`);
  console.log(`   Model            : ${OPENROUTER_MODEL}`);
  console.log(`   OpenRouter Key   : ${hasKey ? "✓ đã cấu hình" : "⚠ chưa cấu hình!"}`);
});
