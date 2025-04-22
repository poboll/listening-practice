"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useFileContext } from '@/contexts/FileContext';
import { useReadingProgress } from '@/contexts/ReadingProgressContext';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, RotateCcw,
  Maximize2, Minimize2, Moon, Sun, Highlighter, Pencil, Pen,
  Eraser, FileText, X, Trash2, ArrowLeft, Music, MoreHorizontal,
  Loader2, Eye, EyeOff
} from 'lucide-react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import '@/styles/audio-player.css';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AudioPlayerClient } from "@/components/AudioPlayerClient";

// 设置PDF.js worker路径
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// 添加备用worker源支持
try {
  // 检查worker是否加载成功
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function (e) {
      if (e.filename && e.filename.includes('pdf.worker.min.js')) {
        console.error('PDF.js worker加载失败，尝试使用备用源');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
      }
    }, { once: true });
  }
} catch (err) {
  console.error('设置PDF.js worker监听器失败:', err);
}

type AnnotationTool = 'none' | 'highlighter' | 'pencil' | 'pen';
type HighlighterColor = 'yellow' | 'blue' | 'pink';

interface Annotation {
  type: 'highlighter' | 'pencil' | 'pen';
  color: string;
  points: { x: number; y: number }[];
  pageNumber: number;
}

// 简单的媒体查询Hook
function useMediaQuerySimple(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);

    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// 自定义页面组件，优化加载性能
interface LazyPageProps {
  pageNumber: number;
  scale: number;
  rotation: number;
  onPageLoadSuccess?: (pageNumber: number) => void;
}

const LazyPage = ({ pageNumber, scale, rotation, onPageLoadSuccess }: LazyPageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // 自定义的onLoadSuccess回调
  const handleLoadSuccess = () => {
    setIsLoaded(true);
    if (onPageLoadSuccess) {
      onPageLoadSuccess(pageNumber);
    }
  };

  return (
    <div className="relative mb-6">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-2 w-2 bg-primary rounded-full"
                  style={{
                    animation: `bounce 1.4s infinite ease-in-out both`,
                    animationDelay: `${index * 0.16}s`
                  }}
                />
              ))}
            </div>
            <span>页面{pageNumber}</span>
          </div>
        </div>
      )}
      <Page
        pageNumber={pageNumber}
        scale={scale}
        rotate={rotation}
        loading={null}
        className={`shadow-md ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        // @ts-ignore - onLoadSuccess 在类型定义中可能缺失，但实际上组件支持
        onLoadSuccess={handleLoadSuccess}
        renderTextLayer={true}
        renderAnnotationLayer={true}
      />
      <style jsx global>{`
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
  );
};

