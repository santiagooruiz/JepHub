import IORedis from "ioredis";
import type { ConnectionOptions } from "bullmq";

/**
 * Conexión Redis para BullMQ. `maxRetriesPerRequest: null` es requerido por
 * los Workers de BullMQ (los comandos bloqueantes no deben expirar).
 *
 * Se tipa como `ConnectionOptions` de BullMQ: ioredis y el ioredis que empaqueta
 * BullMQ pueden resolverse a copias distintas (mismatch nominal de tipos aunque
 * son compatibles en runtime); el cast lo unifica en un solo punto.
 */
export function createRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new IORedis(url, { maxRetriesPerRequest: null }) as unknown as ConnectionOptions;
}
