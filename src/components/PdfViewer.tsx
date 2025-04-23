"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useFileContext } from '@/contexts/FileContext';

// 使用动态导入，但不指定 loading 组件
// 让 PdfViewerClient 内部处理所有加载状态
const PdfViewerClient = dynamic(
  () => import('./PdfViewerClient').then(mod => mod.PdfViewerClient),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-30 w-full h-full bg-background overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 rounded-full border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">加载PDF查看器...</p>
        </div>
      </div>
    )
  }
);

export function PdfViewer() {
  // 添加浏览器性能检测
  const [isHighPerformance, setIsHighPerformance] = useState<boolean | null>(null);
  // 添加渐进式加载支持标志
  const [supportsProgressiveLoading, setSupportsProgressiveLoading] = useState<boolean>(true);
  const { selectedPdfFile, fetchDirectoryContent } = useFileContext();

  // 确保从最近阅读记录进入时加载PDF所在目录的内容
  useEffect(() => {
    if (selectedPdfFile) {
      const pdfPath = selectedPdfFile.path;
      const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf('/'));

      // 预加载当前PDF所在目录的内容，以便正确关联音频文件
      fetchDirectoryContent(pdfDir).catch(error => {
        console.error('加载PDF目录内容失败:', error);
      });
    }
  }, [selectedPdfFile, fetchDirectoryContent]);

  useEffect(() => {
    // 检测设备性能
    const detectPerformance = () => {
      try {
        // 检查硬件并发性
        const concurrency = navigator.hardwareConcurrency || 0;

        // 检查设备内存 (如果可用)
        let deviceMemory = 4; // 默认值4GB
        if ('deviceMemory' in navigator) {
          deviceMemory = (navigator as any).deviceMemory;
        }

        // 检查是否是移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // 基于这些因素确定性能
        const isHighEnd = (concurrency >= 4 && deviceMemory >= 4 && !isMobile) ||
          (concurrency >= 6 && deviceMemory >= 2 && isMobile);

        setIsHighPerformance(isHighEnd);

        // 保存到sessionStorage，避免重复检测
        try {
          sessionStorage.setItem('device-performance', isHighEnd ? 'high' : 'normal');
        } catch (e) {
          console.error('无法保存性能信息到sessionStorage', e);
        }

        return isHighEnd;
      } catch (e) {
        console.error('性能检测出错:', e);
        setIsHighPerformance(false); // 出错时默认为低性能设备
        return false;
      }
    };

    // 尝试从sessionStorage获取缓存的性能信息
    try {
      const cachedPerformance = sessionStorage.getItem('device-performance');
      if (cachedPerformance) {
        setIsHighPerformance(cachedPerformance === 'high');
      } else {
        detectPerformance();
      }
    } catch (e) {
      detectPerformance();
    }
  }, []);

  // 将 isHighPerformance 和 supportsProgressiveLoading 传递给 PdfViewerClient
  return (
    <div className="fixed inset-0 z-30 w-full h-full bg-background overflow-hidden">
      <PdfViewerClient
        isHighPerformance={isHighPerformance}
        supportsProgressiveLoading={supportsProgressiveLoading}
      />
    </div>
  );
}
