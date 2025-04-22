"use client";

import { useState, useEffect } from 'react';

/**
 * 响应式媒体查询Hook
 * @param query 媒体查询字符串，如 '(max-width: 768px)'
 * @returns 布尔值，表示媒体查询是否匹配
 */
export function useMediaQuery(query: string): boolean {
  // 默认假设不匹配，服务器端渲染时不会有window对象
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // 检查window和matchMedia是否存在（客户端）
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return;
    }

    // 创建媒体查询列表
    const mediaQuery = window.matchMedia(query);

    // 初始设置
    setMatches(mediaQuery.matches);

    // 创建事件监听器
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 添加监听器
    try {
      // 现代浏览器
      mediaQuery.addEventListener('change', listener);
    } catch (e) {
      // 旧版浏览器 (Safari < 14, IE)
      mediaQuery.addListener(listener);
    }

    // 清理函数
    return () => {
      try {
        // 现代浏览器
        mediaQuery.removeEventListener('change', listener);
      } catch (e) {
        // 旧版浏览器
        mediaQuery.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
} 