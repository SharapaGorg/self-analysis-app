import Anthropic from "@anthropic-ai/sdk";

export interface ThreeFields {
  mistakes: string;
  wins: string;
  conclusions: string;
}

export interface DayReview {
  date: string;
  mistakes: string | null;
  wins: string | null;
  conclusions: string | null;
}

/**
 * A model caller: given a prompt, returns the model's raw text output (which
 * we expect to be a JSON object with the three fields). Injectable so tests
 * don't need network access or the SDK.
 */
export type LlmCaller = (prompt: string) => Promise<string>;

const MODEL = "claude-haiku-4-5";

const SCHEMA = {
  type: "object",
  properties: {
    mistakes: { type: "string" },
    wins: { type: "string" },
    conclusions: { type: "string" },
  },
  required: ["mistakes", "wins", "conclusions"],
  additionalProperties: false,
} as const;

function defaultCaller(): LlmCaller {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан");
  }
  const client = new Anthropic({ apiKey });
  return async (prompt: string) => {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text : "";
  };
}

function parseThree(raw: string): ThreeFields | null {
  try {
    const obj = JSON.parse(raw) as Partial<ThreeFields>;
    if (
      typeof obj.mistakes === "string" &&
      typeof obj.wins === "string" &&
      typeof obj.conclusions === "string"
    ) {
      return { mistakes: obj.mistakes, wins: obj.wins, conclusions: obj.conclusions };
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * Split a single free-text day review into mistakes / wins / conclusions.
 * On an unparseable model response, falls back to placing the whole text into
 * conclusions so no content is lost.
 */
export async function splitReview(
  text: string,
  call: LlmCaller = defaultCaller(),
): Promise<ThreeFields> {
  const prompt = `Разложи этот дневной ретроспективный текст на три поля — ошибки, победы, выводы.
Верни строго JSON вида {"mistakes": "...", "wins": "...", "conclusions": "..."}.
Что не относится к ошибкам или победам — помести в выводы. Не выдумывай, используй только текст.

Текст:
"""
${text}
"""`;
  const raw = await call(prompt);
  return parseThree(raw) ?? { mistakes: "", wins: "", conclusions: text };
}

/**
 * Summarize the mistakes/wins/conclusions of many days into a single
 * period-level summary (same three fields). Throws if the model response can't
 * be parsed — the caller surfaces that as an error.
 */
export async function summarizeReviews(
  days: DayReview[],
  call: LlmCaller = defaultCaller(),
): Promise<ThreeFields> {
  const body = days
    .map((d) => {
      const parts = [
        d.mistakes ? `  Ошибки: ${d.mistakes}` : null,
        d.wins ? `  Победы: ${d.wins}` : null,
        d.conclusions ? `  Выводы: ${d.conclusions}` : null,
      ].filter(Boolean);
      return `День ${d.date}:\n${parts.join("\n") || "  (пусто)"}`;
    })
    .join("\n\n");

  const prompt = `Ниже — записи за несколько дней (ошибки, победы, выводы по каждому дню).
Сделай сжатую сводку за весь период: выдели главные ошибки, главные победы и ключевые выводы.
Верни строго JSON вида {"mistakes": "...", "wins": "...", "conclusions": "..."}.

${body}`;
  const raw = await call(prompt);
  const parsed = parseThree(raw);
  if (!parsed) throw new Error("Модель вернула неразборчивый ответ");
  return parsed;
}
