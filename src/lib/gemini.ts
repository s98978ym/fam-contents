import { GoogleGenerativeAI } from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Gemini API クライアント
// ---------------------------------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY ?? "";

/** API キーが設定されているかどうか */
export const isGeminiAvailable = apiKey.length > 0;

/** GoogleGenerativeAI インスタンス（遅延初期化） */
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _client = new GoogleGenerativeAI(apiKey);
  }
  return _client;
}

// ---------------------------------------------------------------------------
// 汎用テキスト生成
// ---------------------------------------------------------------------------

export interface GeminiGenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** JSON モードを有効にする（レスポンスをJSONとしてパース） */
  jsonMode?: boolean;
}

const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Gemini API でテキスト生成を実行する。
 * jsonMode: true の場合、レスポンスをパースして返す。
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

  const client = getClient();
  const genModel = client.getGenerativeModel({
    model,
    generationConfig: {
      temperature,
      maxOutputTokens,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const result = await genModel.generateContent(prompt);
  return result.response.text();
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
