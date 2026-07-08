// Lectura en vivo de clientes desde el ERP (SQL Server, tabla MTPROCLI, el
// maestro de terceros). Solo lectura y paginado en servidor: MTPROCLI tiene
// ~20k terceros (clientes + proveedores), aquí se filtran los clientes
// (ESCLIENTE='S'). El nombre del asesor se resuelve por VENDEDOR → VENDEN.

import { getErpPool, sql } from "./db";
import type { ErpClientRow, ErpClientStats } from "@/features/clients/types";

/** Descarta fechas centinela/basura del ERP (1900, o años fuera de rango). */
function cleanErpDate(s: string | null | undefined): string {
  if (!s) return "";
  const year = Number(s.slice(0, 4));
  return year >= 1990 && year <= 2100 ? s : "";
}

export const CLIENTS_PAGE_SIZE = 25;

/** WHERE de búsqueda (nombre / NIT / email). Vacío si no hay término. */
function buildSearch(request: sql.Request, q: string): string {
  const term = q.trim();
  if (!term) return "";
  request.input("q", sql.NVarChar, `%${term}%`);
  return "AND (C.NOMBRE LIKE @q OR C.NIT LIKE @q OR C.EMAIL LIKE @q)";
}

/** Página de clientes del ERP + total de coincidencias (para la paginación). */
export async function getErpClients(opts: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ErpClientRow[]; total: number }> {
  const pool = await getErpPool();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? CLIENTS_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const request = pool
    .request()
    .input("offset", sql.Int, offset)
    .input("size", sql.Int, pageSize);
  const filtro = buildSearch(request, opts.q ?? "");

  // COUNT(*) OVER() devuelve el total del set filtrado en la misma consulta.
  const res = await request.query(`
    SELECT
      LTRIM(RTRIM(C.NIT))              AS nit,
      LTRIM(RTRIM(C.NOMBRE))           AS nombre,
      C.PERSONANJ                      AS personanj,
      LTRIM(RTRIM(C.EMAIL))            AS email,
      LTRIM(RTRIM(C.TEL1))             AS telefono,
      LTRIM(RTRIM(C.CIUDADPRV))        AS ciudad,
      LTRIM(RTRIM(V.NOMBRE))           AS asesor,
      C.ISPROSPECT                     AS isprospect,
      CONVERT(varchar, C.FECHAING, 23) AS fecha,
      COUNT(*) OVER()                  AS total
    FROM MTPROCLI C
    LEFT JOIN VENDEN V ON V.CODVEN = C.VENDEDOR
    WHERE C.ESCLIENTE = 'S' ${filtro}
    ORDER BY C.FECHAING DESC, C.NIT
    OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`);

  const rows: ErpClientRow[] = res.recordset.map((r) => ({
    nit: r.nit ?? "",
    nombre: r.nombre || "(sin nombre)",
    tipo: r.personanj === 2 ? "Empresa" : "Persona",
    email: r.email || "",
    telefono: r.telefono || "",
    ciudad: r.ciudad || "",
    asesor: r.asesor || "",
    estado: r.isprospect ? "Prospecto" : "Cliente",
    fechaRegistro: cleanErpDate(r.fecha),
  }));
  const total = Number(res.recordset[0]?.total ?? 0);
  return { rows, total };
}

/** Totales para las tarjetas de resumen (respetan el término de búsqueda). */
export async function getErpClientStats(q?: string): Promise<ErpClientStats> {
  const pool = await getErpPool();
  const request = pool.request();
  const filtro = buildSearch(request, q ?? "");
  const res = await request.query(`
    SELECT
      COUNT(*)                                                    AS total,
      SUM(CASE WHEN C.PERSONANJ = 2 THEN 1 ELSE 0 END)            AS empresas,
      SUM(CASE WHEN C.PERSONANJ <> 2 OR C.PERSONANJ IS NULL THEN 1 ELSE 0 END) AS personas,
      SUM(CASE WHEN C.ISPROSPECT = 1 THEN 1 ELSE 0 END)          AS prospectos
    FROM MTPROCLI C
    WHERE C.ESCLIENTE = 'S' ${filtro}`);
  const r = res.recordset[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    empresas: Number(r.empresas ?? 0),
    personas: Number(r.personas ?? 0),
    prospectos: Number(r.prospectos ?? 0),
  };
}
