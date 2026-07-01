import type { Metadata } from "next";
import AuthProvider from "@/components/layout/AuthProvider";
import ClientNav from "@/components/layout/ClientNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "微创AI带货视频工坊",
  description: "上传商品素材，一键生成专业带货视频",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-[#0A0A0F] text-[#F0F0F5] flex flex-col">
        <AuthProvider>
          <ClientNav />
          <main className="flex-1 max-w-[1400px] mx-auto w-full px-6 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
