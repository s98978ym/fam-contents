import { HttpsProxyAgent } from "https-proxy-agent";
import https from "https";

// ---------------------------------------------------------------------------
// Gemini API クライアント（REST直接呼び出し + プロキシ対応）
// ---------------------------------------------------------------------------

const apiKey = process.env.GEMINI_API_KEY ?? "";

/** API キーが設定されているかどうか */
export const isGeminiAvailable = apiKey.length > 0;

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.0-flash";

// ---------------------------------------------------------------------------
// プロキシ対応 HTTP リクエスト
// ---------------------------------------------------------------------------

function getAgent(): https.Agent | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

async function geminiPost(
  model: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
  const payload = JSON.stringify(body);
  const agent = getAgent();

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        ...(agent ? { agent } : {}),
      },
      (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
          data += chunk;
        });
        resp.on("end", () => {
          if (resp.statusCode && resp.statusCode >= 400) {
            reject(new Error(`Gemini API ${resp.statusCode}: ${data.substring(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from Gemini: ${data.substring(0, 200)}`));
          }
        });
      }
    );
    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
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
