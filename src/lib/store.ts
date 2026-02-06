/**
 * In-memory data store for FAM Content Ops.
 * Provides CRUD operations for all domain entities.
 * In production, replace with database/Google Sheets integration.
 */

import type {
  Campaign,
  ContentPackage,
  ChannelVariant,
  ReviewRecord,
  PublishJob,
  MetricDaily,
  KnowledgePost,
  KnowledgeComment,
} from "@/types/content_package";

import {
  sampleCampaigns,
  sampleContents,
  sampleVariants,
  sampleReviews,
  samplePublishJobs,
  sampleMetrics,
  sampleKnowledgePosts,
  sampleKnowledgeComments,
} from "./sample_data";

import {
  CONTENT_ANALYZE_PROMPT,
  CONTENT_GENERATE_PROMPT,
  KNOWLEDGE_PROOFREAD_PROMPT,
  KNOWLEDGE_EXTRACT_PROMPT,
} from "./system_prompt_defaults";

export interface PromptVersion {
  id: string;
  name: string;
  type: "planner" | "instagram" | "lp" | "note" | "line";
  version: number;
  prompt: string;
  changelog: string;
  created_at: string;
  created_by: string;
}

export interface SystemPromptConfig {
  id: string;
  key: string;
  name: string;
  description: string;
  category: "contents" | "knowledge";
  prompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  updated_at: string;
  updated_by: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  detail: string;
  created_at: string;
}

// --- Store singleton ---

const campaigns: Campaign[] = [...sampleCampaigns];
const contents: ContentPackage[] = [...sampleContents];
const variants: ChannelVariant[] = [...sampleVariants];
const reviews: ReviewRecord[] = [...sampleReviews];
const publishJobs: PublishJob[] = [...samplePublishJobs];
const metrics: MetricDaily[] = [...sampleMetrics];
const knowledgePosts: KnowledgePost[] = [...sampleKnowledgePosts];
const knowledgeComments: KnowledgeComment[] = [...sampleKnowledgeComments];
const promptVersions: PromptVersion[] = [
  {
    id: "pv_001",
    name: "Planner",
    type: "planner",
    version: 1,
    prompt: "あなたはFAMのスポーツ栄養コンテンツ企画担当AIです。...",
    changelog: "初版",
    created_at: "2026-02-01T09:00:00Z",
    created_by: "admin",
  },
  {
    id: "pv_002",
    name: "Instagram Adapter",
    type: "instagram",
    version: 1,
    prompt: "あなたはFAMのInstagramコンテンツ制作AIです。...",
    changelog: "初版",
    created_at: "2026-02-01T09:00:00Z",
    created_by: "admin",
  },
  {
    id: "pv_003",
    name: "LP Adapter",
    type: "lp",
    version: 1,
    prompt: "あなたはFAMのイベントLP制作AIです。...",
    changelog: "初版",
    created_at: "2026-02-01T09:00:00Z",
    created_by: "admin",
  },
  {
    id: "pv_004",
    name: "LINE Adapter",
    type: "line",
    version: 1,
    prompt: "あなたはFAMのLINE配信コンテンツ制作AIです。...",
    changelog: "初版",
    created_at: "2026-02-01T09:00:00Z",
    created_by: "admin",
  },
  {
    id: "pv_005",
    name: "note Adapter",
    type: "note",
    version: 1,
    prompt: "あなたはFAMのnote記事制作AIです。...",
    changelog: "初版",
    created_at: "2026-02-01T09:00:00Z",
    created_by: "admin",
  },
];
const systemPromptConfigs: SystemPromptConfig[] = [
  {
    id: "sp_001",
    key: "content_analyze",
    name: "素材分析",
    description: "アップロードされた素材ファイルを分析し、コンテンツ生成の方向性を判断するプロンプト",
    category: "contents",
    prompt: CONTENT_ANALYZE_PROMPT,
    model: "gemini-2.5-flash",
    temperature: 0.3,
    maxOutputTokens: 2048,
    updated_at: "2026-02-06T00:00:00Z",
    updated_by: "system",
  },
  {
    id: "sp_002",
    key: "content_generate",
    name: "コンテンツ生成",
    description: "チャネル向けコンテンツを生成するプロンプト（チャネル別出力フォーマットは自動付与）",
    category: "contents",
    prompt: CONTENT_GENERATE_PROMPT,
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxOutputTokens: 4096,
    updated_at: "2026-02-06T00:00:00Z",
    updated_by: "system",
  },
  {
    id: "sp_003",
    key: "knowledge_proofread",
    name: "ナレッジ発展",
    description: "短いメモや気づきを、チーム全体で活用できる実践的なナレッジに発展させるプロンプト",
    category: "knowledge",
    prompt: KNOWLEDGE_PROOFREAD_PROMPT,
    model: "gemini-2.5-flash",
    temperature: 0.7,
    maxOutputTokens: 4096,
    updated_at: "2026-02-06T00:00:00Z",
    updated_by: "system",
  },
  {
    id: "sp_004",
    key: "knowledge_extract",
    name: "ナレッジ抽出",
    description: "議事録・トランスクリプトから、チームに共有すべきナレッジを複数抽出するプロンプト",
    category: "knowledge",
    prompt: KNOWLEDGE_EXTRACT_PROMPT,
    model: "gemini-2.5-flash",
    temperature: 0.5,
    maxOutputTokens: 8192,
    updated_at: "2026-02-06T00:00:00Z",
    updated_by: "system",
  },
];
const auditLogs: AuditLog[] = [];

