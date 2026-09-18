/**
 * Frontend service – Gọi AI server để sinh bộ câu hỏi.
 * Hỗ trợ cả 2 chế độ: fetch thông thường và SSE streaming.
 */

import { QuestionPack } from '../../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? '';

// ─────────────────────────────────────────────────────────────
// Chế độ 1: Gọi thẳng, trả kết quả một lần
// ─────────────────────────────────────────────────────────────
export async function generatePackWithAI(prompt: string): Promise<QuestionPack> {
  const res = await fetch(`${API_BASE}/api/ai/generate-pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? 'Không thể tạo bộ câu hỏi.');
  return data.pack as QuestionPack;
}

// ─────────────────────────────────────────────────────────────
// Chế độ 2: SSE Streaming – nhận từng bước tiến trình
// ─────────────────────────────────────────────────────────────
export interface StreamCallbacks {
  onProgress: (step: string) => void;
  onDone: (pack: QuestionPack) => void;
  onError: (error: string) => void;
}

export function generatePackWithAIStream(
  prompt: string,
  callbacks: StreamCallbacks
): () => void {
  const controller = new AbortController();
  let settled = false;

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/ai/generate-pack/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Server lỗi: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (!settled) {
                if (event.type === 'progress') callbacks.onProgress(event.step);
                else if (event.type === 'done') { settled = true; callbacks.onDone(event.pack); }
                else if (event.type === 'error') { settled = true; callbacks.onError(event.error); }
              }
            } catch { /* bỏ qua dòng parse lỗi */ }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        throw err;
      }
    } catch (err: any) {
      if (!settled && !controller.signal.aborted)
        callbacks.onError(err?.message ?? 'Lỗi kết nối server.');
    }
  })();

  return () => { settled = true; controller.abort(); };
}
