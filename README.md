# 英语精听练习平台 | English Listening Practice

一个现代化的英语学习应用，专为提升听力理解能力和阅读效率而设计。采用优雅的亚克力风格UI，提供沉浸式学习体验。

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.2.0-black)
![React](https://img.shields.io/badge/React-18.3.1-61dafb)
![PDF.js](https://img.shields.io/badge/PDF.js-3.4.120-red)
![License](https://img.shields.io/badge/许可证-MIT-green)

## ✨ 核心特性

### 📑 高级PDF阅读体验
- **多种标注工具**：荧光笔（黄色/蓝色/粉色）、铅笔、钢笔
- **夜间模式**：减轻长时间阅读的眼部疲劳
- **阅读进度记忆**：自动保存并恢复上次阅读位置
- **高效缩放与旋转**：灵活调整文档视图
- **全屏阅读模式**：提供沉浸式阅读环境

### 🎧 智能音频播放
- **倍速控制**：0.5x 到 2.0x 多级播放速度
- **快进快退**：精确控制播放进度
- **自动关联**：智能匹配PDF文档相关音频
- **迷你播放器**：悬浮式设计，不影响阅读体验

### 📁 便捷文件管理
- **层级浏览**：直观展示文件夹结构
- **文件搜索**：快速定位目标文件
- **智能排序**：按名称、日期、类型组织文件
- **阅读进度追踪**：可视化学习记录

### 📱 响应式设计
- **跨设备兼容**：桌面、平板、手机全面适配
- **触控优化**：为iPad和触屏设备特别优化
- **性能调优**：移动设备上高效渲染
- **离线支持**：无需持续联网也能使用

## 📋 项目结构

应用从 `public/content` 目录读取文件。推荐的目录结构为：

```
public/content/
  ├── 1月/                        # 按月份组织
  │   ├── 0101/                   # 日期文件夹
  │   │   ├── 1.1.pdf             # PDF教材
  │   │   └── 1.1.mp3             # 对应的音频文件
  │   └── 0102/
  │       ├── 1.2.pdf
  │       └── 1.2.mp3
  └── 2月/
      ├── 0201/
      │   ├── 2.1.pdf
      │   └── 2.1.mp3
      └── 0202/
          ├── 2.2.pdf
          └── 2.2.mp3
```

> 提示：文件命名最好保持一致，系统会自动关联同名的PDF和音频文件。

## 🚀 快速开始

### 在线体验
访问 [英语精听练习平台](https://english-listening-practice.vercel.app/) 立即体验在线版本。

### 本地开发

#### 安装依赖
```bash
npm install
# 或使用 yarn
yarn install
```

#### 运行开发服务器
```bash
npm run dev
# 或使用 yarn
yarn dev
```

#### 构建生产版本
```bash
npm run build
npm run start
# 或使用 yarn
yarn build
yarn start
```

## 💡 使用技巧

1. **高效标注**：阅读时使用荧光笔标记重点，使用钢笔/铅笔记录笔记
2. **音频与文本同步**：聆听音频的同时阅读PDF，加深理解和记忆
3. **调整播放速度**：初学者可使用0.75x速度，提高水平后尝试1.25x-1.5x
4. **夜间阅读**：在弱光环境下使用夜间模式，保护视力
5. **离线准备**：提前下载需要的内容，在无网络环境下也能学习
6. **定期练习**：设定学习计划，利用进度追踪功能监督学习情况

## 🛠️ 技术栈

### 前端框架
- **Next.js** 15.2.0：React框架，提供SSR/SSG支持
- **React** 18.3.1：用户界面库
- **Tailwind CSS**：实用程序优先的CSS框架
- **Framer Motion**：强大的React动画库

### UI组件
- **shadcn/ui**：基于Radix UI的组件库
- **Lucide图标**：现代化图标集

### 核心功能
- **react-pdf** 7.1.2：PDF查看和操作
- **pdfjs-dist** 3.4.120：PDF.js核心库
- **HTML5 Audio API**：音频播放和控制

## 📦 部署指南

### Vercel 部署（推荐）
1. Fork本仓库到你的GitHub账户
2. 注册[Vercel](https://vercel.com)账户并连接GitHub
3. 在Vercel中导入你的仓库
4. 无需特殊配置，点击部署即可

### 自托管
1. 在服务器上克隆仓库
2. 安装依赖: `npm install`
3. 构建项目: `npm run build`
4. 使用PM2等工具启动: `pm2 start npm -- start`

## 🔧 自定义内容

将你的PDF和MP3文件放入 `public/content` 目录，系统会自动检测并显示。

为获得最佳效果，建议：
- PDF文件保持良好排版和清晰度
- 音频文件使用MP3格式，采样率44.1kHz或以上
- 文件命名保持一致性，便于系统自动关联

## 🤝 贡献指南

欢迎提交Pull Request或Issue帮助改进项目。贡献前请先查看现有问题，并遵循以下步骤：

1. Fork仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的改动 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个Pull Request

## 📄 许可证

MIT © 2025温瞳 caiths.com

---

*注：此应用专为学习英语设计，请确保使用合法获取的学习资料。*

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
