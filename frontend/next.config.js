/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
