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
          <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1 shrink-0">
            <h1 className="text-lg font-bold mb-4 px-2">FAM Content Ops</h1>
            <NavLink href="/">ダッシュボード</NavLink>
            <NavLink href="/campaigns">キャンペーン</NavLink>
            <NavLink href="/contents">コンテンツ</NavLink>
            <NavLink href="/reviews">レビュー</NavLink>
            <NavLink href="/publish-jobs">配信ジョブ</NavLink>
            <NavLink href="/prompt-versions">プロンプト管理</NavLink>
          </nav>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
    >
      {children}
    </a>
  );
}
