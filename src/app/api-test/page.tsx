"use client";

import { useState, useEffect } from 'react';

export default function ApiTestPage() {
  const [apiPath, setApiPath] = useState('public/content');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApi = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(apiPath)}`);
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`);
      }
      const data = await response.json();
      setApiResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApi();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API测试页面</h1>

      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={apiPath}
            onChange={(e) => setApiPath(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
            placeholder="输入API路径，例如：public/content"
          />
          <button
            onClick={fetchApi}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? '加载中...' : '发送请求'}
          </button>
        </div>

        <p className="text-sm text-gray-600">当前请求：/api/files?path={apiPath}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">响应数据</h2>
        {loading ? (
          <div className="text-center py-8">加载中...</div>
        ) : apiResponse ? (
          <pre className="whitespace-pre-wrap bg-white p-4 rounded text-sm overflow-auto max-h-[60vh]">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        ) : (
          <div className="text-center py-8 text-gray-500">暂无数据</div>
        )}
      </div>
    </div>
  );
} 