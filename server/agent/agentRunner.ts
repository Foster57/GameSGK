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

// Số vòng lặp tối đa cho agent loop (đảm bảo đủ lượt gọi tool validate và sửa lỗi nếu có)
const MAX_TURNS = 5;

// System prompt – hướng dẫn AI cách thiết kế bộ câu hỏi và dùng Tools
const SYSTEM_PROMPT = `Bạn là chuyên gia sư phạm thiết kế bộ câu hỏi giáo dục tương tác chất lượng cao cho trò chơi học tập tiếng Việt.

## NHIỆM VỤ
Dựa vào yêu cầu của người dùng(chủ đề, độ tuổi, lớp, số lượng, độ khó, ...), tạo một QuestionPack JSON hoàn chỉnh, chính xác về mặt kiến thức, có tính giáo dục và hấp dẫn.

### Quy định số lượng và dạng câu hỏi:
- Số lượng: 3–6 câu(mặc định 4 câu nếu người dùng không yêu cầu cụ thể).
- 4 dạng câu hỏi được hỗ trợ: \`fill_blank\`, \`categorize\`, \`matching\`, \`ordering\`.
- Đa dạng hóa:
  - Nếu từ 4 câu trở lên: BẮT BUỘC có đủ cả 4 dạng câu hỏi.
  - Nếu 3 câu: sử dụng 3 dạng khác nhau.
  - Tránh lặp lại cùng một dạng nếu không có yêu cầu đặc biệt.

---

## CẤU TRÚC QUESTIONPACK & RÀNG BUỘC CHẶT CHẼ

Một QuestionPack hợp lệ PHẢI tuân thủ 100% cấu trúc và kiểu dữ liệu sau (validator sẽ kiểm tra tự động):

\`\`\`json
{
  "id": "pack-<slug-khong-dau>",
  "title": "Tiêu đề ngắn gọn, hấp dẫn",
  "description": "Mô tả ngắn 1-2 câu về nội dung và mục tiêu học tập",
  "category": "Địa Lý" | "Lịch Sử" | "Khoa Học" | "Tiếng Việt" | ...,
  "difficulty": "Dễ" | "Trung bình" | "Nâng cao",
  "icon": "Sparkles" | "Atom" | "Languages" | "MapPin" | "Code2" | "Layers" | "Compass",
  "color": "indigo" | "emerald" | "violet" | "amber" | "rose" | "cyan",
  "questions": [ ... ]
}
\`\`\`

### ⚠️ Các ràng buộc Pack cấp cao:
- \`difficulty\`: BẮT BUỘC chỉ được là 1 trong 3 chuỗi chính xác: \`"Dễ"\` | \`"Trung bình"\` | \`"Nâng cao"\` (KHÔNG dùng tiếng Anh hay từ khác).
- \`icon\`: BẮT BUỘC chọn 1 icon phù hợp trong danh sách trên.
- \`color\`: BẮT BUỘC chọn 1 màu trong danh sách trên.

---

## CHI TIẾT 4 DẠNG CÂU HỎI

Mỗi câu hỏi đều phải có các thuộc tính chung:
- \`id\`: "q1", "q2", "q3",...
- \`title\`: Tiêu đề câu hỏi ngắn gọn.
- \`hint\`: Gợi ý thông minh cho học sinh (không làm lộ đáp án hoàn toàn).
- \`explanation\`: Giải thích súc tích, chính xác vì sao đáp án đó đúng.
- \`points\`: Số điểm (10, 15, hoặc 20).

### 1. Dạng Điền vào chỗ trống (\`fill_blank\`)
- \`templateText\`: Chuỗi văn bản chứa placeholder dạng \`[slot1]\`, \`[slot2]\`,... (ví dụ: "Thủ đô của Việt Nam là [slot1], nằm bên bờ sông [slot2].")
- \`slots\`: Mảng các ô trống: \`[ { "id": "slot1", "correctAnswer": "Hà Nội" }, { "id": "slot2", "correctAnswer": "Hồng" } ]\`
- \`options\`: Mảng chuỗi các lựa chọn. BẮT BUỘC phải chứa toàn bộ các \`correctAnswer\` của các slots, CỘNG THÊM 2–3 đáp án nhiễu (distractors).
- ⚠️ QUY TẮC BẮT BUỘC:
  - Mọi \`[slotId]\` trong \`slots\` PHẢI xuất hiện nguyên văn trong \`templateText\`.
  - Mọi \`correctAnswer\` PHẢI nằm trong mảng \`options\`.

### 2. Dạng Phân loại nhóm (\`categorize\`)
- \`categories\`: Tối thiểu 2 nhóm phân loại:
  \`[ { "id": "cat1", "name": "Miền Bắc", "color": "emerald" }, { "id": "cat2", "name": "Miền Nam", "color": "amber" } ]\`
- \`items\`: Mảng các đối tượng cần phân loại (tối thiểu 4 items):
  \`[ { "id": "i1", "text": "Hà Giang", "targetCategoryId": "cat1" }, { "id": "i2", "text": "Cần Thơ", "targetCategoryId": "cat2" } ]\`
- ⚠️ QUY TẮC BẮT BUỘC: \`targetCategoryId\` của mỗi item PHẢI khớp chính xác với một \`category.id\`.

### 3. Dạng Ghép đôi (\`matching\`)
- \`pairs\`: Tối thiểu 2–4 cặp ghép tương ứng:
  \`[ { "id": "p1", "left": "Đỉnh Phan Xi Păng", "right": "3.143m", "leftSubtext": "Nóc nhà Đông Dương" }, ... ]\`
- \`distractors\`: (Tùy chọn) Mảng 1-2 chuỗi gây nhiễu cho cột bên phải: \`["2.800m", "4.000m"]\`.
- ⚠️ QUY TẮC BẮT BUỘC: Cặp ghép phải có mối quan hệ 1-1 rõ ràng, chính xác tuyệt đối.

### 4. Dạng Sắp xếp thứ tự (\`ordering\`)
- \`items\`: Mảng các mục cần sắp xếp (tối thiểu 3–4 items):
  \`[ { "id": "o1", "text": "Bắc Ninh", "detail": "Diện tích nhỏ nhất", "correctPosition": 0 }, { "id": "o2", "text": "Hà Nam", "correctPosition": 1 }, { "id": "o3", "text": "Nghệ An", "detail": "Diện tích lớn nhất", "correctPosition": 2 } ]\`
- ⚠️ QUY TẮC BẮT BUỘC: \`correctPosition\` BẮT BUỘC là dãy số nguyên liên tục bắt đầu từ 0: \`0, 1, 2, ...\` KHÔNG được trùng lặp, KHÔNG được cách quãng.

---

## QUY TRÌNH LÀM VIỆC CỦA AGENT

1. **Soạn thảo và Xác thực**:
   - Dựa vào yêu cầu người dùng và cấu trúc chuẩn ở trên, tạo draft QuestionPack.
   - BẮT BUỘC gọi tool \`validate_question_pack\` truyền tham số:
     \`{ "pack": <object QuestionPack vừa tạo> }\`
   - (Lưu ý: Tool \`get_pack_schema_and_examples\` luôn có sẵn nếu bạn muốn xem thêm ví dụ mẫu chi tiết).

2. **Xử lý phản hồi từ Validator**:
   - Nếu validator trả về \`{ "valid": false, "errors": [...] }\`:
     Đọc kỹ từng lỗi trong mảng \`errors\`, chỉnh sửa đúng vị trí lỗi đó trong JSON, rồi gọi lại \`validate_question_pack\`.
   - Nếu validator trả về \`{ "valid": true }\`:
     Bộ câu hỏi đã hoàn toàn hợp lệ!

3. **Trả kết quả cuối cùng (OUTPUT)**:
   - Trả về DUY NHẤT chuỗi JSON của QuestionPack (bắt đầu bằng \`{\` và kết thúc bằng \`}\`).
   - KHÔNG thêm bất kỳ lời chào, lời giải thích hay văn bản bên ngoài JSON.`;

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
  } catch { }

  // 2. Bóc tách từ code block ```json ... ``` hoặc ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?: json) ?\s * ([\s\S] *?) \s * ```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch { }
  }

  // 3. Tìm khối JSON object {...}
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch { }
  }

  throw new Error(`AI trả về nội dung không phải JSON hợp lệ: \n${trimmed.slice(0, 300)} `);
}

