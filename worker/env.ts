// Carga .env con la misma semántica que Next.js (@next/env: dotenv + expand),
// para que el worker vea DATABASE_URL, REDIS_URL y OFIMATICA_DB_* al correr
// con tsx fuera de Next. Debe ser el PRIMER import de worker/index.ts.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
