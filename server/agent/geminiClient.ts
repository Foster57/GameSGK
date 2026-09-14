import { GoogleGenAI } from "@google/genai";

/**
 * Hàm lấy client Gemini một cách an toàn.
 * Tránh crash server khi khởi động nếu chưa điền API Key.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Chưa cấu hình API Key. Vui lòng tạo file .env ở thư mục gốc và khai báo GEMINI_API_KEY=..."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Gemini API client proxy
 * Cho phép các module gọi googleAI.models.generateContent(...) bình thường
 * mà không bị crash khi import nếu chưa có API Key.
 */
export const googleAI = new Proxy({} as GoogleGenAI, {
  get(_target, prop, receiver) {
    const client = getGeminiClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Model sử dụng – override qua env GEMINI_MODEL nếu cần */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";