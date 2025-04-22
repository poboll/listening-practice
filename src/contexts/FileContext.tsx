"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import type { DirectoryContent, FileItem, FileContentResponse } from "@/types";
import { useRouter } from "next/navigation";

interface FileContextType {
  selectedFile: FileItem | null;
  setSelectedFile: (file: FileItem | null) => void;
  selectedPdfFile: FileItem | null;
  currentAudioFile: FileItem | null;
  currentDirectory: string;
  setCurrentDirectory: (path: string) => void;
  directoryContent: DirectoryContent | null;
  loading: boolean;
  error: string | null;
  history: string[];
  breadcrumbs: string[];
  addToHistory: (path: string) => void;
  goBack: () => void;
  clearHistory: () => void;
  navigateToDirectory: (path: string) => void;
  selectFile: (file: FileItem) => void;
  playAudio: (file: FileItem) => void;
  audioPlaying: boolean;
  fetchDirectoryContent: (path: string) => Promise<void>;
  selectPdfAndView: (file: FileItem) => void;
  stopAudio: () => void;
  clearAudio: () => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function useFileContext() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error("useFileContext must be used within a FileProvider");
  }
  return context;
}

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedPdfFile, setSelectedPdfFile] = useState<FileItem | null>(null);
  const [currentAudioFile, setCurrentAudioFile] = useState<FileItem | null>(null);
  const [currentDirectory, setCurrentDirectory] = useState<string>(''); // Default to empty string
  const [directoryContent, setDirectoryContent] = useState<DirectoryContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(['']); // Start history with root path
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const router = useRouter();

  // 初始加载
  useEffect(() => {
    console.log('FileContext: 组件挂载，加载根目录内容');
    fetchDirectoryContent('');
  }, []);

  // 计算面包屑
  useEffect(() => {
    if (currentDirectory === '') {
      setBreadcrumbs([]);
    } else {
      const parts = currentDirectory.split('/');
      setBreadcrumbs(parts);
    }
  }, [currentDirectory]);

  // 包装 setCurrentDirectory 以自动处理历史记录
  const navigateToDirectory = (path: string) => {
    console.log(`FileContext: 导航到目录 ${path}`);
    // 只有当路径改变时才更新
    if (path !== currentDirectory) {
      setCurrentDirectory(path);
      // 将新路径添加到历史记录
      setHistory((prev) => [...prev, path]);
      // 加载目录内容
      fetchDirectoryContent(path);
    } else {
      console.log(`FileContext: 已经在目录 ${path}，跳过导航`);
    }
  };

  // 加载目录内容
  const fetchDirectoryContent = async (path: string) => {
    console.log(`FileContext: 开始加载目录内容，路径=${path}`);
    setLoading(true);
    setError(null);
    try {
      // 构造API请求路径
      const apiPath = path ? `public/content/${path}` : 'public/content';
      console.log(`FileContext: 请求目录内容: ${apiPath}`);
      const response = await fetch(`/api/files?path=${encodeURIComponent(apiPath)}`);

      if (!response.ok) {
        throw new Error(`加载目录失败: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('FileContext: API返回数据:', data);

      // 将返回的数据转换为DirectoryContent格式
      if (Array.isArray(data)) {
        console.log(`FileContext: 收到数组数据，包含${data.length}个项目`);
        const items = data.map(item => ({
          name: item.name,
          path: item.path.replace('public/content/', ''), // 移除前缀路径
          isDirectory: item.type === 'directory',
          type: item.type
        }));

        const directoryContentData = {
          path: path,
          items: items
        };
        console.log('FileContext: 转换后的目录内容:', directoryContentData);
        setDirectoryContent(directoryContentData);
      } else {
        // 如果已经是DirectoryContent格式就直接使用
        console.log('FileContext: 收到对象数据，直接设置');
        setDirectoryContent(data);
      }
    } catch (err) {
      console.error("FileContext: 加载目录失败:", err);
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  // 选择文件
  const selectFile = (file: FileItem) => {
    setSelectedFile(file);
    if (file.isDirectory) {
      navigateToDirectory(file.path);
    } else if (file.type === 'pdf') {
      setSelectedPdfFile(file);
    }
  };

  // 选择PDF文件并导航到PDF查看器
  const selectPdfAndView = useCallback((file: FileItem) => {
    setSelectedPdfFile(file);
    console.log("选择PDF文件:", file.name);

    // 当选择新的PDF文件时，尝试查找相关音频
    if (directoryContent) {
      const pdfPath = file.path;
      const pdfDir = pdfPath.substring(0, pdfPath.lastIndexOf('/'));
      const pdfBaseName = pdfPath.substring(pdfPath.lastIndexOf('/') + 1).replace('.pdf', '');

      // 查找同目录下的MP3文件，或者名称相似的MP3文件
      const relatedAudioFiles = directoryContent.items.filter(item => {
        if (item.isDirectory || item.type !== 'mp3') return false;

        const itemDir = item.path.substring(0, item.path.lastIndexOf('/'));
        const itemBaseName = item.path.substring(item.path.lastIndexOf('/') + 1).replace('.mp3', '');

        // 优先选择名称相似的文件
        return (itemDir === pdfDir && (
          itemBaseName.includes(pdfBaseName) ||
          pdfBaseName.includes(itemBaseName)));
      });

      // 如果找到相关音频文件，设置第一个为当前音频
      if (relatedAudioFiles.length > 0) {
        console.log("发现相关音频:", relatedAudioFiles[0].name);
        setCurrentAudioFile(relatedAudioFiles[0]);
      }
    }

    // 导航到PDF查看器
    router.push('/pdf-viewer');
  }, [directoryContent, router]);

  // 播放音频文件
  const playAudio = useCallback((file: FileItem) => {
    setCurrentAudioFile(file);
    setAudioPlaying(true);
    console.log("播放音频:", file.name);
  }, []);

  // 停止音频播放
  const stopAudio = useCallback(() => {
    setAudioPlaying(false);
  }, []);

  // 清除当前音频
  const clearAudio = useCallback(() => {
    setCurrentAudioFile(null);
    setAudioPlaying(false);
  }, []);

  const goBack = () => {
    if (history.length > 1) { // 确保历史记录中至少有两项（当前和前一个）
      const newHistory = [...history];
      newHistory.pop(); // 移除当前路径
      const previousPath = newHistory[newHistory.length - 1]; // 获取上一个路径
      setHistory(newHistory);
      setCurrentDirectory(previousPath);
      // 重新加载该目录内容
      fetchDirectoryContent(previousPath);
    }
  };

  const clearHistory = () => {
    setHistory(['']); // 重置历史记录到根目录
    setCurrentDirectory(''); // 重置当前目录到根目录
    fetchDirectoryContent(''); // 加载根目录内容
  };

  // 提供上下文值
  const contextValue = {
    directoryContent,
    selectedFile,
    selectedPdfFile,
    currentAudioFile,
    audioPlaying,
    loading,
    error,
    fetchDirectoryContent,
    setSelectedFile,
    selectPdfAndView,
    playAudio,
    stopAudio,
    clearAudio,
    currentDirectory,
    setCurrentDirectory: navigateToDirectory, // 使用包装后的函数
    history,
    breadcrumbs,
    addToHistory: navigateToDirectory, // 也可用于直接添加历史
    goBack,
    clearHistory,
    navigateToDirectory,
    selectFile,
  };

  return (
    <FileContext.Provider value={contextValue}>
      {children}
    </FileContext.Provider>
  );
}
