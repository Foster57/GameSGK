/**
 * Express API Server
 * Cung cấp endpoint để frontend React gọi tạo bộ câu hỏi bằng AI.
 */

import "dotenv/config";
import express, { Request, Response } from "express";
import { generateQuestionPack } from "./agent/agentRunner.js";

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

  try {
    const steps: string[] = [];
    const pack = await generateQuestionPack({
      prompt: prompt.trim(),
      onProgress: (step) => {
        console.log(`[Agent] ${step}`);
        steps.push(step);
      },
    });

    res.json({ success: true, pack, steps });
  } catch (err: any) {
    console.error("[Agent Error]", err);
    res.status(500).json({
      success: false,
      error: err.message ?? "Lỗi không xác định khi tạo bộ câu hỏi.",
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

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const pack = await generateQuestionPack({
      prompt: prompt.trim(),
      onProgress: (step) => send({ type: "progress", step }),
    });
    send({ type: "done", pack });
  } catch (err: any) {
    send({ type: "error", error: err.message });
  } finally {
    res.end();
  }
});

// ──────────────────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash" });
});

// ──────────────────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`✅ AI Server đang chạy tại http://localhost:${PORT}`);
  console.log(`   Gemini Model     : ${process.env.GEMINI_MODEL ?? "gemini-3.0-flash"}`);
  console.log(`   API Key          : ${process.env.GEMINI_API_KEY ? "✓ đã cấu hình" : "⚠ chưa cấu hình!"}`);
});
