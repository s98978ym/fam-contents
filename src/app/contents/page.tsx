import { sampleContents, sampleVariants } from "@/lib/sample_data";

export default function ContentsPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">コンテンツ一覧</h2>
      {sampleContents.map((c) => {
        const variants = sampleVariants.filter((v) => v.content_id === c.content_id);
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
                  {ch}
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

            {variants.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Channel Variants</h4>
                <div className="space-y-1">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-xs">{v.channel}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        v.status === "approved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
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
