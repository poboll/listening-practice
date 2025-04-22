"use client";

import { useFileContext } from '@/contexts/FileContext';
import { useState } from 'react';

export default function DebugPage() {
  const fileContext = useFileContext();
  const [refreshCount, setRefreshCount] = useState(0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">FileContext调试页面</h1>

      <div className="flex mb-6 gap-2">
        <button
          onClick={() => setRefreshCount(prev => prev + 1)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          刷新 ({refreshCount})
        </button>

        <button
          onClick={() => fileContext.navigateToDirectory('')}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          重新加载根目录
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">基本状态</h2>
          <div className="bg-gray-100 p-4 rounded mb-6">
            <div className="mb-2">
              <span className="font-medium">当前目录: </span>
              <span className="font-mono">{fileContext.currentDirectory || '/'}</span>
            </div>
            <div className="mb-2">
              <span className="font-medium">加载状态: </span>
              <span className={`${fileContext.loading ? 'text-yellow-600' : 'text-green-600'}`}>
                {fileContext.loading ? '加载中...' : '已加载'}
              </span>
            </div>
            <div className="mb-2">
              <span className="font-medium">错误状态: </span>
              <span className={`${fileContext.error ? 'text-red-600' : 'text-green-600'}`}>
                {fileContext.error || '无错误'}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-2">面包屑</h2>
          <div className="bg-gray-100 p-4 rounded mb-6">
            {fileContext.breadcrumbs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fileContext.breadcrumbs.map((crumb, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 rounded">
                    {crumb || '根目录'}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">无面包屑</p>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-2">选中文件</h2>
          <div className="bg-gray-100 p-4 rounded mb-6">
            {fileContext.selectedFile ? (
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(fileContext.selectedFile, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">未选中文件</p>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-2">选中PDF</h2>
          <div className="bg-gray-100 p-4 rounded mb-6">
            {fileContext.selectedPdfFile ? (
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(fileContext.selectedPdfFile, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">未选中PDF</p>
            )}
          </div>

          <h2 className="text-xl font-semibold mb-2">当前音频</h2>
          <div className="bg-gray-100 p-4 rounded">
            {fileContext.currentAudioFile ? (
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(fileContext.currentAudioFile, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">未选中音频</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">目录内容</h2>
          <div className="bg-gray-100 p-4 rounded">
            {fileContext.directoryContent ? (
              <div>
                <div className="mb-4">
                  <span className="font-medium">路径: </span>
                  <span className="font-mono">{fileContext.directoryContent.path || '/'}</span>
                </div>
                <div className="mb-4">
                  <span className="font-medium">项目数: </span>
                  <span>{fileContext.directoryContent.items?.length || 0}</span>
                </div>
                <h3 className="font-medium mb-2">项目列表:</h3>
                <div className="max-h-[600px] overflow-auto">
                  {fileContext.directoryContent.items?.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-200">
                        <tr>
                          <th className="text-left p-2">名称</th>
                          <th className="text-left p-2">路径</th>
                          <th className="text-left p-2">类型</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileContext.directoryContent.items.map((item, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2 font-mono text-xs">{item.path}</td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${item.isDirectory
                                ? 'bg-blue-100 text-blue-800'
                                : item.type === 'pdf'
                                  ? 'bg-red-100 text-red-800'
                                  : item.type === 'mp3'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {item.isDirectory ? '目录' : item.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500">目录为空</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">无目录内容</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 