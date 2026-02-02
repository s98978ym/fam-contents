import type {
  Campaign,
  ContentPackage,
  ChannelVariant,
  ReviewRecord,
  PublishJob,
  MetricDaily,
} from "@/types/content_package";

export const sampleCampaigns: Campaign[] = [
  {
    id: "camp_001",
    name: "春季アカデミー募集キャンペーン",
    objective: "acquisition",
    start_date: "2026-03-01",
    end_date: "2026-04-30",
    status: "active",
    content_ids: ["cnt_001", "cnt_002"],
  },
  {
    id: "camp_002",
    name: "プロテインサブスク継続施策",
    objective: "retention",
    start_date: "2026-02-01",
    end_date: "2026-03-31",
    status: "active",
    content_ids: ["cnt_003"],
  },
];

export const sampleContents: ContentPackage[] = [
  {
    campaign_id: "camp_001",
    content_id: "cnt_001",
    version: 1,
    status: "approved",
    info_classification: "public",
    objective: "acquisition",
    funnel_stage: "awareness",
    persona: ["academy_student"],
    title: "スポーツ栄養学の基礎：試合前の食事で変わるパフォーマンス",
    summary:
      "試合前72時間の栄養戦略がパフォーマンスに与える影響をエビデンスベースで解説。アカデミー受講を訴求。",
    key_messages: [
      {
        claim: "試合前72時間の炭水化物ローディングにより筋グリコーゲン貯蔵量が最大2倍になる可能性が示されている",
        evidence: [
          {
            id: "ev_001",
            type: "citation",
            source: "Hawley et al., Sports Med, 1997",
            confidence: "high",
          },
        ],
        supervised_by: "管理栄養士 田中",
      },
    ],
    disclaimers: [
      "※個人差があります。具体的な食事計画は専門家にご相談ください。",
    ],
    do_not_say: ["絶対", "必ず痩せる", "治る", "医学的に証明"],
    risk_flags: [],
    cta_set: [
      {
        label: "無料体験に申し込む",
        url_template: "https://fam.example.com/academy/trial?utm_source={{source}}&utm_medium={{medium}}&utm_campaign={{campaign}}",
        type: "signup",
      },
    ],
    utm_plan: {
      source: "instagram",
      medium: "social",
      campaign: "spring_academy_2026",
    },
    asset_plan: [
      {
        asset_type: "video",
        purpose: "reels_main",
        width: 1080,
        height: 1920,
        template_id: "tpl_reels_edu",
      },
      {
        asset_type: "image",
        purpose: "feed_carousel",
        width: 1080,
        height: 1080,
        template_id: "tpl_carousel_5",
      },
    ],
    target_channels: ["instagram_reels", "instagram_feed", "note", "line"],
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-02-01T14:00:00Z",
    created_by: "planner_suzuki",
  },
];

export const sampleVariants: ChannelVariant[] = [
  {
    id: "var_001",
    content_id: "cnt_001",
    channel: "instagram_reels",
    status: "approved",
    body: {
      script: "Hook→課題提示→エビデンス→実践例→CTA",
      duration_sec: 60,
      caption: "試合前72時間で差がつく🍙 カーボローディングの科学",
      hashtags: ["#スポーツ栄養", "#試合前食事", "#FAMアカデミー"],
    },
    scheduled_at: "2026-03-05T12:00:00Z",
  },
  {
    id: "var_002",
    content_id: "cnt_001",
    channel: "line",
    status: "draft",
    body: {
      message: "【NEW】試合前の食事、なんとなくで決めてませんか？\n科学的な栄養戦略を学べる無料体験、受付中！",
      cta_url: "https://fam.example.com/academy/trial",
    },
  },
];

export const sampleReviews: ReviewRecord[] = [
  {
    id: "rev_001",
    content_id: "cnt_001",
    reviewer: "管理栄養士 田中",
    role: "supervisor",
    decision: "approved",
    comment: "エビデンスの引用が適切。免責も問題なし。",
    labels: ["evidence_ok", "disclaimer_ok"],
    created_at: "2026-02-01T13:00:00Z",
  },
];

export const samplePublishJobs: PublishJob[] = [
  {
    id: "pj_001",
    content_id: "cnt_001",
    channel: "instagram_reels",
    status: "queued",
    scheduled_at: "2026-03-05T12:00:00Z",
  },
];

export const sampleMetrics: MetricDaily[] = [
  {
    id: "m_001",
    content_id: "cnt_001",
    channel: "instagram_reels",
    date: "2026-03-05",
    impressions: 12500,
    engagements: 890,
    clicks: 210,
    conversions: 18,
    custom: { saves: 145, shares: 67, completion_rate: 0.42 },
  },
];
