"use client";

import { AudioPlayerClient } from './AudioPlayerClient';

// 重定向到统一的AudioPlayerClient，防止出现重复播放器
export function AudioPlayer() {
  return <AudioPlayerClient />;
}
