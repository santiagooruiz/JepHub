// Validación de configuración al arrancar (ver src/instrumentation.ts).
// En producción es estricta (lanza); en desarrollo solo advierte.

const DEV_DEFAULTS = new Set([
  "dev-secret-change-me",
  "cambia-esto-por-un-secreto-largo-y-aleatorio",
  "dev-webhook-secret",
  "cambia-esto-por-un-secreto-de-webhook",
]);

export function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const errors: string[] = [];

  for (const key of ["DATABASE_URL", "AUTH_SECRET", "APP_URL"] as const) {
    if (!process.env[key]) errors.push(`Falta la variable ${key}.`);
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (isProd) {
    if (DEV_DEFAULTS.has(secret)) errors.push("AUTH_SECRET usa un valor por defecto (inseguro en producción).");
    else if (secret.length < 32) errors.push("AUTH_SECRET debe tener al menos 32 caracteres en producción.");
    if (!process.env.REDIS_URL) errors.push("Falta REDIS_URL (requerido por el worker/colas).");
    if (!process.env.OFIMATICA_WEBHOOK_SECRET || DEV_DEFAULTS.has(process.env.OFIMATICA_WEBHOOK_SECRET)) {
      errors.push("OFIMATICA_WEBHOOK_SECRET falta o usa un valor por defecto.");
    }
  }

  if (errors.length) {
    const msg = "Configuración inválida:\n- " + errors.join("\n- ");
    if (isProd) throw new Error(msg);
    console.warn(`[env] ${msg}`);
  }
}