export function PdfViewerClient() {
  const router = useRouter();
  const { selectedPdfFile, setSelectedFile, directoryContent, playAudio } = useFileContext();
  const { updateReadingProgress, exitReading } = useReadingProgress();
  const { toast } = useToast();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [nightMode, setNightMode] = useState<boolean>(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(0);
  const [canvasHeight, setCanvasHeight] = useState<number>(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentTool, setCurrentTool] = useState<AnnotationTool>('none');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentColor, setCurrentColor] = useState<HighlighterColor>('yellow');
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [showExitButton, setShowExitButton] = useState<boolean>(true);
  const [lazyLoadThreshold, setLazyLoadThreshold] = useState<number>(5);
  const [isLazyLoading, setIsLazyLoading] = useState<boolean>(true);
  // 新增状态：记录加载尝试次数
  const [loadAttempts, setLoadAttempts] = useState<number>(0);
  const [workerLoaded, setWorkerLoaded] = useState<boolean>(false);

  // 新增的状态变量
  const [showPageTurnIndicator, setShowPageTurnIndicator] = useState<'prev' | 'next' | null>(null);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [scrollMode, setScrollMode] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 用于跟踪音频播放器是否被手动切换过
  const audioPlayerManuallyToggled = useRef<boolean>(false);

  // 音频播放相关状态
  const [showAudioPlayer, setShowAudioPlayer] = useState<boolean>(false);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioPlayerRef = useRef<any>(null);

  // 移动设备检测
  const isMobile = useMediaQuerySimple('(max-width: 768px)');
  const isTablet = useMediaQuerySimple('(min-width: 769px) and (max-width: 1024px)');

  // 当移动设备状态变化时，调整懒加载阈值
  useEffect(() => {
    if (isMobile) {
      setLazyLoadThreshold(3); // 移动设备上减少同时加载的页数
    } else if (isTablet) {
      setLazyLoadThreshold(4);
    } else {
      setLazyLoadThreshold(5);
    }
  }, [isMobile, isTablet]);

  // 当当前目录内容变化时，提取所有 MP3 文件
  useEffect(() => {
    if (directoryContent) {
      const mp3Files = directoryContent.items
        .filter(item => !item.isDirectory && item.type === 'mp3');
      setAudioFiles(mp3Files);
    }
  }, [directoryContent]);

  // 当选择的PDF文件变化时，尝试从localStorage加载上次阅读位置
  useEffect(() => {
    if (selectedPdfFile) {
      // 重置状态
      setPageNumber(1);
      setVisiblePages([1]);
      setLoadedPages(new Set([1]));
      // 为移动设备优化缩放级别
      setScale(isMobile ? 0.7 : isTablet ? 0.9 : 1.2);
      setRotation(0);
      setLoading(true);
      setError(null);
      setAnnotations([]);
      setCurrentTool('none');
      setInitialLoad(true);
      setShowAudioPlayer(false);
      setScrollMode(true);
      // 重置加载尝试次数
      setLoadAttempts(0);
      setWorkerLoaded(false);
      // 重置音频播放器手动切换标志
      audioPlayerManuallyToggled.current = false;

      // 清除之前可能存在的提示定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // 清除加载超时计时器
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      // 设置更灵活的加载超时机制
      // 移动设备给更长的加载时间
      const timeoutDuration = isMobile || isTablet ? 20000 : 10000;

      loadingTimeoutRef.current = setTimeout(() => {
        if (initialLoad || loading) {
          setInitialLoad(false);
          setLoading(false);

          // 增加加载尝试次数
          setLoadAttempts(prev => prev + 1);

          // 如果多次尝试仍然失败，提供更明确的错误信息
          if (loadAttempts >= 2) {
            setError("PDF加载失败，请检查网络连接或者文件是否损坏");
            toast({
              title: "PDF加载失败",
              description: "请尝试刷新页面或使用不同的浏览器",
              variant: "destructive",
              duration: 5000,
            });
          } else {
            console.log("PDF加载超时，尝试重新加载");
            toast({
              title: "PDF加载较慢",
              description: "正在尝试重新加载，请稍候...",
              duration: 3000,
            });

            // 尝试更换worker源并重试
            if (!workerLoaded) {
              pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
              setWorkerLoaded(true);
            }
          }
        }
      }, timeoutDuration);

      // 尝试加载上次阅读位置
      try {
        const savedReadings = localStorage.getItem('pdf-reading-progress');
        if (savedReadings) {
          const parsedReadings = JSON.parse(savedReadings);
          const currentFileReading = parsedReadings.find(
            (r: any) => r.filePath === selectedPdfFile.path
          );

          if (currentFileReading && currentFileReading.currentPage) {
            setPageNumber(currentFileReading.currentPage);
            setVisiblePages([currentFileReading.currentPage]);
            setLoadedPages(new Set([currentFileReading.currentPage]));

            // 添加一个标志，防止重复提示
            const hasShownToast = sessionStorage.getItem(`shown-toast-${selectedPdfFile.path}`);
            if (!hasShownToast) {
              toast({
                title: "已恢复上次阅读位置",
                description: `第${currentFileReading.currentPage}页，共${currentFileReading.totalPages}页`,
                duration: 2000,
              });
              sessionStorage.setItem(`shown-toast-${selectedPdfFile.path}`, 'true');
            }
          }
        }
      } catch (error) {
        console.error('恢复阅读位置失败:', error);
      }

      // 检测同目录下的音频文件
      scanForRelatedAudioFiles();
    }

    // 组件卸载时清除计时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [selectedPdfFile, toast, isMobile, isTablet, loadAttempts]);

  // 当文档目录内容变化时重新扫描音频文件
  useEffect(() => {
    if (selectedPdfFile && directoryContent) {
      scanForRelatedAudioFiles();
    }
  }, [directoryContent, selectedPdfFile]);

  // 扫描相关音频文件的函数
  const scanForRelatedAudioFiles = () => {
    if (!selectedPdfFile || !directoryContent) return;

    try {
      // 获取PDF文件所在目录
      const pdfPath = selectedPdfFile.path;
      const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf('/'));
      const pdfBaseName = pdfPath.substring(pdfPath.lastIndexOf('/') + 1).replace('.pdf', '');

      // 过滤出同目录的音频文件
      const relatedAudioFiles = directoryContent.items.filter(item => {
        if (item.isDirectory || item.type !== 'mp3') return false;

        // 检查是否在同一目录
        const itemDir = item.path.substring(0, item.path.lastIndexOf('/'));
        const itemBaseName = item.path.substring(item.path.lastIndexOf('/') + 1).replace('.mp3', '');

        // 文件名相似或在同一目录
        return itemDir === pdfDir ||
          itemBaseName.includes(pdfBaseName) ||
          pdfBaseName.includes(itemBaseName);
      });

      setAudioFiles(relatedAudioFiles);

      // 不再自动显示播放器，而是只在有未显示的音频文件时自动显示
      if (relatedAudioFiles.length > 0 && !showAudioPlayer && !audioPlayerManuallyToggled.current) {
        // 延迟显示以避免干扰PDF加载
        setTimeout(() => {
          setShowAudioPlayer(true);
        }, 1500);
      }
    } catch (error) {
      console.error('扫描音频文件失败:', error);
    }
  };

  // 处理文档加载成功
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setInitialLoad(false);
    setError(null); // 清除可能存在的错误状态

    // 加载成功后重置尝试次数
    setLoadAttempts(0);

    // 初始化可见页面数组
    if (pageNumber > 0 && pageNumber <= numPages) {
      // 移动设备上减少同时加载的页数，提高性能
      const visibleThreshold = isMobile ? 2 : isTablet ? 3 : lazyLoadThreshold;
      const visiblePagesArray = [];
      for (let i = pageNumber; i < pageNumber + visibleThreshold && i <= numPages; i++) {
        visiblePagesArray.push(i);
      }
      setVisiblePages(visiblePagesArray);
    }

    // 清除加载超时计时器
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // 当页面加载成功时，将页码添加到已加载页面集合中
  const onPageLoadSuccess = useCallback((pageNumber: number) => {
    setLoadedPages(prev => new Set([...prev, pageNumber]));
  }, []);

  // 处理文档加载失败
  const onDocumentLoadError = (err: Error) => {
    console.error('PDF加载错误:', err);

    // 增加加载尝试次数
    setLoadAttempts(prev => prev + 1);

    // 如果是第一次失败，尝试更换worker源并重试
    if (loadAttempts === 0) {
      // 更改worker源
      if (!workerLoaded) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        setWorkerLoaded(true);

        toast({
          title: "PDF加载失败",
          description: "正在尝试使用备用源重新加载...",
          duration: 3000,
        });

        // 不立即设置错误，给重试机会
        setLoading(true);
        return;
      }
    }

    // 多次尝试后仍失败，显示错误信息
    setError(`加载PDF失败: ${err.message}`);
    setLoading(false);
    setInitialLoad(false);

    toast({
      title: "PDF加载失败",
      description: "请检查网络连接或文件是否损坏",
      variant: "destructive",
      duration: 5000,
    });
  };

  // 滚动事件处理，动态加载页面
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || !numPages || !isLazyLoading) return;

    const scrollArea = scrollAreaRef.current;
    const scrollTop = scrollArea.scrollTop;
    const scrollAreaHeight = scrollArea.clientHeight;

    // 获取所有页面元素
    const pageElements = scrollArea.querySelectorAll('.react-pdf__Page');

    // 找出当前可见的页面
    const currentlyVisiblePages: number[] = [];
    let currentPage = pageNumber;

    pageElements.forEach((pageElement: Element, index) => {
      const pageIndex = index + 1;
      const rect = pageElement.getBoundingClientRect();

      // 判断页面是否在可视区域内
      if (rect.top < scrollAreaHeight && rect.bottom > 0) {
        currentlyVisiblePages.push(pageIndex);

        // 页面中心点在视图中间，则认为是当前页
        const pageCenterY = rect.top + rect.height / 2;
        if (pageCenterY > 0 && pageCenterY < scrollAreaHeight) {
          currentPage = pageIndex;
        }
      }
    });

    // 更新页码和可见页面
    if (currentPage !== pageNumber) {
      setPageNumber(currentPage);

      // 保存阅读进度
      if (selectedPdfFile && numPages) {
        updateReadingProgress({
          filePath: selectedPdfFile.path,
          fileName: selectedPdfFile.name,
          currentPage: currentPage,
          totalPages: numPages,
          lastReadAt: new Date().toISOString(),
          completionPercentage: (currentPage / numPages) * 100
        });
      }
    }

    // 检查是否需要加载更多页面
    if (currentlyVisiblePages.length > 0) {
      const lastVisiblePage = Math.max(...currentlyVisiblePages);
      const additionalPagesToLoad: number[] = [];

      // 预加载后面的几页
      for (let i = lastVisiblePage + 1;
        i <= lastVisiblePage + lazyLoadThreshold && i <= numPages;
        i++) {
        if (!loadedPages.has(i)) {
          additionalPagesToLoad.push(i);
        }
      }

      if (additionalPagesToLoad.length > 0) {
        setVisiblePages(prev => [...new Set([...prev, ...additionalPagesToLoad])]);
      }
    }
  }, [numPages, pageNumber, lazyLoadThreshold, loadedPages, isLazyLoading, selectedPdfFile, updateReadingProgress]);

  // 注册滚动监听
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => {
        scrollArea.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  // 优化移动设备性能的代码
  useEffect(() => {
    if (isMobile || isTablet) {
      // 移动设备上使用较低的初始缩放比例
      setScale(isMobile ? 0.7 : 0.9);

      // 减少同时加载的页数
      setLazyLoadThreshold(isMobile ? 2 : 3);

      // 默认显示较少的页面
      if (numPages && pageNumber) {
        const visibleThreshold = isMobile ? 2 : 3;
        const visiblePagesArray = [];
        for (let i = pageNumber; i < pageNumber + visibleThreshold && i <= numPages; i++) {
          visiblePagesArray.push(i);
        }
        setVisiblePages(visiblePagesArray);
      }
    }
  }, [isMobile, isTablet, numPages, pageNumber]);

  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
      scrollToPage(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < (numPages || 0)) {
      setPageNumber(pageNumber + 1);
      scrollToPage(pageNumber + 1);
    }
  };

  // 滚动到指定页面
  const scrollToPage = (pageNum: number) => {
    if (!scrollAreaRef.current || pageNum < 1 || pageNum > (numPages || 0)) return;

    const pageElements = scrollAreaRef.current.querySelectorAll('.react-pdf__Page');
    if (pageElements.length >= pageNum) {
      const targetPage = pageElements[pageNum - 1] as HTMLElement;
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const zoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5));
  };

  const rotateClockwise = () => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prevRotation) => (prevRotation - 90 + 360) % 360);
  };

  const toggleNightMode = () => {
    setNightMode(!nightMode);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      pdfContainerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error(`无法进入全屏模式: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error(`无法退出全屏模式: ${err.message}`);
      });
    }
  };

  // 切换懒加载模式
  const toggleLazyLoading = () => {
    if (isLazyLoading) {
      // 切换到一次性加载所有页面
      const allPages = Array.from({ length: numPages || 0 }, (_, i) => i + 1);
      setVisiblePages(allPages);
      setIsLazyLoading(false);
    } else {
      // 切换回懒加载模式
      const currentVisiblePages = [];
      for (let i = pageNumber; i < pageNumber + lazyLoadThreshold && i <= (numPages || 0); i++) {
        currentVisiblePages.push(i);
      }
      setVisiblePages(currentVisiblePages);
      setIsLazyLoading(true);
    }
  };

  const handleExitReading = () => {
    // 保存当前阅读进度
    if (selectedPdfFile && numPages) {
      const completionPercentage = (pageNumber / numPages) * 100;
      updateReadingProgress({
        filePath: selectedPdfFile.path,
        fileName: selectedPdfFile.name,
        currentPage: pageNumber,
        totalPages: numPages,
        lastReadAt: new Date().toISOString(),
        completionPercentage
      });

      // 关闭音频播放器
      setShowAudioPlayer(false);
      audioPlayerManuallyToggled.current = false;

      // 退出阅读，返回首页
      exitReading();
      setSelectedFile(null);

      // 使用window.location.href强制刷新并返回首页，确保完全清除PDF查看器状态
      window.location.href = '/';
    }
  };

  // 音频播放功能
  const toggleAudioPlayer = () => {
    // 标记用户已手动切换播放器状态
    audioPlayerManuallyToggled.current = true;
    setShowAudioPlayer(prev => !prev);
  };

  const playAudioFile = (index: number) => {
    if (audioFiles.length > 0 && index >= 0 && index < audioFiles.length) {
      setCurrentAudioIndex(index);
      setShowAudioPlayer(true);
      // 标记用户已手动操作播放器
      audioPlayerManuallyToggled.current = true;
      setIsPlaying(true);
      playAudio(audioFiles[index]);
    }
  };

  const playNextAudio = () => {
    if (audioFiles.length === 0 || currentAudioIndex >= audioFiles.length - 1) return;
    playAudioFile(currentAudioIndex + 1);
  };

  const playPreviousAudio = () => {
    if (audioFiles.length === 0 || currentAudioIndex <= 0) return;
    playAudioFile(currentAudioIndex - 1);
  };

  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.audio.current?.pause();
      } else {
        audioPlayerRef.current.audio.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (audioPlayerRef.current && audioPlayerRef.current.audio.current) {
      audioPlayerRef.current.audio.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  // 响应式设计 - 根据设备设置初始缩放级别
  useEffect(() => {
    if (isMobile) {
      setScale(0.8);
    } else if (isTablet) {
      setScale(1.0);
    } else {
      setScale(1.2);
    }
  }, [isMobile, isTablet]);

  // 计算Canvas尺寸
  useEffect(() => {
    if (!canvasRef.current || !pdfContainerRef.current) return;

    const updateDimensions = () => {
      if (!canvasRef.current || !pdfContainerRef.current) return;
      const { width, height } = pdfContainerRef.current.getBoundingClientRect();
      setCanvasWidth(width);
      setCanvasHeight(height);

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      // 重新绘制所有注释
      renderAnnotations();
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [pdfContainerRef, pageNumber]);

  const renderAnnotations = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 如果是移动设备，限制注释数量以提高性能
    const pageAnnotations = annotations.filter(a => a.pageNumber === pageNumber);
    const annotationsToRender = isMobile ?
      pageAnnotations.slice(-50) : // 移动设备上只渲染最近的50个注释
      pageAnnotations;

    annotationsToRender.forEach(annotation => {
      if (annotation.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(annotation.points[0].x, annotation.points[0].y);

      // 在移动设备上简化绘制过程
      if (isMobile && annotation.points.length > 100) {
        // 对于大量点，每隔几个点才绘制一次，提高性能
        for (let i = 1; i < annotation.points.length; i += 3) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
      } else {
        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
      }

      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.type === 'highlighter' ? 20 : annotation.type === 'pencil' ? 2 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (annotation.type === 'highlighter') {
        ctx.globalAlpha = 0.4;
      } else {
        ctx.globalAlpha = 1.0;
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // 绘制当前正在创建的注释
    if (isDrawing && currentPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

      // 在移动设备上简化绘制过程
      if (isMobile && currentPoints.length > 100) {
        for (let i = 1; i < currentPoints.length; i += 2) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
      } else {
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
      }

      ctx.strokeStyle = getColorForTool();
      ctx.lineWidth = currentTool === 'highlighter' ? 20 : currentTool === 'pencil' ? 2 : 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'highlighter') {
        ctx.globalAlpha = 0.4;
      }

      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  };

  useEffect(() => {
    renderAnnotations();
  }, [annotations, currentPoints, isDrawing, pageNumber]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentTool === 'none') return;

    // 添加新注释
    if (currentPoints.length > 1) {
      const newAnnotation: Annotation = {
        type: currentTool as 'highlighter' | 'pencil' | 'pen',
        color: getColorForTool(),
        points: [...currentPoints],
        pageNumber
      };

      setAnnotations(prev => [...prev, newAnnotation]);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const clearAnnotations = () => {
    // 清除当前页面的注释
    setAnnotations(prev => prev.filter(a => a.pageNumber !== pageNumber));
  };

  // 计算页面容器的样式
  const getContainerStyle = () => {
    return {
      position: 'relative' as const,
      width: '100%',
      height: '100%',
      background: nightMode ? '#121212' : '#f7f7f7',
      transition: 'background 0.3s ease'
    };
  };

  const pdfUrl = selectedPdfFile ? `/content/${selectedPdfFile.path}` : '';

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (currentTool !== 'none') {
      // 如果正在使用注释工具，则使用原来的触摸处理
      handleAnnotationTouchStart(e);
      return;
    }

    setTouchStartY(e.touches[0].clientY);
  };

  // 处理注释相关的触摸开始
  const handleAnnotationTouchStart = (e: React.TouchEvent<any>) => {
    if (currentTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  // 处理触摸移动事件
  const handleTouchMove = (e: React.TouchEvent) => {
    if (currentTool !== 'none') {
      // 如果正在使用注释工具，则使用原来的触摸处理
      handleAnnotationTouchMove(e);
      return;
    }

    // 如果处于滚动模式，不处理页面翻转
    if (scrollMode) return;
  };

  // 处理注释相关的触摸移动
  const handleAnnotationTouchMove = (e: React.TouchEvent<any>) => {
    if (!isDrawing || currentTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  // 处理触摸结束事件
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (currentTool !== 'none') {
      // 如果正在使用注释工具，则使用原来的触摸处理
      handleAnnotationTouchEnd();
      return;
    }

    // 如果处于滚动模式，不处理页面翻转
    if (scrollMode) return;
  };

  // 处理注释相关的触摸结束
  const handleAnnotationTouchEnd = () => {
    if (!isDrawing || currentTool === 'none') return;

    // 添加新注释
    if (currentPoints.length > 1) {
      const newAnnotation: Annotation = {
        type: currentTool as 'highlighter' | 'pencil' | 'pen',
        color: getColorForTool(),
        points: [...currentPoints],
        pageNumber
      };

      setAnnotations(prev => [...prev, newAnnotation]);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // 切换滚动模式
  const toggleScrollMode = () => {
    setScrollMode(!scrollMode);
    // 切换到滚动模式时，将缩放调整为稍小一些
    if (!scrollMode) {
      setScale(prev => Math.max(prev * 0.9, 0.6));
    } else {
      setScale(prev => Math.min(prev * 1.1, 3.0));
    }
  };

  const getColorForTool = (): string => {
    if (currentTool === 'highlighter') {
      switch (currentColor) {
        case 'yellow': return 'rgba(255, 255, 0, 0.3)';
        case 'blue': return 'rgba(0, 191, 255, 0.3)';
        case 'pink': return 'rgba(255, 105, 180, 0.3)';
        default: return 'rgba(255, 255, 0, 0.3)';
      }
    } else if (currentTool === 'pencil') {
      return '#666666';
    } else if (currentTool === 'pen') {
      return '#000000';
    }
    return 'transparent';
  };

  const setTool = (tool: AnnotationTool) => {
    setCurrentTool(tool);
  };

  const setColor = (color: HighlighterColor) => {
    setCurrentColor(color);
  };

  // 更新无极翻页的实现
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // 降低滑动阈值，使翻页更加灵敏
    const threshold = isMobile ? 30 : 40;

    if (info.offset.y > threshold && pageNumber > 1) {
      // 向下滑，显示上一页
      goToPrevPage();
      setShowPageTurnIndicator('prev');
      setTimeout(() => setShowPageTurnIndicator(null), 500);

      // 添加触觉反馈 (如果设备支持)
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    } else if (info.offset.y < -threshold && pageNumber < (numPages || 0)) {
      // 向上滑，显示下一页
      goToNextPage();
      setShowPageTurnIndicator('next');
      setTimeout(() => setShowPageTurnIndicator(null), 500);

      // 添加触觉反馈 (如果设备支持)
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  };

  // 添加以下函数来优化性能
  const optimizeForScreenSize = useCallback(() => {
    // 在小屏幕上降低渲染质量以提高性能
    if (isMobile) {
      // 降低缩放等级和使用更低质量的渲染
      setScale(prev => Math.min(prev, 0.8));

      // 更简洁的工具栏
      if (window.innerWidth < 360) {
        setShowToolbar(false);
      }
    }
  }, [isMobile]);

  // 在组件挂载和屏幕尺寸变化时应用优化
  useEffect(() => {
    optimizeForScreenSize();

    const handleResize = () => {
      optimizeForScreenSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [optimizeForScreenSize]);

  if (!selectedPdfFile) {
    return (
      <div className="h-full flex flex-col items-center justify-center acrylic quantum-dot">
        <div className="text-center p-8 space-y-4">
          <div className="flex justify-center">
            <FileText className="h-20 w-20 text-primary/30" />
          </div>
          <h3 className="text-xl font-medium">请选择PDF文件</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            从左侧文件浏览器选择PDF文件进行阅读。支持高亮、铅笔、钢笔等标注功能。
          </p>
        </div>
      </div>
    );
  }

  const currentAudioFile = audioFiles[currentAudioIndex];
  const audioUrl = currentAudioFile ? `/content/${currentAudioFile.path}` : '';
  const audioFileName = currentAudioFile ? currentAudioFile.name : '';

  return (
    <div
      ref={pdfContainerRef}
      className={`pdf-viewer-container fixed inset-0 ${isFullscreen ? 'z-50' : 'z-30'} w-full h-full overflow-hidden`}
      style={getContainerStyle()}
    >
      {/* 顶部控制栏 - 更小更紧凑 */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-2 py-1 bg-background/90 backdrop-blur-sm border-b border-border shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExitReading}
          className="flex items-center gap-1 h-7"
        >
          <ArrowLeft className="h-3 w-3" />
          <span className={isMobile ? 'sr-only' : 'text-xs'}>返回</span>
        </Button>

        <div className="flex items-center text-xs">
          <span className="mx-2">
            {pageNumber} / {numPages || '--'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {audioFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAudioPlayer}
              className="flex items-center gap-1 h-7"
            >
              <Music className="h-3 w-3" />
              <span className="sr-only">
                {showAudioPlayer ? '隐藏音频' : '显示音频'}
              </span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={toggleNightMode} className="text-xs">
                {nightMode ? '日间模式' : '夜间模式'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullScreen} className="text-xs">
                {isFullscreen ? '退出全屏' : '全屏模式'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowToolbar(!showToolbar)} className="text-xs">
                {showToolbar ? '隐藏工具栏' : '显示工具栏'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleLazyLoading} className="text-xs">
                {isLazyLoading ? (
                  <><Eye className="h-3 w-3 mr-1" /> 一次性加载所有页面</>
                ) : (
                  <><EyeOff className="h-3 w-3 mr-1" /> 恢复渐进式加载</>
                )}
              </DropdownMenuItem>
              {currentTool !== 'none' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAnnotations} className="text-xs">
                    清除当前页注释
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        {showToolbar && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${isMobile || isTablet ? 'top-10' : 'top-10'} inset-x-0 mx-auto w-auto max-w-xl z-40 flex justify-center`}
          >
            <div className={`acrylic rounded-full px-1 py-1 ${isMobile ? 'flex flex-wrap justify-center max-w-[95%]' : 'flex flex-row'} items-center gap-1 shadow-lg`}>
              {/* 页面控制 - 在滚动模式中显示页面跳转控制 */}
              <div className="flex items-center space-x-1 px-1 my-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  className="h-7 w-7 rounded-full"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={pageNumber >= (numPages || 0)}
                  className="h-7 w-7 rounded-full"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {isMobile ? null : <div className="w-px h-5 bg-border mx-1"></div>}

              {/* 缩放控制 */}
              <div className="flex items-center space-x-1 px-1 my-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomOut}
                  className="h-7 w-7 rounded-full"
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={zoomIn}
                  className="h-7 w-7 rounded-full"
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>

              {isMobile ? null : <div className="w-px h-5 bg-border mx-1"></div>}

              {/* 旋转控制 - 在超小屏幕上隐藏 */}
              {window.innerWidth > 380 && (
                <>
                  <div className="flex items-center space-x-1 px-1 my-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={rotateCounterClockwise}
                      className="h-7 w-7 rounded-full"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={rotateClockwise}
                      className="h-7 w-7 rounded-full"
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  </div>

                  {isMobile ? null : <div className="w-px h-5 bg-border mx-1"></div>}
                </>
              )}

              {/* 注释工具 */}
              <div className="flex items-center space-x-1 px-1 my-1">
                <Button
                  variant={currentTool === 'highlighter' ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setTool(currentTool === 'highlighter' ? 'none' : 'highlighter')}
                  className="h-7 w-7 rounded-full"
                >
                  <Highlighter className="h-3 w-3" />
                </Button>
                <Button
                  variant={currentTool === 'pencil' ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setTool(currentTool === 'pencil' ? 'none' : 'pencil')}
                  className="h-7 w-7 rounded-full"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant={currentTool === 'pen' ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setTool(currentTool === 'pen' ? 'none' : 'pen')}
                  className="h-7 w-7 rounded-full"
                >
                  <Pen className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearAnnotations}
                  className="h-7 w-7 rounded-full"
                >
                  <Eraser className="h-3 w-3" />
                </Button>
              </div>

              {/* 高亮颜色选择器 - 仅在高亮模式时显示 */}
              {currentTool === 'highlighter' && (
                <>
                  {isMobile ? null : <div className="w-px h-5 bg-border mx-1"></div>}
                  <div className="flex items-center space-x-1 px-1 my-1">
                    <Button
                      variant={currentColor === 'yellow' ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setColor('yellow')}
                      className="h-6 w-6 rounded-full bg-yellow-200 hover:bg-yellow-300"
                    />
                    <Button
                      variant={currentColor === 'blue' ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setColor('blue')}
                      className="h-6 w-6 rounded-full bg-blue-200 hover:bg-blue-300"
                    />
                    <Button
                      variant={currentColor === 'pink' ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setColor('pink')}
                      className="h-6 w-6 rounded-full bg-pink-200 hover:bg-pink-300"
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 隐藏工具栏时的展开按钮 */}
      {!showToolbar && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed top-10 left-1/2 transform -translate-x-1/2 z-40 opacity-30 hover:opacity-100 rounded-full shadow-md h-6 text-xs"
          onClick={() => setShowToolbar(true)}
        >
          显示工具栏
        </Button>
      )}

      {/* 音频播放器 - 使用悬浮播放器组件 */}
      {showAudioPlayer && audioFiles.length > 0 && (
        <AudioPlayerClient />
      )}

      {/* PDF 查看器 - 始终使用滚动模式 */}
      <div
        className={`${nightMode ? 'night-mode' : ''} h-full w-full pt-8 ${showAudioPlayer ? 'pb-16' : ''}`}
        onClick={() => currentTool === 'none' && showToolbar === false ? setShowToolbar(true) : null}
      >
        {/* 初始加载状态 - 修改为更友好的提示 */}
        {initialLoad && (
          <div className="fixed inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-card/80 shadow-lg max-w-[90%]">
              <div className="flex space-x-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-3 w-3 bg-primary rounded-full"
                    style={{
                      animation: `bounce 1.4s infinite ease-in-out both`,
                      animationDelay: `${index * 0.16}s`
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">正在加载文档...</p>
              <p className="text-xs text-muted-foreground text-center">
                {loadAttempts > 0
                  ? "加载时间较长，正在重试..."
                  : "首次加载可能需要较长时间，请耐心等待"}
              </p>
              {loadAttempts > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleExitReading}
                >
                  返回选择其他文件
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 加载中状态 */}
        {loading && !initialLoad && (
          <div className="fixed inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm z-10">
            <div className="flex space-x-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-2 w-2 bg-primary rounded-full"
                  style={{
                    animation: `bounce 1.4s infinite ease-in-out both`,
                    animationDelay: `${index * 0.16}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 错误状态 - 增加重试选项 */}
        {error && (
          <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md mx-4">
              <h3 className="text-lg font-semibold text-destructive mb-2">加载失败</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setInitialLoad(true);
                    // 强制重新加载页面
                    window.location.reload();
                  }}
                >
                  重新加载
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExitReading}
                >
                  返回选择其他文件
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 使用滚动模式 */}
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full w-full overflow-y-auto"
          style={{
            height: `calc(100vh - ${showAudioPlayer ? '64px' : '0px'})`
          }}
        >
          <div className="flex justify-center w-full px-2 md:px-4">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="w-full max-w-3xl mx-auto flex flex-col items-center"
            >
              {visiblePages.map((pageNum) => (
                <div key={`page_${pageNum}`} className="mb-6 w-full flex justify-center">
                  <LazyPage
                    pageNumber={pageNum}
                    scale={scale}
                    rotation={rotation}
                    onPageLoadSuccess={onPageLoadSuccess}
                  />
                </div>
              ))}
              {numPages && numPages > 0 && !isLazyLoading && (
                <div className="flex justify-center my-4 text-sm text-muted-foreground">
                  已加载全部 {numPages} 页
                </div>
              )}
            </Document>
          </div>
        </ScrollArea>

        {/* 注释画布层 */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`absolute inset-0 z-10 ${currentTool !== 'none' ? 'annotation-container active' : 'annotation-container'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={e => currentTool !== 'none' && handleAnnotationTouchStart(e)}
          onTouchMove={e => currentTool !== 'none' && handleAnnotationTouchMove(e)}
          onTouchEnd={() => currentTool !== 'none' && handleAnnotationTouchEnd()}
        />
      </div>
    </div>
  );
} 