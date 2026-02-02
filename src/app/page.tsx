import { sampleCampaigns, sampleContents, sampleMetrics, samplePublishJobs } from "@/lib/sample_data";

export default function DashboardPage() {
  const stats = [
    { label: "キャンペーン", value: sampleCampaigns.length },
    { label: "コンテンツ", value: sampleContents.length },
    { label: "配信待ち", value: samplePublishJobs.filter((j) => j.status === "queued").length },
    { label: "今日のインプレッション", value: sampleMetrics.reduce((a, m) => a + m.impressions, 0).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">ダッシュボード</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">アクティブキャンペーン</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">名前</th>
                <th className="px-4 py-2">目的</th>
                <th className="px-4 py-2">期間</th>
                <th className="px-4 py-2">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {sampleCampaigns.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">{c.objective}</td>
                  <td className="px-4 py-2">{c.start_date} ~ {c.end_date}</td>
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">最新メトリクス</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2">コンテンツ</th>
                <th className="px-4 py-2">チャネル</th>
                <th className="px-4 py-2">インプレッション</th>
                <th className="px-4 py-2">エンゲージメント</th>
                <th className="px-4 py-2">クリック</th>
                <th className="px-4 py-2">CV</th>
              </tr>
            </thead>
            <tbody>
              {sampleMetrics.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">{m.content_id}</td>
                  <td className="px-4 py-2">{m.channel}</td>
                  <td className="px-4 py-2">{m.impressions.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.engagements.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.clicks.toLocaleString()}</td>
                  <td className="px-4 py-2">{m.conversions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
