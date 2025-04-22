"use client";

import { useState, useRef, useEffect } from 'react';
import { useFileContext } from '@/contexts/FileContext';
import dynamic from 'next/dynamic';
import { AudioPlayer } from '@/components/AudioPlayer';
import { FileExplorer } from '@/components/FileExplorer';
import { PdfViewer } from '@/components/PdfViewer';
import { ReadingProgressCard } from '@/components/ReadingProgressCard';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import {
  Sidebar,
  X,
  Menu,
  FileText,
  Headphones,
  Info,
  Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 使用动态导入，并禁用服务器端渲染
const PdfViewerClient = dynamic(
  () => import('@/components/PdfViewerClient').then(mod => mod.PdfViewerClient),
  { ssr: false }
);

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { selectedPdfFile, currentAudioFile } = useFileContext();

  // 移动设备屏幕宽度检测，自动关闭侧边栏
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        // 在桌面视图下，只有在未选择PDF文件时才自动打开侧边栏
        setIsSidebarOpen(!selectedPdfFile);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedPdfFile]);

  // 当选择PDF文件时自动隐藏侧边栏（仅在非移动设备上）
  useEffect(() => {
    if (selectedPdfFile && !isMobile) {
      setIsSidebarOpen(false);
    }
  }, [selectedPdfFile, isMobile]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* 移动端侧边栏遮罩层 */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`${isMobile ? 'fixed' : 'relative'} z-50 w-[280px] md:w-80 h-full border-r bg-background/95 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <Headphones className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-semibold">英语听力练习</h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="h-[calc(100vh-60px)] overflow-y-auto">
              <FileExplorer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col h-full pt-0 md:pt-0 w-full min-w-0">
        {/* 顶部信息条 - 始终显示 */}
        <div className="flex h-14 items-center justify-between px-4 md:px-6 border-b bg-background/95 backdrop-blur-md sticky top-0 z-10 w-full">
          <div className="flex items-center">
            {!isSidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(true)}
                className="mr-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div className="flex items-center gap-4 overflow-hidden">
              {/* 显示选中的文件名 */}
              {selectedPdfFile && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium max-w-[120px] md:max-w-[200px] truncate">
                    {selectedPdfFile.name}
                  </span>
                </div>
              )}

              {currentAudioFile && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                    <Headphones className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium max-w-[120px] md:max-w-[200px] truncate">
                    {currentAudioFile.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <a
              href="https://github.com/yourusername/english-listening-practice"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>

            <a
              href="#"
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>关于</span>
            </a>
          </div>
        </div>

        {/* 内容主区域 */}
        <div className="flex-1 overflow-auto relative w-full">
          {selectedPdfFile ? (
            <div className="h-full w-full">
              <PdfViewer />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center py-10 bg-gradient-to-b from-background to-muted/20 overflow-auto">
              <div className="w-full max-w-3xl px-4 space-y-8">
                <div className="text-center">
                  <div className="flex justify-center mb-6">
                    <FileText className="h-16 w-16 text-primary/30" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">开始学习英语听力</h2>
                  <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                    从左侧文件浏览器中选择一个PDF文档或音频文件开始学习。支持PDF标注和音频播放控制。
                  </p>
                  <Button onClick={() => setIsSidebarOpen(true)} className="mx-auto">
                    浏览文件
                  </Button>
                </div>

                <div className="w-full">
                  <ReadingProgressCard />
                </div>
              </div>
            </div>
          )}

          {/* 移动设备浮动菜单按钮 */}
          {isMobile && !isSidebarOpen && (
            <Button
              variant="secondary"
              size="icon"
              className="fixed bottom-20 right-4 z-40 rounded-full shadow-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </main>

      {/* 音频播放器浮动组件 */}
      <AudioPlayer />

      <Toaster />
    </div>
  );
}
