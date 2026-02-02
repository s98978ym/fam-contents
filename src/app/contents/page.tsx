"use client";

import { useEffect, useState } from "react";
import type { Channel } from "@/types/content_package";
import {
  channelOptions,
  InstagramReelsForm,
  InstagramStoriesForm,
  InstagramFeedForm,
  EventLPForm,
  NoteForm,
  LINEForm,
} from "@/components/channel_forms";
import type { ChannelGroup } from "@/components/channel_forms";

interface ContentItem {
  content_id: string;
  title: string;
  summary: string;
  version: number;
  objective: string;
  funnel_stage: string;
  target_channels: Channel[];
  key_messages: { claim: string; evidence: { source: string }[] }[];
}

interface VariantItem {
  id: string;
  content_id: string;
  channel: string;
  status: string;
  scheduled_at?: string;
}

export default function ContentsPage() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelGroup | "">("");
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/contents").then((r) => r.json()),
      fetch("/api/variants").then((r) => r.json()),
    ]).then(([c, v]) => {
      setContents(c);
      setVariants(v);
    });
  }, []);

  function handleChannelSelect(value: string) {
    setSelectedChannel(value as ChannelGroup);
    setShowForm(!!value);
    setSuccessMsg("");
  }

  async function handleFormSubmit(data: Record<string, unknown>) {
    const res = await fetch("/api/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const newVariant = await res.json();
      setVariants((prev) => [...prev, newVariant]);
      setShowForm(false);
      setSelectedChannel("");
      setSuccessMsg("コンテンツを登録しました");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  }

  const channelLabel: Record<string, string> = {
    instagram_reels: "IG Reels",
    instagram_stories: "IG Stories",
    instagram_feed: "IG Feed",
    event_lp: "イベントLP",
    note: "note",
    line: "LINE",
  };

  const formMap: Record<ChannelGroup, React.FC<{ onSubmit: (d: Record<string, unknown>) => void }>> = {
    instagram_reels: InstagramReelsForm,
    instagram_stories: InstagramStoriesForm,
    instagram_feed: InstagramFeedForm,
    event_lp: EventLPForm,
    note: NoteForm,
    line: LINEForm,
  };

  const FormComponent = selectedChannel ? formMap[selectedChannel] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">コンテンツ一覧</h2>
      </div>

      {/* Channel Selector + Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold mb-3">新規コンテンツを作成</h3>

        <label className="block text-sm font-medium text-gray-700 mb-1">チャネルを選択</label>
        <select
          value={selectedChannel}
          onChange={(e) => handleChannelSelect(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2.5 text-sm w-full max-w-md mb-2"
        >
          <option value="">-- チャネルを選んでください --</option>
          <optgroup label="Instagram">
            <option value="instagram_reels">Instagram Reels（縦型動画）</option>
            <option value="instagram_stories">Instagram Stories（短尺・投票・告知）</option>
            <option value="instagram_feed">Instagram Feed カルーセル（5枚構成）</option>
          </optgroup>
          <optgroup label="イベントページ">
            <option value="event_lp">イベントLP（告知/申込/FAQ/SEO/OG）</option>
          </optgroup>
          <optgroup label="note">
            <option value="note">note 長文記事（サマリー・OG画像）</option>
          </optgroup>
          <optgroup label="LINE公式">
            <option value="line">LINE（配信メッセージ/ステップ配信/リッチメニュー）</option>
          </optgroup>
          <optgroup label="将来拡張">
            <option disabled>メール</option>
            <option disabled>Web記事</option>
            <option disabled>プレスリリース</option>
            <option disabled>YouTube概要欄</option>
            <option disabled>Notion / 社内報</option>
          </optgroup>
        </select>

        {selectedChannel && (
          <p className="text-xs text-gray-500 mb-4">
            {channelOptions.find((o) => o.value === selectedChannel)?.description}
          </p>
        )}

        {successMsg && (
          <div className="bg-green-50 text-green-700 text-sm rounded-md px-4 py-2 mb-4">{successMsg}</div>
        )}

        {showForm && FormComponent && (
          <div className="border-t border-gray-200 pt-5 mt-3">
            <FormComponent onSubmit={handleFormSubmit} />
          </div>
        )}
      </div>

      {/* Existing Contents */}
      {contents.map((c) => {
        const cvs = variants.filter((v) => v.content_id === c.content_id);
        return (
          <div key={c.content_id} className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{c.title}</h3>
              <span className="text-xs font-mono text-gray-400">{c.content_id} v{c.version}</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{c.summary}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              {c.target_channels.map((ch) => (
                <span key={ch} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700">
                  {channelLabel[ch] ?? ch}
                </span>
              ))}
              <span className="px-2 py-0.5 text-xs rounded bg-yellow-50 text-yellow-700">
                {c.objective}
              </span>
              <span className="px-2 py-0.5 text-xs rounded bg-purple-50 text-purple-700">
                {c.funnel_stage}
              </span>
            </div>

            <div className="mb-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Messages</h4>
              {c.key_messages.map((km, i) => (
                <div key={i} className="text-sm mb-1">
                  <span>{km.claim}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    [{km.evidence.map((e) => e.source).join(", ")}]
                  </span>
                </div>
              ))}
            </div>

            {cvs.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Channel Variants</h4>
                <div className="space-y-1">
                  {cvs.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs">{channelLabel[v.channel] ?? v.channel}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        v.status === "approved" ? "bg-green-100 text-green-700" :
                        v.status === "published" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {v.status}
                      </span>
                      {v.scheduled_at && (
                        <span className="text-xs text-gray-400">予定: {v.scheduled_at}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
