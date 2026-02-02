/** Content Package: Source of Truth for all channel outputs */

export type InfoClassification = "public" | "internal" | "confidential" | "pii";
export type Objective = "acquisition" | "retention" | "trust" | "recruitment" | "event";
export type FunnelStage = "awareness" | "interest" | "consideration" | "conversion" | "loyalty";
export type Persona = "b2b_team" | "b2c_subscriber" | "academy_student";
export type ContentStatus = "draft" | "review" | "approved" | "published" | "archived";
export type Channel = "instagram_reels" | "instagram_stories" | "instagram_feed" | "event_lp" | "note" | "line";

export interface Evidence {
  id: string;
  type: "citation" | "url" | "document_ref";
  source: string;
  quote?: string;
  confidence: "high" | "medium" | "low";
}

export interface KeyMessage {
  claim: string;
  evidence: Evidence[];
  supervised_by?: string;
}

export interface CtaItem {
  label: string;
  url_template: string;
  type: "inquiry" | "purchase" | "signup" | "download";
}

export interface AssetRequirement {
  asset_type: "image" | "video" | "banner";
  purpose: string;
  width: number;
  height: number;
  template_id?: string;
  text_slots?: Record<string, string>;
}

export interface ContentPackage {
  campaign_id: string;
  content_id: string;
  version: number;
  status: ContentStatus;
  info_classification: InfoClassification;
  objective: Objective;
  funnel_stage: FunnelStage;
  persona: Persona[];
  title: string;
  summary: string;
  key_messages: KeyMessage[];
  disclaimers: string[];
  do_not_say: string[];
  risk_flags: string[];
  cta_set: CtaItem[];
  utm_plan: {
    source: string;
    medium: string;
    campaign: string;
    content?: string;
  };
  asset_plan: AssetRequirement[];
  target_channels: Channel[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ChannelVariant {
  id: string;
  content_id: string;
  channel: Channel;
  status: ContentStatus;
  body: Record<string, unknown>;
  scheduled_at?: string;
  published_at?: string;
  assignee?: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: Objective;
  start_date: string;
  end_date: string;
  status: "planning" | "active" | "completed";
  content_ids: string[];
}

export interface ReviewRecord {
  id: string;
  content_id: string;
  reviewer: string;
  role: "supervisor" | "legal" | "brand";
  decision: "approved" | "rejected" | "revision_requested";
  comment: string;
  labels: string[];
  created_at: string;
}

export interface PublishJob {
  id: string;
  content_id: string;
  channel: Channel;
  status: "queued" | "publishing" | "published" | "failed";
  scheduled_at: string;
  published_at?: string;
  error?: string;
}

export interface MetricDaily {
  id: string;
  content_id: string;
  channel: Channel;
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
  conversions: number;
  custom: Record<string, number>;
}

export interface DesignManifest {
  template_id: string;
  size: { width: number; height: number };
  text_slots: Record<string, string>;
  image_slots: Record<string, string>;
  export_name: string;
  format: "png" | "jpg" | "webp";
}
