/**
 * Agent Runner – Vòng lặp Agent kết nối MCP Server với OpenRouter (OpenAI-compatible)
 *
 * Luồng hoạt động:
 *  1. Khởi tạo MCP Server (in-memory transport)
 *  2. Lấy danh sách Tools từ MCP Server → convert sang format OpenAI Tools
 *  3. Gửi Prompt + Tools cho OpenRouter
 *  4. Nếu AI yêu cầu gọi Tool (tool_calls) → gọi qua MCP Client → trả kết quả lại cho AI
 *  5. Lặp cho đến khi AI trả JSON QuestionPack cuối cùng (không còn tool_calls)
 */

import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { OpenAI } from "openai";

import { openai, OPENROUTER_MODEL } from "./openAI.js";
import { createQuestionMcpServer } from "../mcp/questionServer.js";

// Số vòng lặp tối đa để tránh vòng lặp vô tận
const MAX_TURNS = 8;

// System prompt – hướng dẫn AI cách dùng Tools
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

/** Rút text từ kết quả tool MCP. */
function extractToolText(result: any): string {
  if (Array.isArray(result?.content) && result.content.length > 0) {
    const first = result.content[0];
    if (typeof first?.text === "string") return first.text;
    return JSON.stringify(result.content);
  }
  return JSON.stringify(result);
}

/**
 * Hàm trích xuất JSON an toàn từ phản hồi của AI
 * Xử lý cả dạng JSON thuần lẫn markdown code block hoặc text kèm JSON.
 */
function parseJsonFromResponse(text: string): any {
  const trimmed = text.trim();

  // 1. Parse trực tiếp
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Bóc tách từ code block ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Tìm khối JSON object {...}
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  throw new Error(`AI trả về nội dung không phải JSON hợp lệ:\n${trimmed.slice(0, 300)}`);
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

  // 2. Lấy danh sách Tools từ MCP Server và convert sang format OpenAI Tools
  const { tools: mcpTools } = await mcpClient.listTools();
  const openAiTools: OpenAI.Chat.ChatCompletionTool[] = mcpTools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: (t.inputSchema as Record<string, unknown>) ?? {
        type: "object",
        properties: {},
      },
    },
  }));

  onProgress?.(`🛠 Đã tải ${mcpTools.length} tools: ${mcpTools.map((t) => t.name).join(", ")}`);

  // 3. Khởi tạo message history theo chuẩn OpenAI Chat Completion
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  // 4. Agent Loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onProgress?.(`🤖 OpenRouter AI đang suy luận (lượt ${turn + 1})...`);

    const response = await openai.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      tools: openAiTools.length > 0 ? openAiTools : undefined,
      temperature: 0.7,
    });

    const choice = response.choices?.[0];
    const message = choice?.message;
    if (!message) {
      throw new Error("AI không trả về kết quả.");
    }

    // Đưa phản hồi của assistant vào lịch sử hội thoại
    messages.push(message);

    // Kiểm tra xem AI có yêu cầu gọi Tool không
    const toolCalls = message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          toolArgs = {};
        }

        onProgress?.(`🔧 Gọi tool: ${toolName}`);

        // Gọi tool qua MCP Client
        let text: string;
        try {
          const toolResult = await mcpClient.callTool({
            name: toolName,
            arguments: toolArgs,
          });
          text = extractToolText(toolResult);
        } catch (toolErr: any) {
          text = JSON.stringify({ error: toolErr?.message ?? "Lỗi thực thi tool" });
        }

        // Trả kết quả tool về lịch sử chat theo format tool response của OpenAI
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: text,
        });

        onProgress?.(`✅ Tool ${toolName} trả kết quả thành công`);
      }

      // Tiếp tục vòng lặp để AI phân tích kết quả trả về của tool
      continue;
    }

    // AI trả nội dung cuối (không còn yêu cầu gọi tool nào)
    const content = message.content ?? "";
    if (!content.trim()) {
      throw new Error(`AI không trả về nội dung (finish_reason: ${choice.finish_reason ?? "unknown"}).`);
    }

    onProgress?.("📦 Đang parse JSON kết quả...");

    try {
      const pack = parseJsonFromResponse(content);
      onProgress?.("✨ Đã tạo bộ câu hỏi thành công!");
      return pack;
    } catch (e: any) {
      throw new Error(e.message || "Lỗi parse JSON kết quả từ AI");
    }
  }

  throw new Error(`Agent đã vượt quá ${MAX_TURNS} lượt suy luận mà chưa trả JSON cuối cùng.`);
}