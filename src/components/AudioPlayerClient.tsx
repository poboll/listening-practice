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

export function AudioPlayerClient() {
  const { currentAudioFile, directoryContent } = useFileContext();
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 当选择的MP3文件变化时
  useEffect(() => {
    if (currentAudioFile && audioRef.current) {
      // 重置音频状态
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);

      // 预载音频
      audioRef.current.load();
    }
  }, [currentAudioFile]);

  // 当当前目录内容变化时，提取所有 MP3 文件
  useEffect(() => {
    if (directoryContent) {
      const mp3Files = directoryContent.items
        .filter(item => !item.isDirectory && item.type === 'mp3');
      setAudioFiles(mp3Files);

      // 如果有当前音频文件，找到它的索引
      if (currentAudioFile) {
        const index = mp3Files.findIndex(file => file.path === currentAudioFile.path);
        if (index !== -1) {
          setCurrentAudioIndex(index);
        }
      }
    }
  }, [directoryContent, currentAudioFile]);

  // 音频事件处理器
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedData = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (isPlaying) audio.play().catch(err => console.error('播放失败:', err));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration);

      // 如果有下一首，自动播放
      if (currentAudioIndex < audioFiles.length - 1) {
        playNext();
      }
    };

    const handleLoadingStart = () => {
      setIsLoading(true);
    };

    const handleError = (e: Event) => {
      console.error('音频加载错误:', e);
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('loadstart', handleLoadingStart);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('loadstart', handleLoadingStart);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [currentAudioIndex, audioFiles.length, isPlaying]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error('播放失败:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);

    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    // 前进10秒
    const newTime = Math.min(audioRef.current.currentTime + 10, duration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    // 后退10秒
    const newTime = Math.max(audioRef.current.currentTime - 10, 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const changePlaybackRate = (rate: string) => {
    if (!audioRef.current) return;
    const newRate = parseFloat(rate);
    audioRef.current.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsVolumeSliderVisible(false);
  };

  const playNext = () => {
    if (audioFiles.length === 0 || currentAudioIndex >= audioFiles.length - 1) return;
    setCurrentAudioIndex(currentAudioIndex + 1);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    if (audioFiles.length === 0 || currentAudioIndex <= 0) return;
    setCurrentAudioIndex(currentAudioIndex - 1);
    setIsPlaying(true);
  };

  // 格式化时间显示
  const formatTime = (timeInSeconds: number) => {
    if (!timeInSeconds) return "00:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // 如果没有当前音频文件且没有可用音频文件，不显示播放器
  if ((!currentAudioFile && audioFiles.length === 0) || audioFiles.length === 0) {
    return null;
  }

  // 更新音频URL和文件名
  const audioFile = currentAudioFile || audioFiles[currentAudioIndex];
  const audioUrl = audioFile ? `/content/${audioFile.path}` : '';
  const fileName = audioFile ? audioFile.name : '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card
          className={`shadow-xl border border-gray-200 dark:border-gray-800 ${isMinimized ? 'w-16 h-16 rounded-full' : 'w-80 rounded-lg'
            } transition-all duration-300 ease-in-out overflow-hidden`}
        >
          {isMinimized ? (
            <motion.div
              className="h-full flex items-center justify-center bg-black text-white rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="text-white h-full w-full rounded-full"
                onClick={toggleMinimize}
              >
                <Music className="h-6 w-6 animate-pulse" />
              </Button>
            </motion.div>
          ) : (
            <div className="p-4 bg-white dark:bg-black">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 text-black dark:text-white animate-spin" />
                    ) : isPlaying ? (
                      <Music className="h-4 w-4 text-black dark:text-white animate-bounce" />
                    ) : (
                      <Music className="h-4 w-4 text-black dark:text-white" />
                    )}
                  </div>
                  <div className="max-w-[180px] overflow-hidden">
                    <h3 className="text-sm font-medium truncate text-black dark:text-white">
                      {fileName}
                    </h3>
                    {audioFiles.length > 1 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentAudioIndex + 1} / {audioFiles.length}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-12 text-xs px-1 rounded-full border-gray-200 dark:border-gray-800"
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
                        <DropdownMenuRadioItem value="0.5" className="text-xs">0.5x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="0.75" className="text-xs">0.75x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1" className="text-xs">1.0x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.25" className="text-xs">1.25x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.5" className="text-xs">1.5x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="1.75" className="text-xs">1.75x</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="2" className="text-xs">2.0x</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 h-7 w-7"
                    onClick={toggleMinimize}
                  >
                    <X className="h-4 w-4 text-black dark:text-white" />
                  </Button>
                </div>
              </div>

              <div className="mb-3">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="h-1.5"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* 主要控制区域 */}
              <div className="flex justify-center items-center mb-4">
                <div className="flex items-center space-x-4">
                  {audioFiles.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={playPrevious}
                      disabled={currentAudioIndex <= 0 || isLoading}
                      className="rounded-full h-8 w-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <SkipBack className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={skipBackward}
                    disabled={isLoading}
                    className="rounded-full h-8 w-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Rewind className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className="rounded-full h-10 w-10 border-gray-300 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-black hover:from-white hover:to-gray-50 dark:hover:from-black dark:hover:to-gray-900"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 text-gray-800 dark:text-gray-200 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-5 w-5 text-gray-800 dark:text-gray-200" />
                    ) : (
                      <Play className="h-5 w-5 text-gray-800 dark:text-gray-200 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={skipForward}
                    disabled={isLoading}
                    className="rounded-full h-8 w-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FastForward className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  </Button>

                  {audioFiles.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={playNext}
                      disabled={currentAudioIndex >= audioFiles.length - 1 || isLoading}
                      className="rounded-full h-8 w-8 border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <SkipForward className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                  disabled={isLoading}
                  className="rounded-full h-7 w-7 border-gray-200 dark:border-gray-800"
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" /> : <Volume2 className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />}
                </Button>

                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="h-1.5 flex-1"
                  disabled={isLoading}
                />

                <div className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </div>
              </div>
            </div>
          )}
        </Card>
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </motion.div>
    </AnimatePresence>
  );
} 