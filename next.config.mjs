/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" solo para la imagen Docker (Linux). En Windows los symlinks
  // requieren permisos de admin, así que se activa con BUILD_STANDALONE=1.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Librerías Node (cola/redis) que no deben empaquetarse por el bundler.
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default nextConfig;
