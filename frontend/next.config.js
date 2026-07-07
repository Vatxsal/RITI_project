/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/backend',
        destination: '/backend/index.html',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/sector/employ',
        destination: '/sector/women',
        permanent: true,
      },
    ];
  },
}

module.exports = nextConfig
