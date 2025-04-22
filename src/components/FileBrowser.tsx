"use client";

import { useState, useEffect } from 'react';
import { useFileContext, FileItem } from '@/contexts/FileContext';
import { File, Folder, BookOpen, Music } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { motion } from 'framer-motion';

// 自定义文件信息接口，用于组件内部使用
interface FileInfo {
  name: string;
  path: string;
  ext: string;
}

// API返回的数据格式
interface ApiFileItem {
  name: string;
  path: string;
  type: string;
  extension?: string;
}

export function FileBrowser() {
  const { setSelectedFile, currentDirectory, setCurrentDirectory, goBack } = useFileContext();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles(currentDirectory);
  }, [currentDirectory]);

  const fetchFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);

      // 构造API请求路径
      const apiPath = path ? `public/content/${path}` : 'public/content';
      console.log(`请求路径: ${apiPath}`);
      const response = await fetch(`/api/files?path=${encodeURIComponent(apiPath)}`);

      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }

      const data = await response.json();
      console.log('API返回数据:', data);
      const fileItems = Array.isArray(data) ? data : [];

      const formattedFiles = fileItems.map((item: ApiFileItem) => ({
        name: item.name,
        path: path ? `${path}/${item.name}` : item.name,
        ext: item.type === 'directory' ? 'directory' : (item.extension || ''),
      }));

      setFiles(formattedFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      console.error('Error fetching files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileInfo) => {
    const fileItem: FileItem = {
      name: file.name,
      path: file.path,
      type: file.ext === 'directory' ? 'directory' : 'file',
      extension: file.ext !== 'directory' ? file.ext : undefined
    };

    if (file.ext !== 'directory') {
      setSelectedFile(fileItem);
    } else {
      setCurrentDirectory(file.path);
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case 'pdf':
        return <BookOpen className="text-blue-500" />;
      case 'mp3':
        return <Music className="text-green-500" />;
      default:
        return <File className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        <p>错误: {error}</p>
        <button
          onClick={() => fetchFiles(currentDirectory)}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">文件浏览器</h2>
          {currentDirectory && (
            <button
              onClick={goBack}
              className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded"
            >
              返回上级
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate mt-1">
          {currentDirectory ? `/${currentDirectory}` : '根目录'}
        </p>
      </div>

      <div className="p-2">
        {loading && files.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">
            <p>错误: {error}</p>
            <button
              onClick={() => fetchFiles(currentDirectory)}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              重试
            </button>
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-gray-500 py-8">此目录为空</p>
        ) : (
          <ul className="space-y-1">
            {files.map((file, index) => (
              <motion.li
                key={file.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => handleFileClick(file)}
                className={`p-2 rounded-lg cursor-pointer flex items-center space-x-2
                  ${file.ext === 'pdf' || file.ext === 'mp3'
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span className="text-lg">
                  {file.ext === 'directory'
                    ? <Folder className="text-yellow-500" />
                    : getFileIcon(file.ext)
                  }
                </span>
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-gray-500">
                  {file.ext !== 'directory' && file.ext.toUpperCase()}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 