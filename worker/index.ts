import { Worker } from "bullmq";

import { createRedisConnection } from "../src/server/queue/connection";
import { OFIMATICA_QUEUE, type OfimaticaJob } from "../src/server/queue/ofimatica";
import { processSend, processMilestone } from "../src/server/ofimatica/processors";

// Proceso worker BullMQ: consume la cola "ofimatica" (envío al ERP + hitos).
// Ejecutar con `pnpm worker` (requiere Redis y la app corriendo para el webhook).

const worker = new Worker<OfimaticaJob>(
  OFIMATICA_QUEUE,
  async (job) => {
    const data = job.data;
    if (data.type === "send") {
      await processSend(data.orderId);
    } else if (data.type === "milestone") {
      await processMilestone(data.orderId, data.hito);
    }
  },
  { connection: createRedisConnection(), concurrency: 5 }
);

worker.on("completed", (job) => {
  console.log(`[ofimatica] ✓ ${job.name} (${job.id})`, job.data);
});
worker.on("failed", (job, err) => {
  console.error(`[ofimatica] ✗ ${job?.name} (${job?.id}): ${err.message}`);
});

console.log("[ofimatica] worker escuchando la cola…");

async function shutdown() {
  console.log("\n[ofimatica] cerrando worker…");
  await worker.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
