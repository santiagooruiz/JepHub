// Lectura en vivo de clientes desde el ERP (SQL Server, tabla MTPROCLI, el
// maestro de terceros). Solo lectura y paginado en servidor: MTPROCLI tiene
// ~20k terceros (clientes + proveedores), aquí se filtran los clientes
// (ESCLIENTE='S'). El nombre del asesor se resuelve por VENDEDOR → VENDEN.

import { getErpPool, sql } from "./db";
import type {
  ErpClientDetail,
  ErpClientDoc,
  ErpClientDocSummary,
  ErpClientRow,
  ErpClientStats,
} from "@/features/clients/types";

const ERP_ORIGEN = "FAC";

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

/** Ficha de un cliente del ERP por NIT (null si no existe o no es cliente). */
export async function getErpClientByNit(nit: string): Promise<ErpClientDetail | null> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nit", sql.Char(15), nit.trim())
    .query(`
      SELECT
        LTRIM(RTRIM(C.NIT))       AS nit,
        LTRIM(RTRIM(C.NOMBRE))    AS nombre,
        C.PERSONANJ               AS personanj,
        LTRIM(RTRIM(C.EMAIL))     AS email,
        LTRIM(RTRIM(C.EMAILP))    AS emailAlt,
        LTRIM(RTRIM(C.TEL1))      AS tel1,
        LTRIM(RTRIM(C.TEL2))      AS tel2,
        LTRIM(RTRIM(C.DIRECCION)) AS direccion,
        LTRIM(RTRIM(C.CIUDADPRV)) AS ciudad,
        LTRIM(RTRIM(C.PAGINAWEB)) AS web,
        LTRIM(RTRIM(V.NOMBRE))    AS asesor,
        LTRIM(RTRIM(C.CANAL))     AS canal,
        C.ESPROVEE                AS esprovee,
        LTRIM(RTRIM(C.HABILITADO)) AS habilitado,
        C.ISPROSPECT              AS isprospect,
        C.PLAZO                   AS plazo,
        C.CUPOCR                  AS cupocr,
        CONVERT(varchar, C.FECHAING, 23) AS fecha
      FROM MTPROCLI C
      LEFT JOIN VENDEN V ON V.CODVEN = C.VENDEDOR
      WHERE C.NIT = @nit AND C.ESCLIENTE = 'S'`);
  const r = res.recordset[0];
  if (!r) return null;

  const ciudad = r.ciudad && r.ciudad !== "0" ? r.ciudad : "";
  return {
    nit: r.nit ?? "",
    nombre: r.nombre || "(sin nombre)",
    tipo: r.personanj === 2 ? "Empresa" : "Persona",
    estado: r.isprospect ? "Prospecto" : "Cliente",
    email: r.email || "",
    emailAlt: r.emailAlt || "",
    tel1: r.tel1 || "",
    tel2: r.tel2 || "",
    direccion: r.direccion || "",
    ciudad,
    web: r.web || "",
    asesor: r.asesor || "",
    canal: r.canal && r.canal !== "0" ? r.canal : "",
    esProveedor: r.esprovee === "S",
    habilitado: r.habilitado === "S" || r.habilitado === "1",
    plazo: Number(r.plazo ?? 0),
    cupoCredito: Number(r.cupocr ?? 0),
    fechaIngreso: cleanErpDate(r.fecha),
  };
}

/** Historial comercial del cliente en TRADE: resumen por tipo + documentos recientes. */
export async function getErpClientDocuments(
  nit: string
): Promise<{ summary: ErpClientDocSummary[]; recent: ErpClientDoc[] }> {
  const pool = await getErpPool();
  const clean = nit.trim();

  const [summaryRes, recentRes] = await Promise.all([
    pool.request().input("nit", sql.Char(15), clean).query(`
      SELECT
        LTRIM(RTRIM(T.TIPODCTO))    AS tipo,
        LTRIM(RTRIM(TD.DESCRIPCIO)) AS label,
        COUNT(*)                    AS count,
        SUM(T.BRUTO + T.IVABRUTO)   AS total
      FROM TRADE T
      LEFT JOIN TIPODCTO TD ON TD.ORIGEN = T.ORIGEN AND TD.TIPODCTO = T.TIPODCTO
      WHERE T.ORIGEN = '${ERP_ORIGEN}' AND T.NIT = @nit
      GROUP BY LTRIM(RTRIM(T.TIPODCTO)), LTRIM(RTRIM(TD.DESCRIPCIO))
      ORDER BY COUNT(*) DESC`),
    pool.request().input("nit", sql.Char(15), clean).query(`
      SELECT TOP 40
        LTRIM(RTRIM(T.TIPODCTO))    AS tipo,
        LTRIM(RTRIM(TD.DESCRIPCIO)) AS label,
        LTRIM(RTRIM(T.NRODCTO))     AS numero,
        CONVERT(varchar, T.FECHA, 23) AS fecha,
        (T.BRUTO + T.IVABRUTO)      AS valor,
        LTRIM(RTRIM(T.ORDEN))       AS orden
      FROM TRADE T
      LEFT JOIN TIPODCTO TD ON TD.ORIGEN = T.ORIGEN AND TD.TIPODCTO = T.TIPODCTO
      WHERE T.ORIGEN = '${ERP_ORIGEN}' AND T.NIT = @nit
      ORDER BY T.FECHA DESC, T.NRODCTO DESC`),
  ]);

  const summary: ErpClientDocSummary[] = summaryRes.recordset.map((r) => ({
    tipo: r.tipo ?? "",
    label: r.label || r.tipo || "",
    count: Number(r.count ?? 0),
    total: Number(r.total ?? 0),
  }));
  const recent: ErpClientDoc[] = recentRes.recordset.map((r) => ({
    tipo: r.tipo ?? "",
    label: r.label || r.tipo || "",
    numero: r.numero ?? "",
    fecha: cleanErpDate(r.fecha),
    valor: Number(r.valor ?? 0),
    orden: r.orden || "",
  }));
  return { summary, recent };
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
