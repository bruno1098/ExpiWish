/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['firebasestorage.googleapis.com'],
  },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['openai', 'firebase-admin']
  },
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Configuração específica para Firebase
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Prevenir problemas de otimização que podem quebrar chunks
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  }
};

module.exports = nextConfig;
