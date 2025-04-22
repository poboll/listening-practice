import type { DirectoryContent, FileContentResponse } from '@/types';

// 模拟目录结构数据
export const mockDirectoryData: Record<string, DirectoryContent> = {
  '': {
    path: '',
    items: [
      {
        name: '1月',
        path: '1月',
        isDirectory: true,
        type: 'directory'
      },
      {
        name: '2月',
        path: '2月',
        isDirectory: true,
        type: 'directory'
      }
    ]
  },
  '1月': {
    path: '1月',
    items: [
      {
        name: '0101',
        path: '1月/0101',
        isDirectory: true,
        type: 'directory'
      },
      {
        name: '0102',
        path: '1月/0102',
        isDirectory: true,
        type: 'directory'
      }
    ]
  },
  '2月': {
    path: '2月',
    items: [
      {
        name: '0201',
        path: '2月/0201',
        isDirectory: true,
        type: 'directory'
      },
      {
        name: '0202',
        path: '2月/0202',
        isDirectory: true,
        type: 'directory'
      }
    ]
  },
  '1月/0101': {
    path: '1月/0101',
    items: [
      {
        name: '1.1.pdf',
        path: '1月/0101/1.1.pdf',
        isDirectory: false,
        type: 'pdf'
      },
      {
        name: '1.1.mp3',
        path: '1月/0101/1.1.mp3',
        isDirectory: false,
        type: 'mp3'
      }
    ]
  },
  '1月/0102': {
    path: '1月/0102',
    items: [
      {
        name: '1.2.pdf',
        path: '1月/0102/1.2.pdf',
        isDirectory: false,
        type: 'pdf'
      },
      {
        name: '1.2.mp3',
        path: '1月/0102/1.2.mp3',
        isDirectory: false,
        type: 'mp3'
      }
    ]
  },
  '2月/0201': {
    path: '2月/0201',
    items: [
      {
        name: '2.1.pdf',
        path: '2月/0201/2.1.pdf',
        isDirectory: false,
        type: 'pdf'
      },
      {
        name: '2.1.mp3',
        path: '2月/0201/2.1.mp3',
        isDirectory: false,
        type: 'mp3'
      }
    ]
  },
  '2月/0202': {
    path: '2月/0202',
    items: [
      {
        name: '2.2.pdf',
        path: '2月/0202/2.2.pdf',
        isDirectory: false,
        type: 'pdf'
      },
      {
        name: '2.2.mp3',
        path: '2月/0202/2.2.mp3',
        isDirectory: false,
        type: 'mp3'
      }
    ]
  }
};

// 模拟文件内容响应
export const mockFileContent: Record<string, FileContentResponse> = {
  '1月/0101/1.1.pdf': {
    path: '1月/0101/1.1.pdf',
    type: 'pdf'
  },
  '1月/0102/1.2.pdf': {
    path: '1月/0102/1.2.pdf',
    type: 'pdf'
  },
  '2月/0201/2.1.pdf': {
    path: '2月/0201/2.1.pdf',
    type: 'pdf'
  },
  '2月/0202/2.2.pdf': {
    path: '2月/0202/2.2.pdf',
    type: 'pdf'
  },
  '1月/0101/1.1.mp3': {
    path: '1月/0101/1.1.mp3',
    type: 'mp3'
  },
  '1月/0102/1.2.mp3': {
    path: '1月/0102/1.2.mp3',
    type: 'mp3'
  },
  '2月/0201/2.1.mp3': {
    path: '2月/0201/2.1.mp3',
    type: 'mp3'
  },
  '2月/0202/2.2.mp3': {
    path: '2月/0202/2.2.mp3',
    type: 'mp3'
  }
};
