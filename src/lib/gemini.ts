// ---------------------------------------------------------------------------
// Gemini API クライアント（fetch ベース — Vercel / Node.js 18+ 対応）
// ---------------------------------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY ?? "";

/** API キーが設定されているかどうか */
export const isGeminiAvailable = apiKey.length > 0;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Gemini REST API 呼び出し
// ---------------------------------------------------------------------------

async function geminiPost(
  model: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`Gemini API ${resp.status}: ${errorText.substring(0, 300)}`);
  }

  return resp.json();
}

// ---------------------------------------------------------------------------
// 汎用テキスト生成
// ---------------------------------------------------------------------------

export interface GeminiGenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** JSON モードを有効にする */
  jsonMode?: boolean;
}

/**
 * Gemini API でテキスト生成を実行する。
 */
export async function generateText(
  prompt: string,
  options: GeminiGenerateOptions = {}
): Promise<string> {
  const {
    model = DEFAULT_MODEL,
    temperature = 0.7,
    maxOutputTokens = 4096,
    jsonMode = false,
  } = options;

  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const result = await geminiPost(model, body);

  // レスポンスからテキストを抽出
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates = (result as any).candidates;
  if (!candidates || !candidates[0]?.content?.parts?.[0]?.text) {
    throw new Error("Unexpected Gemini response structure");
  }
  return candidates[0].content.parts[0].text;
}

/**
 * Gemini API でテキスト生成し、JSON としてパースして返す。
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  options: Omit<GeminiGenerateOptions, "jsonMode"> = {}
): Promise<T> {
  const text = await generateText(prompt, { ...options, jsonMode: true });
  return JSON.parse(text) as T;
}
