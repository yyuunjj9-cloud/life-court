/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 직접 연결(onrender.com)이 막힌 네트워크를 위한 같은 도메인 우회 경로.
    // api.ts가 네트워크 실패 2회 누적 시 /backend/* 로 자동 전환한다.
    return [
      {
        source: "/backend/:path*",
        destination: `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").trim().replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;
