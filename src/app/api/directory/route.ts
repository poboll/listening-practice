import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerCwd } from "@/lib/utils";

// 创建新目录
export async function POST(request: NextRequest) {
  try {
    const { path: dirPath, name } = await request.json();

    if (!dirPath || !name) {
      return NextResponse.json(
        { error: "Directory path and name are required" },
        { status: 400 }
      );
    }

    const absolutePath = path.join(getServerCwd(), dirPath, name);

    // 检查路径是否已存在
    if (fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "Directory already exists" },
        { status: 409 }
      );
    }

    // 创建目录
    fs.mkdirSync(absolutePath, { recursive: true });

    return NextResponse.json({
      success: true,
      path: path.join(dirPath, name)
    });
  } catch (error) {
    console.error("Error creating directory:", error);
    return NextResponse.json(
      { error: "Failed to create directory" },
      { status: 500 }
    );
  }
} 