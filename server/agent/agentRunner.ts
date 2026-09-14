/**
 * Agent Runner – Vòng lặp Agent kết nối MCP Server với Gemini
 *
 * Luồng hoạt động:
 *  1. Khởi tạo MCP Server (in-memory transport)
 *  2. Lấy danh sách Tools từ MCP Server → convert sang FunctionDeclaration
 *  3. Gửi Prompt + Tools cho Gemini
 *  4. Nếu Gemini yêu cầu gọi Tool → gọi qua MCP Client → trả kết quả lại cho Gemini
 *  5. Lặp cho đến khi Gemini trả JSON cuối cùng (không còn functionCall)
 */

import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Content } from "@google/genai";

import { googleAI, GEMINI_MODEL } from "./geminiClient.js";
import { createQuestionMcpServer } from "../mcp/questionServer.js";

// Số vòng lặp tối đa để tránh vòng lặp vô tận
const MAX_TURNS = 8;

// System prompt – hướng dẫn Gemini cách dùng Tools
const SYSTEM_PROMPT = `Bạn là chuyên gia thiết kế bộ câu hỏi giáo dục tương tác cho trò chơi học tập tiếng Việt.

## Nhiệm vụ
Dựa vào yêu cầu người dùng, tạo một QuestionPack hợp lệ với các dạng câu hỏi đa dạng:
fill_blank, categorize, matching, ordering.

## Quy trình BẮT BUỘC (theo đúng thứ tự)
1. Gọi tool \`get_pack_schema_and_examples\` để xem schema và ví dụ mẫu.
2. Soạn bộ câu hỏi (3–6 câu, đa dạng dạng câu hỏi, nội dung chính xác).
3. Gọi tool \`validate_question_pack\` để kiểm tra.
   - Nếu có lỗi → sửa → validate lại (tối đa 2 lần sửa).
4. Khi validate trả { "valid": true } → trả về JSON QuestionPack THUẦN (không bọc markdown/code block).

## Yêu cầu chất lượng
- Câu hỏi phải chính xác về mặt kiến thức.
- fill_blank: placeholder [slot1] PHẢI xuất hiện trong templateText; correctAnswer PHẢI có trong options.
- ordering: correctPosition là 0, 1, 2,... liên tục.
- categorize: targetCategoryId PHẢI khớp đúng một category.id.
- Thêm hint và explanation cho mỗi câu hỏi để hỗ trợ học tập.
- Trả về JSON THUẦN – KHÔNG bọc trong \`\`\`json hay bất kỳ text nào khác.`;

/**
 * Convert JSON Schema (MCP) sang Gemini Schema (OpenAPI 3.0, type chữ HOA).
 */
function toGeminiSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (value === undefined) continue;
    if (key === "type" && typeof value === "string") {
      result.type = value.toUpperCase();
    } else if (key === "properties" && typeof value === "object" && value !== null) {
      result.properties = Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v)])
      );
    } else if (key === "items") {
      result.items = toGeminiSchema(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Rút text từ kết quả tool MCP. */
function extractToolText(result: any): string {
  if (Array.isArray(result?.content) && result.content.length > 0) {
    const first = result.content[0];
    if (typeof first?.text === "string") return first.text;
    return JSON.stringify(result.content);
  }
  return JSON.stringify(result);
}

export interface GeneratePackOptions {
  prompt: string;       // Yêu cầu người dùng, ví dụ: "Tạo 5 câu về Lịch sử Việt Nam"
  onProgress?: (step: string) => void; // Callback theo dõi tiến trình (optional)
}

export async function generateQuestionPack(
  options: GeneratePackOptions
): Promise<any> {
  const { prompt, onProgress } = options;

  // 1. Khởi tạo MCP Server và kết nối Client (in-memory – không cần network)
  const mcpServer = createQuestionMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await mcpServer.connect(serverTransport);

  const mcpClient = new Client(
    { name: "question-generator-agent", version: "1.0.0" },
    { capabilities: {} }
  );
  await mcpClient.connect(clientTransport);

  onProgress?.("🔗 Đã kết nối MCP Server");

  // 2. Lấy danh sách Tools từ MCP Server và convert sang FunctionDeclaration
  const { tools: mcpTools } = await mcpClient.listTools();
  const functionDeclarations = mcpTools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    parameters: toGeminiSchema(t.inputSchema as Record<string, unknown>),
  }));

  onProgress?.(`🛠 Đã tải ${mcpTools.length} tools: ${mcpTools.map(t => t.name).join(", ")}`);

  // 3. Khởi tạo message history
  const contents: Content[] = [
    { role: "user", parts: [{ text: prompt }] },
  ];

  // 4. Agent Loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onProgress?.(`🤖 Gemini đang suy luận (lượt ${turn + 1})...`);

    const response = await googleAI.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations }],
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const candidate = response.candidates?.[0];
    const message = candidate?.content;
    if (!message) {
      throw new Error(
        `Gemini không trả về kết quả (finishReason: ${candidate?.finishReason ?? "?"}).`
      );
    }

    contents.push(message);

    // Gemini yêu cầu gọi tool
    const functionCalls = (message.parts ?? []).filter((p) => p.functionCall);

    if (functionCalls.length > 0) {
      const functionResponses: Content["parts"] = [];

      for (const part of functionCalls) {
        const fc = part.functionCall!;
        const toolName = fc.name ?? "";
        onProgress?.(`🔧 Gọi tool: ${toolName}`);

        // Gọi tool qua MCP Client
        const toolResult = await mcpClient.callTool({
          name: toolName,
          arguments: fc.args ?? {},
        });

        // Trả kết quả tool về cho Gemini
        const text = extractToolText(toolResult);
        let responseObj: Record<string, unknown>;
        try {
          responseObj = JSON.parse(text);
        } catch {
          responseObj = { output: text };
        }

        functionResponses.push({
          functionResponse: { id: fc.id, name: toolName, response: responseObj },
        });

        onProgress?.(`✅ Tool ${toolName} trả kết quả thành công`);
      }

      contents.push({ role: "user", parts: functionResponses });

      // Tiếp tục vòng lặp để Gemini xử lý kết quả tool
      continue;
    }

    // Gemini trả nội dung cuối (không có functionCall)
    const content = (message.parts ?? [])
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("");
    onProgress?.("📦 Đang parse JSON kết quả...");

    // Loại bỏ markdown code block nếu có (phòng ngừa)
    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    try {
      const pack = JSON.parse(cleaned);
      onProgress?.("✨ Đã tạo bộ câu hỏi thành công!");
      return pack;
    } catch (e) {
      throw new Error(`Gemini trả về nội dung không phải JSON hợp lệ:\n${content.slice(0, 300)}`);
    }
  }

  throw new Error(`Agent đã vượt quá ${MAX_TURNS} lượt suy luận mà chưa trả JSON cuối cùng.`);
}