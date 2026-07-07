import "./env";
import { Worker } from "bullmq";

import { createRedisConnection } from "../src/server/queue/connection";
import {
  OFIMATICA_QUEUE,
  ensureMilestonePolling,
  type OfimaticaJob,
} from "../src/server/queue/ofimatica";
import { processSend, processMilestone, processPoll } from "../src/server/ofimatica/processors";
import { isErpDbConfigured } from "../src/server/ofimatica/db";

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
    } else if (data.type === "poll") {
      await processPoll();
    }
  },
  { connection: createRedisConnection(), concurrency: 5 }
);

// Con la BD del ERP configurada, los hitos se leen de TRADEMAS por polling.
if (isErpDbConfigured()) {
  ensureMilestonePolling()
    .then(() => console.log("[ofimatica] polling de hitos activo (BD ERP configurada)"))
    .catch((err) => console.error("[ofimatica] no se pudo registrar el polling:", err));
} else {
  console.log("[ofimatica] BD ERP sin configurar — cliente simulado activo");
}

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
