"use client";

import Link from "next/link";
import { ArrowLeft, Github } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Link>
      </div>

      <div className="prose prose-lg max-w-none dark:prose-invert">
        <h1 className="text-3xl font-bold mb-6">关于英语精听练习平台</h1>

        <div className="flex items-center mb-6">
          <Link
            href="https://github.com/poboll/listening-practice"
            target="_blank"
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Github className="mr-2 h-5 w-5" />
            GitHub 仓库
          </Link>
        </div>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">项目简介</h2>
          <p>
            英语精听练习平台是一个现代化的英语学习应用，专为提升听力理解能力和阅读效率而设计。
            采用优雅的亚克力风格UI，提供沉浸式学习体验。本平台结合了PDF阅读与音频播放功能，
            帮助学习者更有效地提高英语听力和阅读能力。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">核心特性</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-xl font-medium mb-3">📑 高级PDF阅读体验</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>多种标注工具：荧光笔（黄色/蓝色/粉色）、铅笔、钢笔</li>
                <li>夜间模式：减轻长时间阅读的眼部疲劳</li>
                <li>阅读进度记忆：自动保存并恢复上次阅读位置</li>
                <li>高效缩放与旋转：灵活调整文档视图</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-xl font-medium mb-3">🎧 智能音频播放</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>倍速控制：0.5x 到 2.0x 多级播放速度</li>
                <li>快进快退：精确控制播放进度</li>
                <li>自动关联：智能匹配PDF文档相关音频</li>
                <li>迷你播放器：悬浮式设计，不影响阅读体验</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-xl font-medium mb-3">📁 便捷文件管理</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>层级浏览：直观展示文件夹结构</li>
                <li>文件搜索：快速定位目标文件</li>
                <li>智能排序：按名称、日期、类型组织文件</li>
                <li>阅读进度追踪：可视化学习记录</li>
              </ul>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg">
              <h3 className="text-xl font-medium mb-3">📱 响应式设计</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>跨设备兼容：桌面、平板、手机全面适配</li>
                <li>触控优化：为iPad和触屏设备特别优化</li>
                <li>性能调优：移动设备上高效渲染</li>
                <li>离线支持：无需持续联网也能使用</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">技术栈</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Next.js</strong> - React框架，提供SSR/SSG支持</li>
            <li><strong>React</strong> - 用户界面库</li>
            <li><strong>Tailwind CSS</strong> - 实用程序优先的CSS框架</li>
            <li><strong>Framer Motion</strong> - 强大的React动画库</li>
            <li><strong>shadcn/ui</strong> - 基于Radix UI的组件库</li>
            <li><strong>react-pdf</strong> - PDF查看和操作</li>
            <li><strong>pdfjs-dist</strong> - PDF.js核心库</li>
            <li><strong>HTML5 Audio API</strong> - 音频播放和控制</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">如何使用</h2>
          <p>
            将你的PDF和MP3文件放入 <code>public/content</code> 目录，系统会自动检测并显示。
            为获得最佳效果，建议：
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>PDF文件保持良好排版和清晰度</li>
            <li>音频文件使用MP3格式，采样率44.1kHz或以上</li>
            <li>文件命名保持一致性，便于系统自动关联</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">许可证</h2>
          <p>MIT © 2025 温瞳 caiths.com</p>
          <p className="text-sm text-gray-500 mt-4">
            注：此应用专为学习英语设计，请确保使用合法获取的学习资料。
          </p>
        </section>
      </div>
    </div>
  );
} 