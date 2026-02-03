import type { Metadata } from "next";
import "./globals.css";
import { TeamProvider } from "@/contexts/team-context";
import { Sidebar } from "@/components/sidebar";

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
        <TeamProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </TeamProvider>
      </body>
    </html>
  );
}
