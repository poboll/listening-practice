import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";

// 设置API路由为动态路由，解决静态导出问题
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get("path") || "";

    // 调试日志
    console.log(`API路由: 请求路径: ${dirPath}`);

    // 构建绝对路径
    const absolutePath = path.resolve(process.cwd(), dirPath);
    console.log(`API路由: 绝对路径: ${absolutePath}`);

    // 检查路径是否存在
    if (!await fs.pathExists(absolutePath)) {
      console.error(`API路由: 路径不存在: ${absolutePath}`);
      return NextResponse.json(
        { error: "Path does not exist" },
        { status: 404 }
      );
    }

    // 检查是否是目录
    const stats = await fs.stat(absolutePath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory" },
        { status: 400 }
      );
    }

    // 读取目录内容
    const items = await fs.readdir(absolutePath);
    console.log(`API路由: 目录内容: ${items.join(', ')}`);

    // 构造文件项数组
    const fileItems = await Promise.all(items.map(async item => {
      // 跳过隐藏文件和.DS_Store
      if (item.startsWith('.') || item === '.DS_Store') {
        return null;
      }

      const itemPath = path.join(absolutePath, item);
      const stats = await fs.stat(itemPath);
      const isDirectory = stats.isDirectory();

      // 保持与请求路径一致的相对路径
      let relativePath;
      if (dirPath) {
        relativePath = path.join(dirPath, item);
      } else {
        relativePath = item;
      }

      // 在Windows上转换路径分隔符
      relativePath = relativePath.replace(/\\/g, '/');

      // 确定文件类型
      let type = isDirectory ? "directory" : "file";
      let extension = "";

      if (!isDirectory) {
        extension = path.extname(item).substring(1).toLowerCase();
        if (extension === 'pdf' || extension === 'mp3') {
          type = extension;
        }
      }

      return {
        name: item,
        path: relativePath,
        type: type,
        extension: isDirectory ? undefined : extension
      };
    }));

    // 过滤掉null项（隐藏文件）
    const filteredItems = fileItems.filter(Boolean);

    // 首先显示目录，然后按名称排序
    filteredItems.sort((a, b) => {
      // TypeScript断言非空
      if (a!.type === "directory" && b!.type !== "directory") return -1;
      if (a!.type !== "directory" && b!.type === "directory") return 1;
      return a!.name.localeCompare(b!.name);
    });

    console.log(`API路由: 返回${filteredItems.length}个项目`);
    return NextResponse.json(filteredItems);
  } catch (error: any) {
    console.error("API路由: Error listing directory:", error);
    return NextResponse.json(
      { error: `Failed to list directory: ${error.message || String(error)}` },
      { status: 500 }
    );
  }
}

// 删除文件或目录
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path") || "";

    const absolutePath = path.join(process.cwd(), filePath);

    // 检查路径是否存在
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "Path does not exist" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      // 递归删除目录
      fs.rmdirSync(absolutePath, { recursive: true });
    } else {
      // 删除文件
      fs.unlinkSync(absolutePath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file/directory:", error);
    return NextResponse.json(
      { error: "Failed to delete file/directory" },
      { status: 500 }
    );
  }
} 