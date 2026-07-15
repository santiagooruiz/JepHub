// Carga .env con la misma semántica que Next.js (@next/env: dotenv + expand),
// para que el worker vea DATABASE_URL, REDIS_URL y OFIMATICA_DB_* al correr
// con tsx fuera de Next. Debe ser el PRIMER import de worker/index.ts.
// Import por default: @next/env es CJS y bajo Node 24 + tsx (ESM) el named
// import falla ("does not provide an export named 'loadEnvConfig'").
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
