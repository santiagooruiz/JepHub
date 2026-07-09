// Lectura en vivo de clientes desde el ERP (SQL Server, tabla MTPROCLI, el
// maestro de terceros). Solo lectura y paginado en servidor: MTPROCLI tiene
// ~20k terceros (clientes + proveedores), aquí se filtran los clientes
// (ESCLIENTE='S'). El nombre del asesor se resuelve por VENDEDOR → VENDEN.

import { getErpPool, sql } from "./db";
import type {
  ErpCarteraDoc,
  ErpClientCartera,
  ErpClientContact,
  ErpClientDetail,
  ErpClientDocRow,
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

/** Limpia un valor de texto del ERP tratando '0' como vacío. */
function clean(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  return s === "0" ? "" : s;
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

// ─────────────────────────── Detalle del cliente ───────────────────────────

/** Arma la lista de contactos desde los campos ZCONTAC1..4 de MTPROCLI. */
function buildContacts(r: Record<string, unknown>): ErpClientContact[] {
  const out: ErpClientContact[] = [];
  for (let i = 1; i <= 4; i++) {
    const nombre = clean(r[`c${i}`] as string);
    if (!nombre) continue;
    out.push({
      nombre,
      cargo: clean(r[`car${i}`] as string),
      telefono: clean(r[`tel${i}`] as string),
      direccion: clean(r[`dir${i}`] as string),
    });
  }
  return out;
}

/** Ficha de un cliente del ERP por NIT (null si no existe o no es cliente). */
export async function getErpClientByNit(nit: string): Promise<ErpClientDetail | null> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nit", sql.Char(15), nit.trim())
    .query(`
      SELECT
        LTRIM(RTRIM(C.NIT))        AS nit,
        LTRIM(RTRIM(C.NOMBRE))     AS nombre,
        C.PERSONANJ                AS personanj,
        LTRIM(RTRIM(C.EMAIL))      AS email,
        LTRIM(RTRIM(C.EMAILP))     AS emailAlt,
        LTRIM(RTRIM(C.TEL1))       AS tel1,
        LTRIM(RTRIM(C.TEL2))       AS tel2,
        LTRIM(RTRIM(C.DIRECCION))  AS direccion,
        LTRIM(RTRIM(COALESCE(NULLIF(LTRIM(RTRIM(CD.NOMBRE)), ''), C.CIUDADPRV))) AS ciudad,
        LTRIM(RTRIM(C.PAGINAWEB))  AS web,
        LTRIM(RTRIM(V.NOMBRE))     AS asesor,
        LTRIM(RTRIM(CN.NOMBRE))    AS canal,
        C.ESPROVEE                 AS esprovee,
        LTRIM(RTRIM(C.HABILITADO)) AS habilitado,
        C.ISPROSPECT               AS isprospect,
        C.PLAZO                    AS plazo,
        C.CUPOCR                   AS cupocr,
        CONVERT(varchar, C.FECHAING, 23) AS fecha,
        LTRIM(RTRIM(C.CONTACTO))   AS contactoPrincipal,
        LTRIM(RTRIM(C.ZCONTAC1)) c1, LTRIM(RTRIM(C.ZCARGOCONT1)) car1, LTRIM(RTRIM(C.ZTELCONTAC1)) tel1c, LTRIM(RTRIM(C.ZDIRCONT1)) dir1,
        LTRIM(RTRIM(C.ZCONTAC2)) c2, LTRIM(RTRIM(C.ZCARGOCONT2)) car2, LTRIM(RTRIM(C.ZTELCONTAC2)) tel2c, LTRIM(RTRIM(C.ZDIRCONT2)) dir2,
        LTRIM(RTRIM(C.ZCONTAC3)) c3, LTRIM(RTRIM(C.ZCARGOCONT3)) car3, LTRIM(RTRIM(C.ZTELCONTAC3)) tel3c, LTRIM(RTRIM(C.ZDIRCONT3)) dir3,
        LTRIM(RTRIM(C.ZCONTAC4)) c4, LTRIM(RTRIM(C.ZCARGOCONT4)) car4, LTRIM(RTRIM(C.ZTELCONTAC4)) tel4c, LTRIM(RTRIM(C.ZDIRCONT4)) dir4
      FROM MTPROCLI C
      LEFT JOIN VENDEN V ON V.CODVEN = C.VENDEDOR
      LEFT JOIN CIUDAD CD ON CD.CODCIUDAD = C.CDCIIU
      LEFT JOIN CANAL CN ON CN.CODCANAL = C.CANAL
      WHERE C.NIT = @nit AND C.ESCLIENTE = 'S'`);
  const r = res.recordset[0];
  if (!r) return null;

  const contacts = buildContacts({
    c1: r.c1, car1: r.car1, tel1: r.tel1c, dir1: r.dir1,
    c2: r.c2, car2: r.car2, tel2: r.tel2c, dir2: r.dir2,
    c3: r.c3, car3: r.car3, tel3: r.tel3c, dir3: r.dir3,
    c4: r.c4, car4: r.car4, tel4: r.tel4c, dir4: r.dir4,
  });

  const canal = clean(r.canal);
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
    ciudad: clean(r.ciudad),
    web: r.web || "",
    asesor: r.asesor || "",
    canal: canal === "NO ASIGNADO" || canal === "SIN DATOS" ? "" : canal,
    esProveedor: r.esprovee === "S",
    habilitado: r.habilitado === "S" || r.habilitado === "1",
    plazo: Number(r.plazo ?? 0),
    cupoCredito: Number(r.cupocr ?? 0),
    fechaIngreso: cleanErpDate(r.fecha),
    contactoPrincipal: clean(r.contactoPrincipal),
    contacts,
  };
}

