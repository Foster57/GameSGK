/**
 * Agent Runner – Vòng lặp Agent kết nối MCP Server với DeepSeek
 *
 * Luồng hoạt động:
 *  1. Khởi tạo MCP Server (in-memory transport)
 *  2. Lấy danh sách Tools từ MCP Server → convert sang OpenAI format
 *  3. Gửi Prompt + Tools cho DeepSeek
 *  4. Nếu DeepSeek yêu cầu gọi Tool → gọi qua MCP Client → trả kết quả lại cho DeepSeek
 *  5. Lặp cho đến khi DeepSeek trả JSON cuối cùng (không còn tool_calls)
 */

import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { deepseek, DEEPSEEK_MODEL } from "./deepseekClient.js";
import { createQuestionMcpServer } from "../mcp/questionServer.js";

// Số vòng lặp tối đa để tránh vòng lặp vô tận
const MAX_TURNS = 8;

// System prompt – hướng dẫn DeepSeek cách dùng Tools
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

  // 2. Lấy danh sách Tools từ MCP Server và convert sang OpenAI format
  const { tools: mcpTools } = await mcpClient.listTools();
  const openaiTools = mcpTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description ?? "",
      parameters: t.inputSchema as Record<string, unknown>,
    },
  }));

  onProgress?.(`🛠 Đã tải ${mcpTools.length} tools: ${mcpTools.map(t => t.name).join(", ")}`);

  // 3. Khởi tạo message history
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  // 4. Agent Loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    onProgress?.(`🤖 DeepSeek đang suy luận (lượt ${turn + 1})...`);

    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages,
      tools: openaiTools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("DeepSeek không trả về kết quả.");

    const assistantMsg = choice.message;
    messages.push(assistantMsg as ChatCompletionMessageParam);

    // DeepSeek yêu cầu gọi tool
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        // Narrow union: chỉ xử lý tool call dạng "function"
        if (toolCall.type !== 'function') continue;
        const fnCall = toolCall as { id: string; type: 'function'; function: { name: string; arguments: string } };
        const toolName = fnCall.function.name;
        onProgress?.(`🔧 Gọi tool: ${toolName}`);

        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(fnCall.function.arguments);
        } catch {
          toolArgs = {};
        }


        // Gọi tool qua MCP Client
        const toolResult = await mcpClient.callTool({
          name: toolName,
          arguments: toolArgs,
        });

        // Trả kết quả tool về cho DeepSeek
        const toolContent =
          Array.isArray(toolResult.content) && toolResult.content.length > 0
            ? (toolResult.content[0] as any).text ?? JSON.stringify(toolResult.content)
            : JSON.stringify(toolResult);

        messages.push({
          role: "tool",
          tool_call_id: fnCall.id,
          content: toolContent,
        });

        onProgress?.(`✅ Tool ${toolName} trả kết quả thành công`);
      }

      // Tiếp tục vòng lặp để DeepSeek xử lý kết quả tool
      continue;
    }

    // DeepSeek trả nội dung cuối (không có tool_calls)
    const content = assistantMsg.content ?? "";
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
      throw new Error(`DeepSeek trả về nội dung không phải JSON hợp lệ:\n${content.slice(0, 300)}`);
    }
  }

  throw new Error(`Agent đã vượt quá ${MAX_TURNS} lượt suy luận mà chưa trả JSON cuối cùng.`);
}
