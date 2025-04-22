"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface ReadingProgress {
  filePath: string;
  fileName: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: string; // ISO日期字符串
  completionPercentage: number;
}

interface ReadingProgressContextType {
  recentReadings: ReadingProgress[];
  currentReading: ReadingProgress | null;
  updateReadingProgress: (progress: ReadingProgress) => void;
  exitReading: () => void;
  clearReadingHistory: () => void;
}

const ReadingProgressContext = createContext<ReadingProgressContextType | undefined>(undefined);

export function useReadingProgress() {
  const context = useContext(ReadingProgressContext);
  if (!context) {
    throw new Error("useReadingProgress must be used within a ReadingProgressProvider");
  }
  return context;
}

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const [recentReadings, setRecentReadings] = useState<ReadingProgress[]>([]);
  const [currentReading, setCurrentReading] = useState<ReadingProgress | null>(null);

  // 加载本地存储的阅读记录
  useEffect(() => {
    const savedReadings = localStorage.getItem('pdf-reading-progress');
    if (savedReadings) {
      try {
        const parsedReadings = JSON.parse(savedReadings) as ReadingProgress[];
        setRecentReadings(parsedReadings);
      } catch (error) {
        console.error('加载阅读进度失败:', error);
      }
    }
  }, []);

  // 更新阅读进度
  const updateReadingProgress = (progress: ReadingProgress) => {
    setCurrentReading(progress);

    // 更新最近阅读列表
    setRecentReadings(prevReadings => {
      // 移除相同文件的旧记录
      const filteredReadings = prevReadings.filter(r => r.filePath !== progress.filePath);

      // 添加新记录到最前面
      const newReadings = [progress, ...filteredReadings].slice(0, 10); // 只保留最近10条

      // 保存到localStorage
      localStorage.setItem('pdf-reading-progress', JSON.stringify(newReadings));

      return newReadings;
    });
  };

  // 退出阅读
  const exitReading = () => {
    setCurrentReading(null);
  };

  // 清除所有阅读历史
  const clearReadingHistory = () => {
    setRecentReadings([]);
    localStorage.removeItem('pdf-reading-progress');
  };

  return (
    <ReadingProgressContext.Provider
      value={{
        recentReadings,
        currentReading,
        updateReadingProgress,
        exitReading,
        clearReadingHistory,
      }}
    >
      {children}
    </ReadingProgressContext.Provider>
  );
} 