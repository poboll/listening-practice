/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
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
  // 忽略@content内的隐藏文件
  images: {
    dangerouslyAllowSVG: true,
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
  // 配置头信息
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
    ];
  },
};

module.exports = nextConfig;
