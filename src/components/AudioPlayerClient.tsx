"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFileContext } from '@/contexts/FileContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play, Pause, SkipBack, SkipForward, Rewind, FastForward,
  Volume2, VolumeX, X, Music, Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';

export function AudioPlayerClient() {
  const { currentAudioFile, directoryContent, playAudio } = useFileContext();
  const { toast } = useToast();
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.9);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentLoadedPath, setCurrentLoadedPath] = useState<string | null>(null);
  const initializingRef = useRef(false);

  // 简化对比逻辑，确保路径一致性
  const getFullAudioPath = (path: string) => {
    return path.startsWith('/') ? `/content${path}` : `/content/${path}`;
  };

  // 仅在音频文件变化或完全不存在时更新播放器显示状态
  useEffect(() => {
    if (currentAudioFile) {
      console.log('AudioPlayerClient: 音频文件变更检测:', currentAudioFile);
      setIsPlayerVisible(true);
    } else {
      console.log('AudioPlayerClient: 隐藏音频播放器');
      setIsPlayerVisible(false);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setCurrentLoadedPath(null);
    }
  }, [currentAudioFile]);

  // 专门处理音频加载逻辑，使用audioRef.current.src作为判断依据，避免重复加载
  useEffect(() => {
    if (!isPlayerVisible || !currentAudioFile || initializingRef.current) return;

    const audioPath = currentAudioFile.path;
    const fullAudioPath = getFullAudioPath(audioPath);

    // 如果当前加载的路径与新路径相同，不重新加载
    if (currentLoadedPath === audioPath && audioRef.current?.src.includes(encodeURIComponent(audioPath.split('/').pop() || ''))) {
      console.log('AudioPlayerClient: 音频已加载，跳过重复加载');
      return;
    }

    console.log('AudioPlayerClient: 开始加载新音频:', fullAudioPath);
    initializingRef.current = true;
    setIsLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(null);

    try {
      if (audioRef.current) {
        // 清理旧的事件和状态
        audioRef.current.pause();
        setIsPlaying(false);

        // 设置新的音频源
        audioRef.current.src = fullAudioPath;
        audioRef.current.load();
        setCurrentLoadedPath(audioPath);

        console.log('AudioPlayerClient: 音频源已设置:', fullAudioPath);
      }
    } catch (err) {
      console.error('AudioPlayerClient: 音频加载异常:', err);
      setLoadError('音频文件加载失败');
      setIsLoading(false);
      initializingRef.current = false;
    }

    // 更新当前音频在列表中的索引
    const index = audioFiles.findIndex(file => file.path === audioPath);
    if (index !== -1) {
      setCurrentAudioIndex(index);
    } else {
      setCurrentAudioIndex(-1);
    }

    return () => {
      initializingRef.current = false;
    };
  }, [isPlayerVisible, currentAudioFile, audioFiles, currentLoadedPath]);

  // 处理音频文件列表更新
  useEffect(() => {
    if (directoryContent) {
      const mp3Files = directoryContent.items
        .filter(item => !item.isDirectory && item.type === 'mp3');
      setAudioFiles(mp3Files);

      if (currentAudioFile && !mp3Files.some(f => f.path === currentAudioFile.path)) {
        console.warn('AudioPlayerClient: 当前音频文件未在更新列表中找到');
      }
    }
  }, [directoryContent, currentAudioFile]);

  // 音频事件监听和控制
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedData = () => {
      console.log('AudioPlayerClient: 音频数据已加载，准备就绪');

      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        console.log('AudioPlayerClient: 音频时长:', audio.duration);
        setDuration(audio.duration);
        setIsLoading(false);
        setLoadError(null);
        initializingRef.current = false;

        // 自动播放仅在isPlaying为true时尝试
        if (isPlaying) {
          console.log('AudioPlayerClient: 尝试自动播放');
          audio.play().catch(err => {
            console.error('AudioPlayerClient: 自动播放失败:', err);
            setIsPlaying(false);
            initializingRef.current = false;
            toast({
              title: "播放失败",
              description: "浏览器阻止了自动播放，请手动点击播放按钮",
              variant: "destructive",
            });
          });
        }
      } else {
        console.warn('AudioPlayerClient: 音频时长无效:', audio.duration);
        setIsLoading(false);
        setLoadError('音频文件格式错误');
        initializingRef.current = false;
      }
    };

    const handleEnded = () => {
      console.log('AudioPlayerClient: 音频播放结束');
      setIsPlaying(false);
      setCurrentTime(duration);

      if (currentAudioIndex !== -1 && currentAudioIndex < audioFiles.length - 1) {
        playNext();
      }
    };

    const handleLoadingStart = () => {
      console.log('AudioPlayerClient: 音频开始加载');
      setIsLoading(true);
    };

    const handleWaiting = () => {
      console.log('AudioPlayerClient: 音频等待数据（缓冲中）');
      setIsLoading(true);
    };

    const handlePlaying = () => {
      console.log('AudioPlayerClient: 音频开始播放');
      setIsLoading(false);
      setIsPlaying(true);
      setLoadError(null);
      initializingRef.current = false;
    };

    const handleCanPlay = () => {
      console.log('AudioPlayerClient: 音频可以播放了');
      setIsLoading(false);
      initializingRef.current = false;
    };

    const handleError = (e: Event) => {
      const errorCode = audio?.error?.code;
      const errorMessage = audio?.error?.message;

      console.error('AudioPlayerClient: 音频加载错误:', {
        errorCode,
        errorMessage,
        errorDetails: audio?.error
      });

      let userErrorMessage = '未知错误';

      // 根据错误代码提供更具体的错误信息
      if (errorCode === 1) {
        userErrorMessage = '音频获取被中断';
      } else if (errorCode === 2) {
        userErrorMessage = '网络错误';
      } else if (errorCode === 3) {
        userErrorMessage = '音频解码失败，可能是格式不支持';
      } else if (errorCode === 4) {
        userErrorMessage = '音频源不可用或格式不支持';
      }

      setIsLoading(false);
      setIsPlaying(false);
      setLoadError(userErrorMessage);
      initializingRef.current = false;

      toast({
        title: "音频加载错误",
        description: `无法加载音频文件: ${userErrorMessage}`,
        variant: "destructive",
      });
    };

    // 添加事件监听器
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('loadstart', handleLoadingStart);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    // 设置音频属性
    audio.volume = isMuted ? 0 : volume;
    audio.playbackRate = playbackRate;

    // 清理函数
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadstart', handleLoadingStart);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [isPlaying, isMuted, volume, playbackRate, currentAudioIndex, audioFiles, toast, duration]);

  const handlePlayPause = () => {
    if (!audioRef.current || !currentAudioFile) {
      console.warn('AudioPlayerClient: 尝试播放/暂停，但没有音频元素或文件');
      return;
    }

    if (isLoading && !loadError) {
      console.log('AudioPlayerClient: 正在加载中，忽略播放/暂停请求');
      return;
    }

    if (loadError) {
      // 如果之前有加载错误，尝试重新加载
      console.log('AudioPlayerClient: 之前有加载错误，尝试重新加载');
      setLoadError(null);
      setIsLoading(true);

      if (currentAudioFile) {
        const audioSrc = getFullAudioPath(currentAudioFile.path);
        audioRef.current.src = audioSrc;
        audioRef.current.load();
      }
      return;
    }

    if (isPlaying) {
      console.log('AudioPlayerClient: 手动暂停');
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log('AudioPlayerClient: 尝试手动播放');
      setIsLoading(true);

      // 确保音频已加载完成
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('AudioPlayerClient: 开始播放成功');
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(err => {
          console.error('AudioPlayerClient: 手动播放失败:', err);
          setIsLoading(false);
          toast({
            title: "播放失败",
            description: "无法播放音频，请检查文件或重试",
            variant: "destructive"
          });
        });
      }
    }
  };

  // 其他处理函数保持不变
  const handleSeek = (value: number[]) => {
    if (!audioRef.current || isNaN(value[0])) return;
    const newTime = value[0];
    if (duration > 0) {
      audioRef.current.currentTime = Math.min(newTime, duration);
      setCurrentTime(Math.min(newTime, duration));
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current || isNaN(value[0])) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const currentlyMuted = !isMuted;
    audioRef.current.volume = currentlyMuted ? 0 : volume;
    setIsMuted(currentlyMuted);
  };

  const skipForward = () => {
    if (!audioRef.current || duration === 0) return;
    const newTime = Math.min(audioRef.current.currentTime + 10, duration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - 10, 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: string) => {
    if (!audioRef.current) return;
    const newRate = parseFloat(rate);
    if (!isNaN(newRate)) {
      audioRef.current.playbackRate = newRate;
      setPlaybackRate(newRate);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsVolumeSliderVisible(false);
  };

  const playNext = () => {
    if (audioFiles.length === 0 || currentAudioIndex >= audioFiles.length - 1) return;
    const nextIndex = currentAudioIndex + 1;
    if (audioFiles[nextIndex]) {
      playAudio(audioFiles[nextIndex]);
      setIsPlaying(true);
    }
  };

  const playPrevious = () => {
    if (audioFiles.length === 0 || currentAudioIndex <= 0) return;
    const prevIndex = currentAudioIndex - 1;
    if (audioFiles[prevIndex]) {
      playAudio(audioFiles[prevIndex]);
      setIsPlaying(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (!isPlayerVisible) {
    return null;
  }

  const fileName = currentAudioFile ? currentAudioFile.name : '加载中...';
  const displayIndex = currentAudioIndex !== -1 ? currentAudioIndex + 1 : '-';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card
          className={`shadow-xl border border-border/20 dark:border-border/10 backdrop-blur-md bg-background/80 dark:bg-background/70 ${isMinimized ? 'w-16 h-16 rounded-full cursor-pointer' : 'w-80 rounded-lg'
            } transition-all duration-300 ease-in-out overflow-hidden`}
          onClick={isMinimized ? toggleMinimize : undefined}
        >
          {isMinimized ? (
            <motion.div
              className="h-full flex items-center justify-center rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Music className="h-6 w-6 text-primary" />
              )}
            </motion.div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : isPlaying ? (
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1],
                          transition: { duration: 0.5, repeat: Infinity }
                        }}
                      >
                        <Music className="h-4 w-4 text-primary" />
                      </motion.div>
                    ) : (
                      <Music className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium truncate text-foreground">
                      {fileName}
                    </h3>
                    {loadError && (
                      <p className="text-xs text-red-500 truncate">
                        错误: {loadError}
                      </p>
                    )}
                    {!loadError && audioFiles.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {displayIndex} / {audioFiles.length}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-12 text-xs px-1 rounded-full border border-border/50 hover:bg-muted/50"
                      >
                        {playbackRate}x
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-20">
                      <DropdownMenuLabel className="text-xs">播放速度</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup
                        value={playbackRate.toString()}
                        onValueChange={changePlaybackRate}
                      >
                        <DropdownMenuRadioItem value="0.6" className="text-xs">0.6x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.7" className="text-xs">0.7x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.8" className="text-xs">0.8x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.85" className="text-xs">0.85x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.9" className="text-xs">0.9x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.95" className="text-xs">0.95x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1" className="text-xs">1.0x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.05" className="text-xs">1.05x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.1" className="text-xs">1.1x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.15" className="text-xs">1.15x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.2" className="text-xs">1.2x</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-muted/50 h-7 w-7"
                    onClick={toggleMinimize}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 1}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="h-1.5 cursor-pointer"
                  disabled={isLoading || duration === 0}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex justify-center items-center mb-4">
                <div className="flex items-center space-x-4">
                  {audioFiles.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={playPrevious}
                      disabled={currentAudioIndex <= 0 || isLoading}
                      className="rounded-full h-8 w-8 hover:bg-muted/50"
                    >
                      <SkipBack className="h-4 w-4 text-foreground" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipBackward}
                    disabled={isLoading || duration === 0}
                    className="rounded-full h-8 w-8 hover:bg-muted/50"
                  >
                    <Rewind className="h-4 w-4 text-foreground" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={isLoading && !loadError}
                    className={`rounded-full h-10 w-10 border-border/50 bg-background hover:bg-muted/50 ${loadError ? 'border-red-400' : ''}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : loadError ? (
                      <Play className="h-5 w-5 text-red-500 ml-0.5" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 text-primary" />
                    ) : (
                      <Play className="h-5 w-5 text-primary ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={skipForward}
                    disabled={isLoading || duration === 0}
                    className="rounded-full h-8 w-8 hover:bg-muted/50"
                  >
                    <FastForward className="h-4 w-4 text-foreground" />
                  </Button>

                  {audioFiles.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={playNext}
                      disabled={currentAudioIndex === -1 || currentAudioIndex >= audioFiles.length - 1 || isLoading}
                      className="rounded-full h-8 w-8 hover:bg-muted/50"
                    >
                      <SkipForward className="h-4 w-4 text-foreground" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  disabled={isLoading}
                  className="rounded-full h-7 w-7 hover:bg-muted/50"
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5 text-muted-foreground" /> : <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>

                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-1.5 flex-1 cursor-pointer"
                  disabled={isLoading}
                />

                <div className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </div>
              </div>
            </div>
          )}
        </Card>
        <audio
          ref={audioRef}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </motion.div>
    </AnimatePresence>
  );
} 