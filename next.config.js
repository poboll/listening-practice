/** @type {import('next').NextConfig} */

// 检查是否启用构建分析
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;

// 确保正确设置环境变量
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

const nextConfig = {
  reactStrictMode: true,
  compress: true, // 启用gzip压缩
  poweredByHeader: false, // 移除X-Powered-By头
  productionBrowserSourceMaps: false, // 不生成生产环境的sourcemap
  swcMinify: true, // 使用SWC进行代码压缩
  experimental: {
    forceSwcTransforms: true, // 强制使用SWC，即使存在Babel配置
  },
  webpack: (config, { isServer, dev }) => {
    // 添加对音频文件的支持
    config.module.rules.push({
      test: /\.(mp3|wav|ogg)$/i,
      type: 'asset/resource',
    });

    // 处理canvas和其他Node模块在服务器端的问题
    if (isServer) {
      // 这将完全忽略与canvas等Node.js模块相关的导入
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        encoding: false
      };
    }

    // 生产环境优化
    if (!dev) {
      // 将react和react-dom从bundle中排除，使用CDN版本
      config.externals = [...(config.externals || []),
      {
        // 在生产环境中可以考虑使用这种方式减小bundle体积
        // 但需要在HTML中添加相应的CDN脚本
        // 'react': 'React',
        // 'react-dom': 'ReactDOM',
      }];

      // 优化CSS处理
      if (config.module && config.module.rules) {
        const cssRule = config.module.rules.find(
          rule => rule.oneOf && Array.isArray(rule.oneOf) && rule.oneOf.some(
            subRule => subRule.test && subRule.test.toString().includes('css')
          )
        );
        if (cssRule && cssRule.oneOf) {
          cssRule.oneOf.forEach(subRule => {
            if (subRule.test && subRule.test.toString().includes('css')
              && subRule.use && Array.isArray(subRule.use)) {
              subRule.use.forEach(loader => {
                if (loader.options && typeof loader.options === 'object') {
                  // 将CSS压缩到极致
                  loader.options.minimize = true;
                }
              });
            }
          });
        }
      }
    }

    return config;
  },
  // 配置基本路径
  basePath: '',
  assetPrefix: '',
  // 忽略TypeScript错误
  typescript: {
    ignoreBuildErrors: true
  },
  // 忽略ESLint错误
  eslint: {
    ignoreDuringBuilds: true
  },
  // 自定义路由处理
  async rewrites() {
    return [
      {
        source: '/content/:path*',
        destination: '/content/:path*',
      },
    ];
  },
  // 配置头信息，优化缓存策略
  async headers() {
    return [
      {
        source: '/content/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // 优化图片配置
  images: {
    dangerouslyAllowSVG: true,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // 优化输出目录
  distDir: process.env.BUILD_DIR || '.next',
  // 禁用静态导出
  output: 'standalone',
};

module.exports = withBundleAnalyzer(nextConfig);
