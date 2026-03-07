import nextPWA from 'next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';

const isTurbopack = process.env.TURBOPACK === '1';
const allowUnsafeBuild = process.env.ALLOW_UNSAFE_BUILD_ERRORS === 'true'

/** @type {import('next').NextConfig} */
const withAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const nextConfig = {
  eslint: {
    // Keep production safe; allow override only for local emergency builds.
    ignoreDuringBuilds: allowUnsafeBuild,
  },
  typescript: {
    // Keep production safe; allow override only for local emergency builds.
    ignoreBuildErrors: allowUnsafeBuild,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip'
    ]
  }
};

const applyPWA = isTurbopack ? (config) => config : nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const applyAnalyzer = isTurbopack ? ((config) => config) : withAnalyzer;

export default applyAnalyzer(applyPWA(nextConfig));
