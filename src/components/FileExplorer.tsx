"use client";

import { useEffect, useState } from 'react';
import { useFileContext } from '@/contexts/FileContext';
import type { FileItem } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, FileText, Music, ChevronRight, Home, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FileExplorer() {
  const {
    currentDirectory,
    directoryContent,
    breadcrumbs,
    loading,
    error,
    navigateToDirectory,
    selectFile,
    playAudio
  } = useFileContext();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<FileItem[]>([]);

  useEffect(() => {
    // 组件加载时，如果当前目录为空，则导航到根目录
    if (currentDirectory === '' && !directoryContent) {
      console.log('FileExplorer: 初始加载，导航到根目录');
      navigateToDirectory('');
    } else {
      console.log(`FileExplorer: 当前目录=${currentDirectory}, 有目录内容=${!!directoryContent}`);
    }
  }, [currentDirectory, directoryContent, navigateToDirectory]);

  useEffect(() => {
    // 过滤文件列表
    console.log('FileExplorer: 开始过滤文件', {
      hasDirectoryContent: !!directoryContent,
      itemsCount: directoryContent?.items?.length || 0,
      searchQuery
    });

    if (directoryContent?.items) {
      if (searchQuery.trim() === '') {
        console.log(`FileExplorer: 设置过滤项 - 全部${directoryContent.items.length}个文件`);
        setFilteredItems(directoryContent.items);
      } else {
        const query = searchQuery.toLowerCase();
        const filtered = directoryContent.items.filter(item =>
          item.name.toLowerCase().includes(query)
        );
        console.log(`FileExplorer: 设置过滤项 - 从${directoryContent.items.length}个文件中过滤出${filtered.length}个文件`);
        setFilteredItems(filtered);
      }
    } else {
      console.log('FileExplorer: 没有目录内容可以过滤');
    }
  }, [directoryContent, searchQuery]);

  const handleFileClick = (file: FileItem) => {
    console.log('FileExplorer: 文件点击事件', file);

    const itemElem = document.getElementById(`file-item-${file.path.replace(/\//g, '-')}`);
    if (itemElem) {
      // 添加点击反馈动画
      itemElem.classList.add('scale-95', 'bg-primary/10');
      setTimeout(() => {
        itemElem.classList.remove('scale-95', 'bg-primary/10');
      }, 200);
    }

    // 从路径中去掉public/content/前缀
    let cleanPath = file.path;
    if (cleanPath.startsWith('public/content/')) {
      cleanPath = cleanPath.replace('public/content/', '');
    }

    console.log('FileExplorer: 处理后的文件路径', cleanPath);

    if (file.isDirectory) {
      console.log('FileExplorer: 点击了目录，正在导航...');
      selectFile(file);
    } else if (file.type === 'pdf') {
      console.log('FileExplorer: 点击了PDF文件，正在选择...');
      selectFile(file);
    } else if (file.type === 'mp3') {
      console.log('FileExplorer: 点击了MP3文件，正在播放...');
      playAudio(file);
    } else {
      console.log('FileExplorer: 未知文件类型', file.type);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.isDirectory) {
      return (
        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Folder className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        </div>
      );
    }
    if (file.type === 'pdf') {
      return (
        <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
        </div>
      );
    }
    if (file.type === 'mp3') {
      return (
        <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Music className="h-5 w-5 text-green-500 dark:text-green-400" />
        </div>
      );
    }
    return null;
  };

  if (loading && !directoryContent) {
    return (
      <Card className="p-4 h-full border-none shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
          <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">加载中...</div>
        </div>
      </Card>
    );
  }

  if (error && !directoryContent) {
    return (
      <Card className="p-4 h-full border-none shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="w-16 h-16 flex items-center justify-center text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="text-red-500 text-center">
            <div className="font-semibold mb-1">出错了</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full border-none shadow-md bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
      {/* 面包屑导航 */}
      <div className="flex items-center space-x-1 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-blue-100/50 dark:bg-blue-900/20 h-8 w-8"
            onClick={() => navigateToDirectory('')}
            title="返回主目录"
          >
            <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </Button>
        </motion.div>

        <div className="flex items-center space-x-1">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <Button
                variant="ghost"
                size="sm"
                className="px-2 py-1 h-auto text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  // 构建到这个面包屑的路径
                  const path = breadcrumbs.slice(0, index + 1).join('/');
                  navigateToDirectory(path);
                }}
              >
                {crumb}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="搜索文件..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <AnimatePresence mode="wait">
          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              {searchQuery ? '没有找到匹配的文件' : (
                loading ? '加载中...' : (
                  error ? `加载出错: ${error}` : '此文件夹为空'
                )
              )}
              <p className="text-xs text-gray-400 mt-1">
                {directoryContent ? `当前路径: ${directoryContent.path || '/'}, 项目数: ${directoryContent.items?.length || 0}` : '无目录数据'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredItems.map((item) => (
                <motion.div
                  id={`file-item-${item.path.replace(/\//g, '-')}`}
                  key={item.path}
                  className="flex items-center p-2.5 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleFileClick(item)}
                  whileHover={{
                    backgroundColor: 'rgba(var(--primary-rgb), 0.1)',
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mr-3">{getFileIcon(item)}</div>
                  <div className="flex-1">
                    <div className="font-medium truncate text-gray-700 dark:text-gray-200">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.isDirectory ? '文件夹' : item.type.toUpperCase()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </Card>
  );
}
