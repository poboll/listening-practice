import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FileProvider } from "@/contexts/FileContext";
import { ReadingProgressProvider } from "@/contexts/ReadingProgressContext";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "英语精听练习",
  description: "一个提供英语精听练习的平台，支持PDF阅读和音频播放",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={inter.className}>
        <FileProvider>
          <ReadingProgressProvider>
            <main className="min-h-screen overflow-hidden">
              {children}
            </main>
            <Toaster />
          </ReadingProgressProvider>
        </FileProvider>
      </body>
    </html>
  );
}
