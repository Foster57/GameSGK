import { OpenAI } from "openai";

let cachedClient: OpenAI | null = null;

/**
 * Hàm lấy OpenRouter client một cách an toàn.
 * Tránh crash server khi khởi động nếu chưa điền API Key.
 */
export function getOpenRouterClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Chưa cấu hình API Key. Vui lòng khai báo OPENROUTER_API_KEY=... trong file .env"
    );
  }

  const baseURL =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  cachedClient = new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
      "X-Title": "GameSGK Question Generator",
    },
  });

  return cachedClient;
}

/**
 * OpenRouter API client proxy
 * Cho phép các module gọi openai.chat.completions.create(...) bình thường
 * mà không bị crash khi import nếu chưa có API Key.
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getOpenRouterClient();
    const val = (client as any)[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

/** Model sử dụng trên OpenRouter – override qua env OPENROUTER_MODEL nếu cần */
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";