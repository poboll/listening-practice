import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 忽略隐藏文件（以.开头的文件）和macOS的.DS_Store文件
 */
export function shouldIgnoreFile(filename: string): boolean {
  return filename.startsWith('.') || filename === '.DS_Store';
}

/**
 * 过滤文件列表，忽略隐藏文件
 */
export function filterHiddenFiles<T extends { name: string }>(files: T[]): T[] {
  return files.filter(file => !shouldIgnoreFile(file.name));
}

/**
 * 获取服务器端的当前工作目录
 */
export function getServerCwd(): string {
  return process.cwd();
}
