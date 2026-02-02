import { sampleCampaigns } from "@/lib/sample_data";

export default function CampaignsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">キャンペーン一覧</h2>
      <div className="space-y-4">
        {sampleCampaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{c.name}</h3>
              <span className="text-xs font-mono text-gray-400">{c.id}</span>
            </div>
            <div className="flex gap-4 text-sm text-gray-600">
              <span>目的: {c.objective}</span>
              <span>期間: {c.start_date} ~ {c.end_date}</span>
              <span>コンテンツ数: {c.content_ids.length}</span>
              <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                {c.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
