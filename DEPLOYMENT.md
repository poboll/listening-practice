# 英语精听练习平台 - 部署指南

## 项目优化概述

为了符合Vercel的350MB限制，我们对项目进行了以下优化：

1. **依赖优化**：
   - 清理和优化了 `package.json`
   - 固定了依赖版本号（去除^符号）
   - 将某些开发依赖从生产依赖中移除
   - 添加了 `fs-extra` 作为 peerDependency

2. **构建优化**：
   - 添加了 `.npmrc` 配置，确保生产环境不安装开发依赖
   - 配置了 `next.config.js` 启用压缩和其他优化
   - 添加了 `.babelrc` 配置移除开发代码和console.log
   - 配置了输出为 `standalone` 模式，减少依赖复制
   - 启用了 Bundle Analyzer 便于分析打包大小

3. **文件排除**：
   - 优化了 `.gitignore` 和 `.vercelignore`
   - 添加了 `.dockerignore` 用于Docker部署
   - 配置了静态资源缓存策略

4. **代码优化**：
   - 改进了PDF查看器组件以减少不必要的计算
   - 添加了保活API路由
   - 改进了错误处理和性能检测逻辑

## 部署到Vercel

1. **登录Vercel**：
   ```
   npm i -g vercel
   vercel login
   ```

2. **本地构建测试**：
   ```
   npm run build
   ```

3. **部署到Vercel**：
   ```
   vercel
   ```

4. **生产环境部署**：
   ```
   vercel --prod
   ```

## 优化说明

### 关于PDF和音频文件

项目主要体积来自PDF相关库和音频处理库。我们已经优化了这些库的使用方式，但它们仍然是必要的。如果遇到部署限制问题，可以考虑以下方案：

1. **使用外部CDN托管**：
   - 将PDF和音频文件托管在外部服务上（如Amazon S3）
   - 修改应用以从外部URL加载内容

2. **拆分应用**：
   - 将PDF查看器和音频播放器功能拆分为单独的应用
   - 使用微前端架构整合它们

### 额外建议

1. **边缘缓存**：
   - 使用Vercel边缘缓存优化内容分发
   - 为静态资源配置长期缓存

2. **懒加载**：
   - PDF查看器已配置为动态导入和懒加载
   - 监控并优化页面性能

3. **预加载**：
   - 使用 `next/prefetch` 预加载可能访问的页面

4. **监控部署大小**：
   - 使用 `ANALYZE=true npm run build` 分析打包大小
   - 定期移除不需要的依赖

## 排查部署问题

如果部署到Vercel时遇到大小限制问题，可以尝试：

1. 确保 `production=true` 在 `.npmrc` 文件中
2. 确认 Vercel 项目设置中使用了 `npm ci --only=production` 安装命令
3. 检查是否正在使用 `.vercelignore` 排除不必要的文件
4. 运行 `vercel --debug` 查看详细日志
5. 在本地建立干净的项目副本测试构建过程

## 联系和支持

如有任何部署问题，请联系项目维护者或提交GitHub issue。 