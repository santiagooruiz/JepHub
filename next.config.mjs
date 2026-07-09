const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: los navegadores solo lo aplican sobre HTTPS (inofensivo en dev local).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" solo para la imagen Docker (Linux). En Windows los symlinks
  // requieren permisos de admin, así que se activa con BUILD_STANDALONE=1.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Librerías Node (cola/redis, driver SQL Server) que no deben empaquetarse por
  // el bundler — tedious usa módulos nativos de Node (dgram, net, tls).
  serverExternalPackages: ["bullmq", "ioredis", "mssql", "tedious"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
