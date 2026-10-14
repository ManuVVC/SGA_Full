import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api-proxy/api/:path*",
        destination: "http://backend:5000/api/:path*", // Cambiado de localhost a backend para que resuelva dentro de Docker
      },
      {
        source: "/api-proxy/admin/:path*",
        destination: "http://backend:5000/admin/:path*", // Cambiado de localhost a backend para que resuelva dentro de Docker
      }
    ];
  },
};

export default nextConfig;
