import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import HeaderGate from "@/components/layout/HeaderGate";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "LonelyChat - 连接世界，分享生活",
  description: "一个温暖的社交聊天平台，让每一次对话都充满温度",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SolanaWalletProvider>
          <div className="flex flex-col min-h-screen">
            <HeaderGate />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
