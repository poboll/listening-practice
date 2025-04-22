import { useState, useCallback } from 'react';

// PDF缓存钩子，使用IndexedDB存储PDF文件
export function usePdfCache() {
  const [isReady, setIsReady] = useState<boolean>(false);

  // 打开数据库连接
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('pdf-cache-db', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // 如果对象仓库不存在，创建它
        if (!db.objectStoreNames.contains('pdf-files')) {
          db.createObjectStore('pdf-files');
        }
      };

      request.onsuccess = (event) => {
        setIsReady(true);
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('打开数据库失败:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }, []);

  // 检查缓存是否存在
  const cacheExists = useCallback(async (key: string): Promise<boolean> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readonly');
        const store = transaction.objectStore('pdf-files');
        const request = store.getKey(key);

        request.onsuccess = () => {
          resolve(!!request.result);
        };

        request.onerror = (event) => {
          console.error('检查缓存失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('检查缓存出错:', error);
      return false;
    }
  }, [openDB]);

  // 将PDF保存到缓存
  const saveToCache = useCallback(async (key: string, data: ArrayBuffer): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readwrite');
        const store = transaction.objectStore('pdf-files');
        const request = store.put(data, key);

        request.onsuccess = () => {
          console.log(`PDF已缓存: ${key}`);
          resolve();
        };

        request.onerror = (event) => {
          console.error('保存到缓存失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('保存到缓存出错:', error);
      throw error;
    }
  }, [openDB]);

  // 从缓存获取PDF
  const getFromCache = useCallback(async (key: string): Promise<ArrayBuffer | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readonly');
        const store = transaction.objectStore('pdf-files');
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            console.log(`从缓存获取PDF: ${key}`);
            resolve(request.result);
          } else {
            console.log(`缓存中不存在: ${key}`);
            resolve(null);
          }
        };

        request.onerror = (event) => {
          console.error('从缓存获取失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('从缓存获取出错:', error);
      return null;
    }
  }, [openDB]);

  // 从缓存中删除PDF
  const clearCache = useCallback(async (key: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readwrite');
        const store = transaction.objectStore('pdf-files');
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log(`从缓存删除PDF: ${key}`);
          resolve();
        };

        request.onerror = (event) => {
          console.error('从缓存删除失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('从缓存删除出错:', error);
      throw error;
    }
  }, [openDB]);

  // 清除所有缓存
  const clearAllCache = useCallback(async (): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readwrite');
        const store = transaction.objectStore('pdf-files');
        const request = store.clear();

        request.onsuccess = () => {
          console.log('已清除所有PDF缓存');
          resolve();
        };

        request.onerror = (event) => {
          console.error('清除所有缓存失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('清除所有缓存出错:', error);
      throw error;
    }
  }, [openDB]);

  // 获取所有缓存的键
  const getAllCacheKeys = useCallback(async (): Promise<string[]> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pdf-files'], 'readonly');
        const store = transaction.objectStore('pdf-files');
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result as string[]);
        };

        request.onerror = (event) => {
          console.error('获取所有键失败:', (event.target as IDBRequest).error);
          reject((event.target as IDBRequest).error);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (error) {
      console.error('获取所有键出错:', error);
      return [];
    }
  }, [openDB]);

  // 获取缓存统计信息
  const getCacheStats = useCallback(async (): Promise<{ count: number, totalSize: number }> => {
    try {
      const keys = await getAllCacheKeys();
      let totalSize = 0;

      if (keys.length > 0) {
        const db = await openDB();

        // 串行获取每个缓存项的大小
        for (const key of keys) {
          const data = await new Promise<ArrayBuffer | null>((resolve, reject) => {
            const transaction = db.transaction(['pdf-files'], 'readonly');
            const store = transaction.objectStore('pdf-files');
            const request = store.get(key);

            request.onsuccess = () => {
              resolve(request.result);
            };

            request.onerror = () => {
              resolve(null);
            };
          });

          if (data) {
            totalSize += data.byteLength;
          }
        }

        db.close();
      }

      return {
        count: keys.length,
        totalSize
      };
    } catch (error) {
      console.error('获取缓存统计信息出错:', error);
      return { count: 0, totalSize: 0 };
    }
  }, [openDB, getAllCacheKeys]);

  return {
    isReady,
    cacheExists,
    saveToCache,
    getFromCache,
    clearCache,
    clearAllCache,
    getAllCacheKeys,
    getCacheStats
  };
} 