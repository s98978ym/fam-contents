import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAM Content Ops",
  description: "マルチチャネル・コンテンツ運用ダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <div className="flex min-h-screen">
          <nav className="w-52 bg-white border-r border-gray-200 p-4 flex flex-col gap-0.5 shrink-0">
            <h1 className="text-lg font-bold mb-6 px-2">FAM Content Ops</h1>
            <NavLink href="/" icon="home">ホーム</NavLink>
            <NavDivider label="コンテンツ" />
            <NavLink href="/contents" icon="create">コンテンツ生成</NavLink>
            <NavLink href="/contents/list" icon="list">コンテンツ一覧</NavLink>
            <NavDivider label="管理" />
            <NavLink href="/campaigns" icon="campaign">キャンペーン</NavLink>
            <NavLink href="/publish-jobs" icon="publish">配信ジョブ</NavLink>
            <NavDivider label="設定" />
            <NavLink href="/prompt-versions" icon="prompt">プロンプト管理</NavLink>
          </nav>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

const ICONS: Record<string, string> = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  create: "M12 4v16m8-8H4",
  list: "M4 6h16M4 10h16M4 14h16M4 18h16",
  campaign: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z",
  publish: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  prompt: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
};

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon?: string }) {
  const iconPath = icon ? ICONS[icon] : undefined;
  return (
    <a
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors text-gray-700"
    >
      {iconPath && (
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      )}
      {children}
    </a>
  );
}

function NavDivider({ label }: { label: string }) {
  return (
    <div className="mt-4 mb-1 px-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}
