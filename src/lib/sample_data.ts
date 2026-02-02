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
  {
    id: "camp_003",
    name: "管理栄養士監修シリーズ",
    objective: "trust",
    start_date: "2026-02-10",
    end_date: "2026-05-31",
    status: "active",
    content_ids: ["cnt_004", "cnt_005"],
  },
  {
    id: "camp_004",
    name: "管理栄養士インターン募集",
    objective: "recruitment",
    start_date: "2026-03-15",
    end_date: "2026-04-15",
    status: "planning",
    content_ids: ["cnt_006"],
  },
  {
    id: "camp_005",
    name: "スポーツ栄養セミナー 4月開催",
    objective: "event",
    start_date: "2026-03-20",
    end_date: "2026-04-20",
    status: "active",
    content_ids: ["cnt_007", "cnt_008"],
  },
  {
    id: "camp_006",
    name: "夏季キャンプ早割キャンペーン",
    objective: "acquisition",
    start_date: "2026-04-01",
    end_date: "2026-06-30",
    status: "planning",
    content_ids: [],
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
      hook: "試合前の食事、なんとなくで決めてませんか？",
      problem: "多くの選手が試合直前の食事だけを意識しがち。",
      cta: "プロフィールのリンクから詳細へ！",
      caption: "試合前72時間で差がつく🍙 カーボローディングの科学",
      hashtags: ["スポーツ栄養", "試合前食事", "FAMアカデミー"],
    },
    scheduled_at: "2026-03-05T12:00:00Z",
    assignee: "田中",
  },
  {
    id: "var_002",
    content_id: "cnt_001",
    channel: "line",
    status: "draft",
    body: {
      delivery_type: "broadcast",
      message_text: "【NEW】試合前の食事、なんとなくで決めてませんか？\n科学的な栄養戦略を学べる無料体験、受付中！",
      cta_label: "詳細はこちら",
    },
    scheduled_at: "2026-03-07T10:00:00Z",
    assignee: "鈴木",
  },
  {
    id: "var_003",
    content_id: "cnt_002",
    channel: "instagram_feed",
    status: "review",
    body: {
      slide1_cover: "知らないと損する\n試合前食事の3つのNG",
      caption: "試合前の食事戦略、正しく知っていますか？",
    },
    scheduled_at: "2026-03-10T12:00:00Z",
    assignee: "田中",
  },
  {
    id: "var_004",
    content_id: "cnt_003",
    channel: "line",
    status: "approved",
    body: {
      delivery_type: "step",
      message_text: "いつもご利用ありがとうございます！プロテイン定期便、今月も届きます。",
      cta_label: "マイページで確認",
    },
    scheduled_at: "2026-02-15T09:00:00Z",
    assignee: "佐藤",
  },
  {
    id: "var_005",
    content_id: "cnt_004",
    channel: "note",
    status: "approved",
    body: {
      title_option1: "管理栄養士が教える：エビデンスに基づく栄養指導のポイント",
      lead: "科学的根拠に基づいた栄養指導の実践について解説します。",
      tags: ["管理栄養士", "エビデンス", "栄養指導"],
    },
    scheduled_at: "2026-02-20T08:00:00Z",
    assignee: "田中",
  },
  {
    id: "var_006",
    content_id: "cnt_005",
    channel: "instagram_reels",
    status: "draft",
    body: {
      hook: "「タンパク質は多ければ多いほどいい」は本当？",
      cta: "答えはプロフィールのリンクから",
    },
    scheduled_at: "2026-03-01T12:00:00Z",
    assignee: "鈴木",
  },
  {
    id: "var_007",
    content_id: "cnt_007",
    channel: "event_lp",
    status: "approved",
    body: {
      title: "スポーツ栄養セミナー 無料体験",
      event_date: "2026-04-10T14:00",
      event_location: "オンライン（Zoom）",
      cta_text: "今すぐ申し込む",
    },
    scheduled_at: "2026-03-25T10:00:00Z",
    assignee: "佐藤",
  },
  {
    id: "var_008",
    content_id: "cnt_007",
    channel: "instagram_stories",
    status: "review",
    body: {
      story_type: "countdown",
      countdown_title: "セミナーまであと...",
    },
    scheduled_at: "2026-04-03T12:00:00Z",
    assignee: "田中",
  },
  {
    id: "var_009",
    content_id: "cnt_008",
    channel: "line",
    status: "draft",
    body: {
      delivery_type: "broadcast",
      message_text: "【4月セミナー】スポーツ栄養の最新トレンドを学びませんか？無料です！",
      cta_label: "申し込みはこちら",
    },
    scheduled_at: "2026-03-28T10:00:00Z",
    assignee: "鈴木",
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
