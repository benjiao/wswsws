/** @type {import('next').NextConfig} */
const nextConfig = {  
  output: 'standalone',
  
  // Add module resolution for problematic packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    // Handle rc-util module resolution issues
    config.resolve.alias = {
      ...config.resolve.alias,
      'rc-util/es/utils/get': require.resolve('rc-util/lib/utils/get'),
      'rc-util/es/utils/set': require.resolve('rc-util/lib/utils/set'),
      'rc-picker/es/locale/common': require.resolve('rc-picker/lib/locale/common'),
      'rc-picker/es/locale/en_US': require.resolve('rc-picker/lib/locale/en_US'),
      'rc-picker/es': require.resolve('rc-picker/lib'),
    };

    return config;
  },

  // Allow external API calls
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}/:path*`,
      },
    ];
  },

  // Optimize for production
  experimental: {
    optimizePackageImports: ['@ant-design/icons'],
  },

  // Transpile packages that might have ESM issues
  transpilePackages: ['antd', '@ant-design/icons', 'rc-util', 'rc-picker'],
}

module.exports = nextConfig