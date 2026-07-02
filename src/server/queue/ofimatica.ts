import { Queue } from "bullmq";

import { createRedisConnection } from "./connection";
import type { Hito } from "../ofimatica/types";

export const OFIMATICA_QUEUE = "ofimatica";

export type SendJob = { type: "send"; orderId: string };
export type MilestoneJob = { type: "milestone"; orderId: string; hito: Hito };
export type OfimaticaJob = SendJob | MilestoneJob;

// Singleton de la cola (patrón del PrismaClient para sobrevivir al HMR de dev).
const globalForQueue = globalThis as unknown as {
  ofimaticaQueue: Queue<OfimaticaJob> | undefined;
};

export function ofimaticaQueue(): Queue<OfimaticaJob> {
  const existing = globalForQueue.ofimaticaQueue;
  if (existing) return existing;
  const queue = new Queue<OfimaticaJob>(OFIMATICA_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    },
  });
  globalForQueue.ofimaticaQueue = queue;
  return queue;
}

/** Encola el envío de un pedido al ERP. */
export async function enqueueSend(orderId: string) {
  return ofimaticaQueue().add("send", { type: "send", orderId });
}

/** Programa un hito simulado (el worker lo reenvía al webhook tras el delay). */
export async function enqueueMilestone(orderId: string, hito: Hito, delayMs: number) {
  return ofimaticaQueue().add(
    "milestone",
    { type: "milestone", orderId, hito },
    { delay: delayMs }
  );
}