let idCounter = 100;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}_${String(idCounter).padStart(3, "0")}`;
}

function addAudit(action: string, entityType: string, entityId: string, actor: string, detail: string) {
  auditLogs.push({
    id: nextId("aud"),
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor,
    detail,
    created_at: new Date().toISOString(),
  });
}

// --- Campaigns ---
export const campaignStore = {
  list: () => campaigns,
  get: (id: string) => campaigns.find((c) => c.id === id),
  create: (data: Omit<Campaign, "id">) => {
    const c: Campaign = { ...data, id: nextId("camp") };
    campaigns.push(c);
    addAudit("create", "campaign", c.id, "system", JSON.stringify(c));
    return c;
  },
};

// --- Contents ---
export const contentStore = {
  list: () => contents,
  get: (id: string) => contents.find((c) => c.content_id === id),
  create: (data: Omit<ContentPackage, "content_id" | "version" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const c: ContentPackage = {
      ...data,
      content_id: nextId("cnt"),
      version: 1,
      created_at: now,
      updated_at: now,
    };
    contents.push(c);
    addAudit("create", "content", c.content_id, c.created_by, c.title);
    return c;
  },
  update: (id: string, patch: Partial<ContentPackage>) => {
    const idx = contents.findIndex((c) => c.content_id === id);
    if (idx === -1) return null;
    contents[idx] = { ...contents[idx], ...patch, updated_at: new Date().toISOString() };
    addAudit("update", "content", id, "system", JSON.stringify(patch));
    return contents[idx];
  },
};

// --- Variants ---
export const variantStore = {
  list: () => variants,
  listByContent: (contentId: string) => variants.filter((v) => v.content_id === contentId),
  create: (data: Omit<ChannelVariant, "id">) => {
    const v: ChannelVariant = { ...data, id: nextId("var") };
    variants.push(v);
    addAudit("create", "variant", v.id, "system", v.channel);
    return v;
  },
};

// --- Reviews ---
export const reviewStore = {
  list: () => reviews,
  create: (data: Omit<ReviewRecord, "id" | "created_at">) => {
    const r: ReviewRecord = { ...data, id: nextId("rev"), created_at: new Date().toISOString() };
    reviews.push(r);
    addAudit("review", "content", r.content_id, r.reviewer, `${r.role}: ${r.decision}`);
    return r;
  },
};

// --- Publish Jobs ---
export const publishJobStore = {
  list: () => publishJobs,
  create: (data: Omit<PublishJob, "id">) => {
    const j: PublishJob = { ...data, id: nextId("pj") };
    publishJobs.push(j);
    addAudit("create", "publish_job", j.id, "system", `${j.channel} -> ${j.status}`);
    return j;
  },
  update: (id: string, patch: Partial<PublishJob>) => {
    const idx = publishJobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;
    publishJobs[idx] = { ...publishJobs[idx], ...patch };
    addAudit("update", "publish_job", id, "system", JSON.stringify(patch));
    return publishJobs[idx];
  },
};

// --- Metrics ---
export const metricStore = {
  list: () => metrics,
  listByContent: (contentId: string) => metrics.filter((m) => m.content_id === contentId),
};

// --- Prompt Versions ---
export const promptVersionStore = {
  list: () => promptVersions,
  create: (data: Omit<PromptVersion, "id" | "created_at">) => {
    const existing = promptVersions.filter((p) => p.type === data.type);
    const maxVersion = existing.reduce((max, p) => Math.max(max, p.version), 0);
    const p: PromptVersion = {
      ...data,
      id: nextId("pv"),
      version: maxVersion + 1,
      created_at: new Date().toISOString(),
    };
    promptVersions.push(p);
    addAudit("create", "prompt_version", p.id, p.created_by, `${p.type} v${p.version}`);
    return p;
  },
};

// --- System Prompt Configs ---
export const systemPromptStore = {
  list: () => systemPromptConfigs,
  getByKey: (key: string) => systemPromptConfigs.find((c) => c.key === key),
  update: (key: string, patch: Partial<Omit<SystemPromptConfig, "id" | "key">>) => {
    const idx = systemPromptConfigs.findIndex((c) => c.key === key);
    if (idx === -1) return null;
    systemPromptConfigs[idx] = {
      ...systemPromptConfigs[idx],
      ...patch,
      updated_at: new Date().toISOString(),
    };
    addAudit("update", "system_prompt", systemPromptConfigs[idx].id, patch.updated_by || "system", `Updated ${key}`);
    return systemPromptConfigs[idx];
  },
};

// --- Audit Logs ---
export const auditStore = {
  list: () => auditLogs,
};

// --- Knowledge Posts ---
export const knowledgePostStore = {
  list: () => knowledgePosts,
  get: (id: string) => knowledgePosts.find((p) => p.id === id),
  create: (data: Omit<KnowledgePost, "id" | "created_at" | "updated_at" | "likes" | "ai_categorized" | "archived">) => {
    const now = new Date().toISOString();
    const p: KnowledgePost = {
      ...data,
      id: nextId("kp"),
      likes: [],
      ai_categorized: false,
      archived: false,
      created_at: now,
      updated_at: now,
    };
    knowledgePosts.push(p);
    addAudit("create", "knowledge_post", p.id, p.author, p.title);
    return p;
  },
  update: (id: string, patch: Partial<KnowledgePost>) => {
    const idx = knowledgePosts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    knowledgePosts[idx] = { ...knowledgePosts[idx], ...patch, updated_at: new Date().toISOString() };
    addAudit("update", "knowledge_post", id, "system", JSON.stringify(patch));
    return knowledgePosts[idx];
  },
  toggleLike: (id: string, user: string) => {
    const idx = knowledgePosts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const likes = [...knowledgePosts[idx].likes];
    const likeIdx = likes.indexOf(user);
    if (likeIdx === -1) {
      likes.push(user);
    } else {
      likes.splice(likeIdx, 1);
    }
    knowledgePosts[idx] = { ...knowledgePosts[idx], likes, updated_at: new Date().toISOString() };
    return knowledgePosts[idx];
  },
  delete: (id: string) => {
    const idx = knowledgePosts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    knowledgePosts.splice(idx, 1);
    addAudit("delete", "knowledge_post", id, "system", "deleted");
    return true;
  },
};

// --- Knowledge Comments ---
export const knowledgeCommentStore = {
  list: () => knowledgeComments,
  listByPost: (postId: string) => knowledgeComments.filter((c) => c.post_id === postId),
  create: (data: Omit<KnowledgeComment, "id" | "created_at">) => {
    const c: KnowledgeComment = {
      ...data,
      id: nextId("kc"),
      created_at: new Date().toISOString(),
    };
    knowledgeComments.push(c);
    addAudit("create", "knowledge_comment", c.id, c.author, `on ${c.post_id}`);
    return c;
  },
  delete: (id: string) => {
    const idx = knowledgeComments.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    knowledgeComments.splice(idx, 1);
    addAudit("delete", "knowledge_comment", id, "system", "deleted");
    return true;
  },
};
