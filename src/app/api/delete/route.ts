import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerCwd } from "@/lib/utils";

// 处理文件删除请求
export async function DELETE(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "文件路径不能为空" },
        { status: 400 }
      );
    }

    // 创建绝对路径
    const absolutePath = path.join(getServerCwd(), filePath);

    // 检查文件是否存在
    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "文件不存在" },
        { status: 404 }
      );
    }

    // 检查是文件还是目录
    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      // 删除目录（包括所有内容）
      fs.rmSync(absolutePath, { recursive: true, force: true });
    } else {
      // 删除文件
      fs.unlinkSync(absolutePath);
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      type: stats.isDirectory() ? "directory" : "file"
    });
  } catch (error) {
    console.error("删除文件时出错:", error);
    return NextResponse.json(
      { error: "删除文件失败" },
      { status: 500 }
    );
  }
} 