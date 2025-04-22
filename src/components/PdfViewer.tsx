"use client";

import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';

// 自定义加载组件 - 使用跳跃的四个点替代旋转圆圈
const PdfLoadingFallback = () => {
  const [loadingDuration, setLoadingDuration] = useState(0);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setLoadingDuration(duration);

      // 加载超过25秒显示重试按钮
      if (duration > 25 && !showRetry) {
        setShowRetry(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    // 重新加载页面
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full flex items-center justify-center bg-background">
      <Card className="flex items-center justify-center border-none shadow-sm bg-background relative w-full max-w-md mx-auto p-8">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(0, 0, 0, 0.05) 100%)', zIndex: 1 }}></div>
        <div className="text-center p-6 space-y-3 relative z-10">
          <div className="flex justify-center space-x-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className="h-2.5 w-2.5 bg-primary rounded-full"
                style={{
                  animation: `bounce 1.4s infinite ease-in-out both`,
                  animationDelay: `${index * 0.16}s`
                }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">正在准备PDF文档... {loadingDuration > 5 ? `(${loadingDuration}秒)` : ''}</p>
          <p className="text-xs text-muted-foreground/70">{loadingDuration > 15 ? '加载时间较长，请耐心等待或尝试重新加载' : '首次加载可能需要几秒钟，请耐心等待'}</p>

          {showRetry && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                <span>重新加载</span>
              </Button>
            </div>
          )}

          <style jsx>{`
            @keyframes bounce {
              0%, 80%, 100% { 
                transform: scale(0);
                opacity: 0.5;
              }
              40% { 
                transform: scale(1.0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      </Card>
    </div>
  );
};

// 使用动态导入，并设置懒加载
const PdfViewerClient = dynamic(
  () => import('./PdfViewerClient').then(mod => mod.PdfViewerClient),
  {
    ssr: false,
    loading: () => <PdfLoadingFallback />
  }
);

export function PdfViewer() {
  return (
    <div className="fixed inset-0 z-30 w-full h-full bg-background overflow-hidden">
      <PdfViewerClient />
    </div>
  );
}
