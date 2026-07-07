import sql from "mssql";

// Conexión a la BD del ERP "ofimática" (SQL Server 2017, servidor BD1JEP,
// base PROTOTIPO2016). Pool singleton con el mismo patrón anti-HMR del
// PrismaClient. Solo debe importarse desde código de servidor (worker,
// processors, server actions) — nunca desde componentes cliente.

const REQUIRED_VARS = [
  "OFIMATICA_DB_HOST",
  "OFIMATICA_DB_NAME",
  "OFIMATICA_DB_USER",
  "OFIMATICA_DB_PASSWORD",
] as const;

/** true si el .env trae la configuración completa de la BD del ERP. */
export function isErpDbConfigured(): boolean {
  return REQUIRED_VARS.every((k) => Boolean(process.env[k]));
}

/** Variables presentes pero incompletas (para diagnóstico en validateEnv). */
export function erpDbMissingVars(): string[] {
  const set = REQUIRED_VARS.filter((k) => Boolean(process.env[k]));
  if (set.length === 0 || set.length === REQUIRED_VARS.length) return [];
  return REQUIRED_VARS.filter((k) => !process.env[k]);
}

function buildConfig(): sql.config {
  return {
    server: process.env.OFIMATICA_DB_HOST!,
    port: Number(process.env.OFIMATICA_DB_PORT || 1433),
    database: process.env.OFIMATICA_DB_NAME!,
    user: process.env.OFIMATICA_DB_USER!,
    password: process.env.OFIMATICA_DB_PASSWORD!,
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    // El servidor usa certificado autofirmado; el tráfico va cifrado igual.
    options: { encrypt: true, trustServerCertificate: true },
  };
}

const globalForErp = globalThis as unknown as {
  erpPoolPromise: Promise<sql.ConnectionPool> | undefined;
};

/** Pool de conexiones al ERP (se conecta perezosamente la primera vez). */
export function getErpPool(): Promise<sql.ConnectionPool> {
  if (!isErpDbConfigured()) {
    return Promise.reject(new Error("BD del ERP ofimática sin configurar (OFIMATICA_DB_*)."));
  }
  if (!globalForErp.erpPoolPromise) {
    globalForErp.erpPoolPromise = new sql.ConnectionPool(buildConfig())
      .connect()
      .catch((err) => {
        // Si falla la conexión inicial, no dejar cacheada la promesa rota.
        globalForErp.erpPoolPromise = undefined;
        throw err;
      });
  }
  return globalForErp.erpPoolPromise;
}

export { sql };
