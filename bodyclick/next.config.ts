/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*", // 프론트엔드에서 /api/... 로 요청이 오면
        destination: "http://localhost:4000/api/:path*", // 백엔드(4000번)로 토스해라
      },
    ];
  },
};

export default nextConfig;