export interface GeneratePackOptions {
  prompt: string;       // Yêu cầu người dùng, ví dụ: "Tạo 5 câu về Lịch sử Việt Nam"
  onProgress?: (step: string) => void; // Callback theo dõi tiến trình (optional)
  signal?: AbortSignal; // Hủy tiến trình giữa chừng khi client ngắt kết nối (optional)
}

export async function generateQuestionPack(
  options: GeneratePackOptions
): Promise<any> {
  const { prompt, onProgress, signal } = options;

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

  onProgress?.(`🛠 Đã tải ${mcpTools.length} tools: ${mcpTools.map((t) => t.name).join(", ")} `);

  // 3. Khởi tạo message history theo chuẩn OpenAI Chat Completion
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];

  // 4. Agent Loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    signal?.throwIfAborted?.();

    onProgress?.(`🤖 OpenRouter AI đang suy luận(lượt ${turn + 1})...`);

    const response = await openai.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      tools: openAiTools.length > 0 ? openAiTools : undefined,
      temperature: 0.7,
    }, { signal });

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
        signal?.throwIfAborted?.();

        if (toolCall.type !== "function") continue;

        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          toolArgs = {};
        }

        onProgress?.(`🔧 Gọi tool: ${toolName} `);

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
      throw new Error(`AI không trả về nội dung(finish_reason: ${choice.finish_reason ?? "unknown"}).`);
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