/** Saldo de cartera del cliente (documentos con saldo + aging), vía TVF del ERP. */
export async function getErpClientCartera(nit: string): Promise<ErpClientCartera> {
  const pool = await getErpPool();
  const now = new Date();
  // Siempre filtrar por Cliente: sin ese predicado la función escanea toda la cartera.
  const res = await pool
    .request()
    .input("fa", sql.DateTime, now)
    .input("fc", sql.DateTime, now)
    .input("nit", sql.VarChar(20), nit.trim())
    .query(`
      SELECT
        LTRIM(RTRIM(T_Dcto))    AS tipo,
        LTRIM(RTRIM(Documento)) AS documento,
        CONVERT(varchar, F_Vencim, 23) AS fVencim,
        DiasVc AS diasVenc, Saldo AS saldo,
        Venc_91, Venc_61_90, Venc_31_60, Venc_0_30, Por_Venc
      FROM fnvOF_ReporteCartera_jep2(@fa, @fc)
      WHERE Cliente = @nit AND Saldo <> 0 AND Otra_Moneda = 'N'
        AND Multi_Moneda = 0 AND T_Dcto NOT IN ('AE')
      ORDER BY F_Vencim`);

  const docs: ErpCarteraDoc[] = res.recordset.map((r) => ({
    tipo: r.tipo ?? "",
    documento: r.documento ?? "",
    fVencim: cleanErpDate(r.fVencim),
    diasVenc: Number(r.diasVenc ?? 0),
    saldo: Number(r.saldo ?? 0),
  }));
  const sum = (k: string) => res.recordset.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  return {
    totalSaldo: docs.reduce((a, d) => a + d.saldo, 0),
    docs,
    aging: {
      porVencer: sum("Por_Venc"),
      d0_30: sum("Venc_0_30"),
      d31_60: sum("Venc_31_60"),
      d61_90: sum("Venc_61_90"),
      d91: sum("Venc_91"),
    },
  };
}

/** Documentos del cliente en TRADE de un tipo (CV = cotizaciones, PD = pedidos). */
export async function getErpClientDocs(nit: string, tipodcto: string): Promise<ErpClientDocRow[]> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nit", sql.Char(15), nit.trim())
    .input("tipo", sql.Char(2), tipodcto)
    .query(`
      SELECT TOP 100
        LTRIM(RTRIM(NRODCTO))       AS numero,
        CONVERT(varchar, FECHA, 23) AS fecha,
        (BRUTO + IVABRUTO)          AS valor,
        LTRIM(RTRIM(ORDEN))         AS orden
      FROM TRADE
      WHERE ORIGEN = '${ERP_ORIGEN}' AND TIPODCTO = @tipo AND NIT = @nit
      ORDER BY FECHA DESC, NRODCTO DESC`);
  return res.recordset.map((r) => ({
    numero: r.numero ?? "",
    fecha: cleanErpDate(r.fecha),
    valor: Number(r.valor ?? 0),
    orden: r.orden || "",
  }));
}
