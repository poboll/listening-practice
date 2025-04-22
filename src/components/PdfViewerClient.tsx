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
  Loader2, Eye, EyeOff, Database
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
import { usePdfCache } from '@/hooks/usePdfCache';

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

interface PdfViewerClientProps {
  isHighPerformance: boolean | null;
}

// 添加 Props 定义并解构
export function PdfViewerClient({ isHighPerformance }: PdfViewerClientProps) {
  const router = useRouter();
  const { selectedPdfFile, setSelectedFile, directoryContent, playAudio } = useFileContext();
  const { updateReadingProgress, exitReading } = useReadingProgress();
  const { toast } = useToast();
  const { cacheExists, saveToCache, getFromCache, clearCache } = usePdfCache();
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
  const [loadAttempts, setLoadAttempts] = useState<number>(0);
  const [workerLoaded, setWorkerLoaded] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);
  const [documentLoaded, setDocumentLoaded] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [autoLoadAllPages, setAutoLoadAllPages] = useState<boolean>(false);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cachingEnabled, setCachingEnabled] = useState<boolean>(true);

  // 新增的状态变量
  const [showPageTurnIndicator, setShowPageTurnIndicator] = useState<'prev' | 'next' | null>(null);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [scrollMode, setScrollMode] = useState<boolean>(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      // 重置文档加载状态
      setDocumentLoaded(false);

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

  // 添加自动全部加载检测函数 - 使用传入的 isHighPerformance
  useEffect(() => {
    const checkAutoLoadAllPages = () => {
      // 使用传入的 isHighPerformance
      const highPerformanceDevice = isHighPerformance ?? false;

      // 检查网络状况
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      let fastNetwork = true;
      if (connection) {
        // 检测网络类型和速度
        const netType = connection.type;
        const effectiveType = connection.effectiveType;

        // 慢网络条件: 2g或速度较慢的网络
        fastNetwork = !(netType === 'cellular' &&
          (effectiveType === 'slow-2g' || effectiveType === '2g'));
      }

      // 如果是高性能设备且网络良好，则自动加载所有页面
      if (highPerformanceDevice && fastNetwork) {
        setAutoLoadAllPages(true);
      } else {
        setAutoLoadAllPages(false);
      }
    };

    checkAutoLoadAllPages();
    // 更新依赖项
  }, [isMobile, isHighPerformance]);

  // 修改PDF缓存实现
  useEffect(() => {
    // 如果选择了PDF文件且启用了缓存
    if (selectedPdfFile && cachingEnabled) {
      const pdfUrl = `/content/${selectedPdfFile.path}`;
      const cacheKey = selectedPdfFile.path;

      // 先检查是否有缓存
      const checkCache = async () => {
        try {
          const exists = await cacheExists(cacheKey);
          if (exists) {
            try {
              const cachedData = await getFromCache(cacheKey);
              if (cachedData) {
                setPdfData(cachedData);
                setFromCache(true);
                toast({
                  title: "使用缓存版本",
                  description: "已从缓存加载文档，加载速度更快",
                  duration: 2000,
                });
              } else {
                // 缓存数据获取失败，从网络加载
                setPdfData(null);
                setFromCache(false);
                fetchAndCachePdf(pdfUrl, cacheKey);
              }
            } catch (error) {
              console.error('获取缓存数据失败:', error);
              setPdfData(null);
              setFromCache(false);
              fetchAndCachePdf(pdfUrl, cacheKey);
            }
          } else {
            // 没有缓存，从网络加载
            setPdfData(null);
            setFromCache(false);
            fetchAndCachePdf(pdfUrl, cacheKey);
          }
        } catch (error) {
          console.error('检查缓存失败:', error);
          setPdfData(null);
          setFromCache(false);
        }
      };

      checkCache();
    } else {
      setPdfData(null);
      setFromCache(false);
    }
  }, [selectedPdfFile, cachingEnabled]);

  // 添加获取并缓存PDF的函数
  const fetchAndCachePdf = async (pdfUrl: string, cacheKey: string) => {
    try {
      // 显示加载状态
      setLoading(true);

      // 获取PDF文件
      const response = await fetch(pdfUrl);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
      }

      // 获取ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // 设置PDF数据
      setPdfData(arrayBuffer);

      // 缓存PDF数据
      saveToCache(cacheKey, arrayBuffer)
        .then(() => {
          console.log('PDF已成功缓存');
        })
        .catch(error => {
          console.error('缓存PDF时出错:', error);
        });

    } catch (error) {
      console.error('获取PDF时出错:', error);
      setError(`加载PDF失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setLoading(false);
    }
  };

  // 处理滚动结束检测 - 在滚动停止时加载更多页面
  useEffect(() => {
    // 只有在懒加载模式下启用
    if (!isLazyLoading || !scrollAreaRef.current) return;

    const handleScroll = () => {
      setIsScrolling(true);

      // 清除之前的超时
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 设置新的超时 - 滚动停止500ms后触发
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        // 滚动结束后检查是否需要加载更多页面
        checkNeedLoadMorePages();
      }, 500);
    };

    const scrollArea = scrollAreaRef.current;
    scrollArea.addEventListener('scroll', handleScroll);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollArea.removeEventListener('scroll', handleScroll);
    };
  }, [isLazyLoading, numPages, loadedPages]);

  // 检查是否需要加载更多页面
  const checkNeedLoadMorePages = useCallback(() => {
    if (!numPages || !scrollAreaRef.current) return;

    const scrollArea = scrollAreaRef.current;
    const scrollPosition = scrollArea.scrollTop;
    const clientHeight = scrollArea.clientHeight;
    const scrollHeight = scrollArea.scrollHeight;

    // 已滚动到内容的90%位置
    const scrollThreshold = 0.9;
    const scrollPercentage = (scrollPosition + clientHeight) / scrollHeight;

    if (scrollPercentage > scrollThreshold) {
      const currentLastPage = Math.max(...Array.from(loadedPages));
      const maxPageToLoad = Math.min(numPages, currentLastPage + lazyLoadThreshold);

      if (maxPageToLoad > currentLastPage) {
        // 明确 pagesToAdd 的类型为 number[]
        const pagesToAdd: number[] = [];
        for (let i = currentLastPage + 1; i <= maxPageToLoad; i++) {
          if (!loadedPages.has(i)) {
            pagesToAdd.push(i);
          }
        }

        if (pagesToAdd.length > 0) {
          setVisiblePages(prev => [...new Set([...prev, ...pagesToAdd])]);
        }
      }
    }
  }, [numPages, loadedPages, lazyLoadThreshold]);

  // 优化处理文档加载成功函数
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setInitialLoad(false);
    setError(null);
    setDocumentLoaded(true);

    // 加载成功后重置尝试次数
    setLoadAttempts(0);

    // 初始化可见页面数组
    if (pageNumber > 0 && pageNumber <= numPages) {
      // 如果已经设置了自动加载所有页面或来自缓存，则一次性加载所有页面
      if (autoLoadAllPages || fromCache) {
        const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
        setVisiblePages(allPages);
        setIsLazyLoading(false);
        console.log(`自动加载所有${numPages}页 - ${autoLoadAllPages ? '高性能设备' : '缓存加速'}`);
      } else {
        // 否则使用懒加载方式
        const visibleThreshold = isMobile ? 3 : isTablet ? 5 : lazyLoadThreshold + 2;
        const visiblePagesArray = [];
        for (let i = pageNumber; i < pageNumber + visibleThreshold && i <= numPages; i++) {
          visiblePagesArray.push(i);
        }
        setVisiblePages(visiblePagesArray);
      }
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

    // 如果页面不可见，先不处理错误
    if (!isPageVisible) {
      console.log('页面不可见，暂不处理PDF加载错误');
      return;
    }

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
    setDocumentLoaded(false); // 标记文档加载失败

    toast({
      title: "PDF加载失败",
      description: "请检查网络连接或文件是否损坏",
      variant: "destructive",
      duration: 5000,
    });
  };

  // 添加页面可见性监听
  useEffect(() => {
    // 页面可见性变化处理函数
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsPageVisible(isVisible);

      // 当页面变为可见且PDF已经加载过但当前显示为加载中状态时
      if (isVisible && documentLoaded && (loading || initialLoad)) {
        console.log('页面恢复可见，重置PDF加载状态');

        // 短暂延迟后重置加载状态，让UI有时间响应
        setTimeout(() => {
          setLoading(false);
          setInitialLoad(false);

          // 如果有错误状态也清除
          if (error) {
            setError(null);
          }

          // 通知用户页面已恢复
          toast({
            title: "阅读已恢复",
            description: "页面已重新激活",
            duration: 2000,
          });

          // 如果PDF确实没有正确加载，可以尝试重新渲染Document组件
          if (numPages === null && selectedPdfFile) {
            // 强制刷新Document组件
            setLoadAttempts(prev => prev + 1);
          }
        }, 300);
      }
    };

    // 注册页面可见性事件监听
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [documentLoaded, loading, initialLoad, error, numPages, selectedPdfFile, toast]);

  // 当选择的PDF文件变化时，重置文档加载状态
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
      // 重置文档加载状态
      setDocumentLoaded(false);

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

  // 添加页面重新获得焦点时的重载逻辑
  // 在现有的处理文档加载相关代码下添加
  useEffect(() => {
    // 当页面可见且文档应该已经加载但状态不对时进行处理
    if (isPageVisible && documentLoaded && loading) {
      // 重置加载状态
      setLoading(false);
    }
  }, [isPageVisible, documentLoaded, loading]);

  // 修改滚动事件处理函数，提高加载效率
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || !numPages || !isLazyLoading) return;

    const scrollArea = scrollAreaRef.current;
    const scrollTop = scrollArea.scrollTop;
    const scrollAreaHeight = scrollArea.clientHeight;
    const scrollHeight = scrollArea.scrollHeight;

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

    // 检查是否接近底部，需要提前加载更多页面
    const scrollPercentage = (scrollTop + scrollAreaHeight) / scrollHeight;
    if (scrollPercentage > 0.8 && currentlyVisiblePages.length > 0) {
      const lastVisiblePage = Math.max(...currentlyVisiblePages);
      const additionalPagesToLoad: number[] = [];

      // 预加载更多页面，提高用户体验
      const extraPagesToLoad = isMobile ? 2 : 5; // 移动设备加载更少页面
      for (let i = lastVisiblePage + 1;
        i <= lastVisiblePage + extraPagesToLoad && i <= numPages;
        i++) {
        if (!loadedPages.has(i)) {
          additionalPagesToLoad.push(i);
        }
      }

      if (additionalPagesToLoad.length > 0) {
        setVisiblePages(prev => [...new Set([...prev, ...additionalPagesToLoad])]);
      }
    }
  }, [numPages, pageNumber, loadedPages, isLazyLoading, selectedPdfFile, updateReadingProgress, isMobile]);

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

  // 更新页面跳转函数，确保目标页面已加载
  const scrollToPage = (pageNum: number) => {
    if (!scrollAreaRef.current || pageNum < 1 || pageNum > (numPages || 0)) return;

    if (!loadedPages.has(pageNum)) {
      // 明确 pagesToAdd 的类型为 number[]
      const pagesToAdd: number[] = [];
      for (let i = Math.max(1, pageNum - 2); i <= Math.min(numPages || 0, pageNum + 5); i++) {
        if (!loadedPages.has(i)) {
          pagesToAdd.push(i);
        }
      }

      if (pagesToAdd.length > 0) {
        setVisiblePages(prev => [...new Set([...prev, ...pagesToAdd])]);

        setTimeout(() => {
          scrollToTarget(pageNum);
        }, 100);
      } else {
        scrollToTarget(pageNum);
      }
    } else {
      scrollToTarget(pageNum);
    }
  };

  // 抽取实际滚动到目标页面的函数
  const scrollToTarget = (pageNum: number) => {
    if (!scrollAreaRef.current) return;

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

  // 优化切换懒加载模式函数
  const toggleLazyLoading = () => {
    if (isLazyLoading) {
      // 切换到一次性加载所有页面
      if (numPages) {
        const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
        setVisiblePages(allPages);
        setIsLazyLoading(false);

        toast({
          title: "加载模式已更改",
          description: "已切换到一次性加载所有页面模式",
          duration: 2000,
        });
      }
    } else {
      // 切换回懒加载模式
      if (numPages && pageNumber) {
        const visibleThreshold = isMobile ? 3 : isTablet ? 5 : lazyLoadThreshold;
        const currentVisiblePages = [];
        for (let i = Math.max(1, pageNumber - 1);
          i < pageNumber + visibleThreshold && i <= numPages; i++) {
          currentVisiblePages.push(i);
        }
        setVisiblePages(currentVisiblePages);
        setIsLazyLoading(true);

        toast({
          title: "加载模式已更改",
          description: "已切换到渐进式加载模式",
          duration: 2000,
        });
      }
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

  // 添加缓存控制功能
  const toggleCaching = () => {
    setCachingEnabled(!cachingEnabled);

    toast({
      title: cachingEnabled ? "已禁用PDF缓存" : "已启用PDF缓存",
      description: cachingEnabled ?
        "PDF将不再被缓存，可能会增加加载时间" :
        "PDF将被缓存以加快加载速度",
      duration: 2000,
    });
  };

  // 清除指定PDF缓存
  const clearCurrentPdfCache = () => {
    if (selectedPdfFile) {
      clearCache(selectedPdfFile.path)
        .then(() => {
          toast({
            title: "缓存已清除",
            description: "当前PDF的缓存已成功清除",
            duration: 2000,
          });
        })
        .catch(error => {
          console.error('清除缓存失败:', error);
          toast({
            title: "清除缓存失败",
            description: "无法清除PDF缓存，请稍后再试",
            variant: "destructive",
            duration: 3000,
          });
        });
    }
  };

  if (isHighPerformance === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在检测设备性能...</p>
        </div>
      </div>
    );
  }

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
                {nightMode ? <><Sun className="h-3 w-3 mr-1" /> 日间模式</> : <><Moon className="h-3 w-3 mr-1" /> 夜间模式</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullScreen} className="text-xs">
                {isFullscreen ? <><Minimize2 className="h-3 w-3 mr-1" /> 退出全屏</> : <><Maximize2 className="h-3 w-3 mr-1" /> 全屏模式</>}
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleCaching} className="text-xs">
                {cachingEnabled ? (
                  <><Database className="h-3 w-3 mr-1" /> 禁用PDF缓存</>
                ) : (
                  <><Database className="h-3 w-3 mr-1" /> 启用PDF缓存</>
                )}
              </DropdownMenuItem>
              {fromCache && (
                <DropdownMenuItem onClick={clearCurrentPdfCache} className="text-xs text-destructive">
                  <Trash2 className="h-3 w-3 mr-1" /> 清除当前PDF缓存
                </DropdownMenuItem>
              )}
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
        {/* 初始加载状态 - 现在由 PdfViewerClient 内部处理 */}
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
                {fromCache ? '从缓存加载...' : loadAttempts > 0
                  ? "加载时间较长，正在重试..."
                  : "首次加载可能需要较长时间，请耐心等待"}
              </p>
              {loadAttempts > 0 && !fromCache && (
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
                    setDocumentLoaded(false);
                    // 强制重新加载页面
                    window.location.reload();
                  }}
                >
                  重新加载
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // 尝试恢复加载，不刷新页面
                    setError(null);
                    setLoading(true);
                    setLoadAttempts(prev => prev + 1);
                    // 短时间后重新检查状态
                    setTimeout(() => {
                      // 如果还是在加载状态，显示提示
                      if (loading && !documentLoaded) {
                        toast({
                          title: "恢复失败",
                          description: "请尝试重新加载或返回",
                          variant: "destructive",
                          duration: 3000,
                        });
                      }
                    }, 2000);
                  }}
                >
                  尝试恢复
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
              file={pdfData || (selectedPdfFile ? `/content/${selectedPdfFile.path}` : '')}
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