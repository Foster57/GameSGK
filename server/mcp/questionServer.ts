/**
 * MCP Server: Question Pack Tools
 *
 * Cung cấp 2 tools cho DeepSeek Agent:
 *   1. get_pack_schema_and_examples  – Trả về schema + ví dụ mẫu đầy đủ 4 dạng câu hỏi
 *   2. validate_question_pack        – Kiểm tra QuestionPack hợp lệ theo types.ts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ──────────────────────────────────────────────────────────────
// Types (mirror từ src/types.ts – không import cross-module)
// ──────────────────────────────────────────────────────────────

type QuestionType = "fill_blank" | "categorize" | "matching" | "ordering";

interface FillBlankSlot   { id: string; correctAnswer: string; }
interface CategoryBucket  { id: string; name: string; description?: string; color?: string; }
interface CategoryItem    { id: string; text: string; targetCategoryId: string; }
interface MatchPair       { id: string; left: string; right: string; leftSubtext?: string; rightSubtext?: string; }
interface OrderItem       { id: string; text: string; detail?: string; correctPosition: number; }

// ──────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────

function validatePack(pack: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Pack-level
  if (!pack || typeof pack !== "object") return { valid: false, errors: ["pack phải là object."] };
  if (!pack.id)          errors.push("Thiếu pack.id.");
  if (!pack.title)       errors.push("Thiếu pack.title.");
  if (!pack.description) errors.push("Thiếu pack.description.");
  if (!pack.category)    errors.push("Thiếu pack.category.");
  if (!["Dễ", "Trung bình", "Nâng cao"].includes(pack.difficulty))
    errors.push(`pack.difficulty không hợp lệ: "${pack.difficulty}". Phải là "Dễ" | "Trung bình" | "Nâng cao".`);
  if (!pack.icon)  errors.push('Thiếu pack.icon (ví dụ: "Sparkles", "Atom", "Layers").');
  if (!pack.color) errors.push('Thiếu pack.color (ví dụ: "indigo", "emerald", "amber").');

  if (!Array.isArray(pack.questions) || pack.questions.length === 0) {
    errors.push("pack.questions phải là mảng có ít nhất 1 câu hỏi.");
    return { valid: false, errors };
  }

  const VALID_TYPES: QuestionType[] = ["fill_blank", "categorize", "matching", "ordering"];

  for (const [i, q] of pack.questions.entries()) {
    const pre = `Câu ${i + 1} [${q.type ?? "?"}][id="${q.id ?? "?"}"]`;

    if (!q.id)    errors.push(`${pre}: Thiếu "id".`);
    if (!q.title) errors.push(`${pre}: Thiếu "title".`);

    if (!q.type || !VALID_TYPES.includes(q.type)) {
      errors.push(`${pre}: type không hợp lệ. Phải là: ${VALID_TYPES.join(" | ")}.`);
      continue;
    }

    // ── fill_blank ──────────────────────────────────────────
    if (q.type === "fill_blank") {
      if (!q.templateText) errors.push(`${pre}: Thiếu "templateText".`);

      if (!Array.isArray(q.slots) || q.slots.length === 0) {
        errors.push(`${pre}: "slots" phải là mảng có ít nhất 1 phần tử.`);
      } else {
        for (const slot of q.slots as FillBlankSlot[]) {
          if (!slot.id)            errors.push(`${pre}: slot thiếu "id".`);
          if (!slot.correctAnswer) errors.push(`${pre}: slot thiếu "correctAnswer".`);
          // Placeholder [slotId] PHẢI có trong templateText
          if (q.templateText && !q.templateText.includes(`[${slot.id}]`))
            errors.push(`${pre}: templateText thiếu placeholder "[${slot.id}]".`);
          // correctAnswer PHẢI nằm trong options
          if (Array.isArray(q.options) && !q.options.includes(slot.correctAnswer))
            errors.push(`${pre}: correctAnswer "${slot.correctAnswer}" (slot "${slot.id}") không có trong "options".`);
        }
      }

      if (!Array.isArray(q.options) || q.options.length < (q.slots?.length ?? 1))
        errors.push(`${pre}: "options" phải có ít nhất ${q.slots?.length ?? 1} phần tử.`);
    }

    // ── categorize ─────────────────────────────────────────
    else if (q.type === "categorize") {
      if (!Array.isArray(q.categories) || q.categories.length < 2) {
        errors.push(`${pre}: "categories" phải có ít nhất 2 phần tử.`);
      } else {
        const catIds = new Set(q.categories.map((c: CategoryBucket) => c.id));
        for (const cat of q.categories as CategoryBucket[]) {
          if (!cat.id || !cat.name) errors.push(`${pre}: category thiếu "id" hoặc "name".`);
        }
        if (!Array.isArray(q.items) || q.items.length === 0) {
          errors.push(`${pre}: "items" phải có ít nhất 1 phần tử.`);
        } else {
          for (const item of q.items as CategoryItem[]) {
            if (!item.id || !item.text) errors.push(`${pre}: item thiếu "id" hoặc "text".`);
            if (!catIds.has(item.targetCategoryId))
              errors.push(`${pre}: item "${item.text}" có targetCategoryId "${item.targetCategoryId}" không khớp bất kỳ category.id nào.`);
          }
        }
      }
    }

    // ── matching ────────────────────────────────────────────
    else if (q.type === "matching") {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) {
        errors.push(`${pre}: "pairs" phải có ít nhất 2 cặp.`);
      } else {
        for (const p of q.pairs as MatchPair[]) {
          if (!p.id || !p.left || !p.right)
            errors.push(`${pre}: pair thiếu "id", "left" hoặc "right".`);
        }
      }
    }

    // ── ordering ────────────────────────────────────────────
    else if (q.type === "ordering") {
      if (!Array.isArray(q.items) || q.items.length < 2) {
        errors.push(`${pre}: "items" phải có ít nhất 2 phần tử.`);
      } else {
        for (const item of q.items as OrderItem[]) {
          if (!item.id || !item.text || item.correctPosition === undefined)
            errors.push(`${pre}: item thiếu "id", "text" hoặc "correctPosition".`);
        }
        // correctPosition phải là dãy 0, 1, 2,... liên tục không trùng
        const positions = (q.items as OrderItem[]).map(it => it.correctPosition).sort((a, b) => a - b);
        const ok = positions.every((pos, idx) => pos === idx);
        if (!ok)
          errors.push(`${pre}: "correctPosition" phải là dãy 0, 1, 2,... liên tục không trùng. Nhận: [${positions.join(", ")}].`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ──────────────────────────────────────────────────────────────
// Schema description + Example JSON (dùng cho tool 1)
// ──────────────────────────────────────────────────────────────

const SCHEMA_TEXT = `
## Cấu trúc QuestionPack

interface QuestionPack {
  id: string;          // "pack-<slug>"
  title: string;
  description: string;
  category: string;    // Ví dụ: "Lịch Sử", "Toán Học"
  difficulty: "Dễ" | "Trung bình" | "Nâng cao";
  icon: string;        // "Sparkles" | "Atom" | "Languages" | "MapPin" | "Code2" | "Layers"
  color: string;       // "indigo" | "emerald" | "violet" | "amber" | "rose" | "cyan"
  questions: Question[]; // 3–10 câu
}

// fill_blank  → templateText có [slot1],[slot2],...
//               slots[]: { id, correctAnswer }  ← correctAnswer PHẢI nằm trong options[]
//               options[]: đáp án đúng + distractors
//               ⚠ "[slot1]" PHẢI xuất hiện nguyên văn trong templateText

// categorize  → categories[]: { id, name, description?, color? }  (≥2)
//               items[]:      { id, text, targetCategoryId }
//               ⚠ targetCategoryId PHẢI khớp đúng một category.id

// matching    → pairs[]: { id, left, right, leftSubtext?, rightSubtext? }  (≥2 cặp)
//               distractors?: string[]

// ordering    → items[]: { id, text, detail?, correctPosition: number }
//               ⚠ correctPosition là 0, 1, 2,... liên tục, KHÔNG trùng
`.trim();

const EXAMPLE_JSON = JSON.stringify({
  id: "pack-lich-su-vn",
  title: "Lịch Sử Việt Nam Cơ Bản",
  description: "Kiểm tra kiến thức lịch sử Việt Nam qua 4 dạng câu hỏi tương tác.",
  category: "Lịch Sử",
  difficulty: "Trung bình",
  icon: "Layers",
  color: "amber",
  questions: [
    {
      id: "q1",
      type: "fill_blank",
      title: "Thủ đô và Ngày Độc Lập",
      instruction: "Kéo từ thích hợp vào chỗ trống.",
      templateText: "Thủ đô Việt Nam là [slot1]. Ngày [slot2]/9/1945 Bác Hồ đọc Tuyên ngôn Độc lập.",
      slots: [
        { id: "slot1", correctAnswer: "Hà Nội" },
        { id: "slot2", correctAnswer: "2" }
      ],
      options: ["Hà Nội", "2", "Đà Nẵng", "3", "Huế"],
      hint: "Hà Nội là thủ đô; Tuyên ngôn Độc lập ngày 2/9/1945.",
      explanation: "Hà Nội là thủ đô từ năm 1010. Ngày 2/9/1945, Bác Hồ đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.",
      points: 15
    },
    {
      id: "q2",
      type: "matching",
      title: "Ghép đôi Triều đại – Vị Vua",
      instruction: "Kéo tên vua sang triều đại tương ứng.",
      pairs: [
        { id: "p1", left: "Triều Lý",     right: "Lý Thái Tổ",     leftSubtext: "1009–1225" },
        { id: "p2", left: "Triều Trần",   right: "Trần Thái Tông", leftSubtext: "1225–1400" },
        { id: "p3", left: "Triều Nguyễn", right: "Gia Long",       leftSubtext: "1802–1945" }
      ],
      distractors: ["Ngô Quyền", "Đinh Tiên Hoàng"],
      hint: "Triều Lý do Lý Công Uẩn (Lý Thái Tổ) lập năm 1009.",
      explanation: "Lý Thái Tổ dời đô về Thăng Long 1010; Gia Long thống nhất đất nước 1802.",
      points: 20
    },
    {
      id: "q3",
      type: "ordering",
      title: "Sắp xếp Triều đại theo Thời Gian",
      instruction: "Kéo thả sắp xếp theo thứ tự thời gian từ sớm đến muộn.",
      items: [
        { id: "o1", text: "Nhà Ngô",  detail: "938–965",   correctPosition: 0 },
        { id: "o2", text: "Nhà Đinh", detail: "968–980",   correctPosition: 1 },
        { id: "o3", text: "Nhà Lý",   detail: "1009–1225", correctPosition: 2 },
        { id: "o4", text: "Nhà Trần", detail: "1225–1400", correctPosition: 3 }
      ],
      hint: "Ngô → Đinh → (Tiền Lê) → Lý → Trần...",
      explanation: "Thứ tự: Ngô, Đinh, Tiền Lê, Lý, Trần, Hồ, Lê sơ...",
      points: 20
    },
    {
      id: "q4",
      type: "categorize",
      title: "Phân loại Nhân vật theo Thời Kỳ",
      instruction: "Kéo tên nhân vật vào đúng thời kỳ lịch sử.",
      categories: [
        { id: "phong-kien", name: "Thời kỳ Phong kiến",       description: "Trước 1858", color: "amber" },
        { id: "can-hien-dai", name: "Thời kỳ Cận – Hiện đại", description: "Từ 1858",    color: "indigo" }
      ],
      items: [
        { id: "h1", text: "Trần Hưng Đạo", targetCategoryId: "phong-kien"    },
        { id: "h2", text: "Nguyễn Trãi",   targetCategoryId: "phong-kien"    },
        { id: "h3", text: "Hồ Chí Minh",   targetCategoryId: "can-hien-dai"  },
        { id: "h4", text: "Phan Bội Châu", targetCategoryId: "can-hien-dai"  }
      ],
      hint: "Trần Hưng Đạo (thế kỷ 13), Nguyễn Trãi (thế kỷ 15) là phong kiến.",
      explanation: "Hồ Chí Minh và Phan Bội Châu hoạt động sau 1858 – thời cận hiện đại.",
      points: 15
    }
  ]
}, null, 2);

// ──────────────────────────────────────────────────────────────
// Tạo và export MCP Server
// ──────────────────────────────────────────────────────────────

export function createQuestionMcpServer(): Server {
  const server = new Server(
    { name: "question-pack-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── Danh sách Tools ──────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_pack_schema_and_examples",
        description:
          "Trả về schema TypeScript và ví dụ JSON đầy đủ của QuestionPack (4 dạng câu hỏi). " +
          "Gọi tool này TRƯỚC khi bắt đầu sinh câu hỏi để tham chiếu format chính xác.",
        inputSchema: { type: "object", properties: {}, required: [] },
      },
      {
        name: "validate_question_pack",
        description:
          "Kiểm tra tính hợp lệ của QuestionPack đã sinh: đủ fields, placeholder [slotId] khớp templateText, " +
          "correctAnswer nằm trong options, targetCategoryId khớp category.id, correctPosition liên tục 0-based. " +
          "Gọi SAU khi sinh câu hỏi, TRƯỚC khi trả kết quả. Nếu có lỗi → tự sửa → validate lại.",
        inputSchema: {
          type: "object",
          properties: {
            pack: {
              type: "object",
              description: "Object QuestionPack đầy đủ cần kiểm tra (KHÔNG phải string).",
            },
          },
          required: ["pack"],
        },
      },
    ],
  }));

  // ── Xử lý Tool Call ──────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;

    // Tool 1: Trả schema + example
    if (name === "get_pack_schema_and_examples") {
      return {
        content: [{
          type: "text",
          text: `${SCHEMA_TEXT}\n\n## Ví dụ JSON mẫu\n\`\`\`json\n${EXAMPLE_JSON}\n\`\`\``,
        }],
      };
    }

    // Tool 2: Validate
    if (name === "validate_question_pack") {
      const pack = request.params.arguments?.pack;
      if (!pack) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              valid: false,
              errors: ['Thiếu argument "pack". Truyền object QuestionPack vào field "pack".'],
            }),
          }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(validatePack(pack), null, 2) }],
      };
    }

    // Tool không tồn tại
    return {
      isError: true,
      content: [{
        type: "text",
        text: JSON.stringify({
          error: `Tool "${name}" không tồn tại. Tools hợp lệ: get_pack_schema_and_examples, validate_question_pack.`,
        }),
      }],
    };
  });

  return server;
}
