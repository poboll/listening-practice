import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getServerCwd } from "@/lib/utils";

// 设置响应体大小限制
export const config = {
  api: {
    bodyParser: false,
  },
};

// 处理文件上传请求
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadPath = formData.get("path") as string;
    const file = formData.get("file") as File;

    if (!uploadPath || !file) {
      return NextResponse.json(
        { error: "Upload path and file are required" },
        { status: 400 }
      );
    }

    // 创建文件保存路径
    const absolutePath = path.join(getServerCwd(), uploadPath);

    // 确保目录存在
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 检查文件是否已存在
    if (fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 }
      );
    }

    // 将文件内容转换为ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // 写入文件
    fs.writeFileSync(absolutePath, Buffer.from(fileBuffer));

    return NextResponse.json({
      success: true,
      path: uploadPath,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 