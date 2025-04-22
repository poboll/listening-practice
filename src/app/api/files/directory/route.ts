import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs-extra';
import type { DirectoryContent, FileItem } from '@/types';

// 设置API路由为动态路由，解决静态导出问题
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const directoryPath = searchParams.get('path') || '';

    // 构建完整的目录路径
    const fullPath = path.join(process.cwd(), 'public', 'content', directoryPath);

    // 检查目录是否存在
    if (!await fs.pathExists(fullPath)) {
      return NextResponse.json(
        { error: '目录不存在' },
        { status: 404 }
      );
    }

    // 读取目录内容
    const items = await fs.readdir(fullPath);

    // 过滤隐藏文件
    const filteredItems = items.filter(item => !item.startsWith('.') && item !== '.DS_Store');

    // 处理每个文件/目录的信息
    const dirContent: DirectoryContent = {
      path: directoryPath,
      items: await Promise.all(
        filteredItems.map(async (item) => {
          const itemPath = path.join(fullPath, item);
          const stats = await fs.stat(itemPath);
          const isDirectory = stats.isDirectory();

          // 构建相对路径
          const relativePath = directoryPath
            ? path.join(directoryPath, item)
            : item;

          // 获取文件类型
          let type = 'unknown';
          if (isDirectory) {
            type = 'directory';
          } else {
            const ext = path.extname(item).toLowerCase();
            if (ext === '.pdf') type = 'pdf';
            else if (ext === '.mp3') type = 'mp3';
          }

          const fileItem: FileItem = {
            name: item,
            path: relativePath,
            isDirectory,
            type
          };

          return fileItem;
        })
      )
    };

    return NextResponse.json(dirContent);
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json(
      { error: '无法读取目录内容' },
      { status: 500 }
    );
  }
} 