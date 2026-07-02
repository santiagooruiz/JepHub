// Rate limiter en memoria (ventana fija). Suficiente para una sola instancia web
// (la topología de despliegue corre un único contenedor `web`). Para múltiples
// réplicas, migrar a un backend compartido (Redis).

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export type RateResult = { ok: boolean; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/** Extrae la IP del cliente respetando el reverse proxy (Caddy). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Limpieza periódica de buckets vencidos (no mantiene vivo el proceso).
const timer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}, 60_000);
timer.unref?.();
