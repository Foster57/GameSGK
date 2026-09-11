import "dotenv/config";
import OpenAI from "openai";

/**
 * Hàm lấy client DeepSeek một cách an toàn.
 * Tránh crash server khi khởi động nếu chưa điền API Key.
 */
export function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.DEEP_AI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Chưa cấu hình API Key. Vui lòng tạo file .env ở thư mục gốc và khai báo DEEPSEEK_API_KEY=sk-..."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
  });
}

/**
 * DeepSeek API client proxy
 * Cho phép các module gọi deepseek.chat.completions.create(...) bình thường
 * mà không bị crash khi import nếu chưa có API Key.
 */
export const deepseek = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getDeepSeekClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Model sử dụng – override qua env DEEPSEEK_MODEL nếu cần */
export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
