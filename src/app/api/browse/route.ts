import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerCwd } from "@/lib/utils";

// 获取目录内容的API
export async function GET(request: NextRequest) {
  try {
    // 从查询字符串中获取目录路径，默认为根目录
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get('path') || '';

    // 创建绝对路径
    const absolutePath = path.join(getServerCwd(), dirPath);

    // 检查目录是否存在
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "目录不存在" },
        { status: 404 }
      );
    }

    // 检查路径是否为目录
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "指定路径不是目录" },
        { status: 400 }
      );
    }

    // 读取目录内容
    const items = fs.readdirSync(absolutePath);

    // 获取每个项目的详细信息
    const contents = items.map(item => {
      const itemPath = path.join(absolutePath, item);
      const itemStats = fs.statSync(itemPath);
      const isDirectory = itemStats.isDirectory();

      return {
        name: item,
        path: path.join(dirPath, item).replace(/\\/g, '/'),
        isDirectory,
        size: isDirectory ? null : itemStats.size,
        lastModified: itemStats.mtime
      };
    });

    // 将内容按目录和文件分类，目录在前
    contents.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      path: dirPath,
      contents
    });
  } catch (error) {
    console.error("获取目录内容时出错:", error);
    return NextResponse.json(
      { error: "获取目录内容失败" },
      { status: 500 }
    );
  }
} 