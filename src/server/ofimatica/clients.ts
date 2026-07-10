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

/** Recorta a la longitud del char(n)/varchar(n) destino. */
function fit(v: string | null | undefined, max: number): string {
  return (v ?? "").trim().slice(0, max);
}

export const CLIENTS_PAGE_SIZE = 25;

/** WHERE de búsqueda (nombre / NIT / email). Vacío si no hay término. */
function buildSearch(request: sql.Request, q: string): string {
  const term = q.trim();
  if (!term) return "";
  request.input("q", sql.NVarChar, `%${term}%`);
  return "AND (C.NOMBRE LIKE @q OR C.NIT LIKE @q OR C.EMAIL LIKE @q)";
}

/** Filtro por tipo desde las tarjetas de resumen del listado. */
export type ErpClientTipoFiltro = "empresas" | "personas" | "prospectos";

/** Columnas ordenables del listado (whitelist → expresión SQL). */
export type ErpClientSortKey =
  | "nombre"
  | "documento"
  | "email"
  | "telefono"
  | "ciudad"
  | "asesor"
  | "estado"
  | "fechaRegistro";

export const ERP_CLIENT_SORT_KEYS: ErpClientSortKey[] = [
  "nombre",
  "documento",
  "email",
  "telefono",
  "ciudad",
  "asesor",
  "estado",
  "fechaRegistro",
];

// LTRIM/RTRIM: hay valores con espacios iniciales en el ERP que romperían el
// orden alfabético si se ordena por la columna char cruda.
const SORT_EXPRS: Record<ErpClientSortKey, string> = {
  nombre: "LTRIM(RTRIM(C.NOMBRE))",
  documento: "LTRIM(RTRIM(C.NIT))",
  email: "LTRIM(RTRIM(C.EMAIL))",
  telefono: "LTRIM(RTRIM(C.TEL1))",
  ciudad: "LTRIM(RTRIM(C.CIUDADPRV))",
  asesor: "LTRIM(RTRIM(V.NOMBRE))",
  estado: "C.ISPROSPECT",
  fechaRegistro: "C.FECHAING",
};

function buildOrderBy(sort?: ErpClientSortKey, dir?: "asc" | "desc"): string {
  const expr = sort ? SORT_EXPRS[sort] : undefined;
  if (!expr) return "ORDER BY C.FECHAING DESC, C.NIT";
  return `ORDER BY ${expr} ${dir === "desc" ? "DESC" : "ASC"}, C.NIT`;
}

function buildTipoFilter(tipo?: ErpClientTipoFiltro): string {
  switch (tipo) {
    case "empresas":
      return "AND C.PERSONANJ = 2";
    case "personas":
      return "AND (C.PERSONANJ <> 2 OR C.PERSONANJ IS NULL)";
    case "prospectos":
      return "AND C.ISPROSPECT = 1";
    default:
      return "";
  }
}

/**
 * WHERE de alcance por asesor: limita a clientes cuyo MTPROCLI.VENDEDOR esté en
 * los codven del usuario (rol Asesor). `undefined` = sin restricción (admin).
 * Un asesor sin codven configurado no ve clientes (1=0).
 */
function buildCodvenScope(request: sql.Request, codvens?: string[]): string {
  if (codvens === undefined) return "";
  const clean = [...new Set(codvens.map((c) => c.trim()).filter(Boolean))];
  if (clean.length === 0) return "AND 1 = 0";
  const placeholders = clean.map((c, i) => {
    request.input(`cv${i}`, sql.Char(15), c);
    return `@cv${i}`;
  });
  return `AND C.VENDEDOR IN (${placeholders.join(", ")})`;
}

/** Página de clientes del ERP + total de coincidencias (para la paginación). */
export async function getErpClients(opts: {
  q?: string;
  page?: number;
  pageSize?: number;
  /** Alcance por asesor (rol Asesor): solo clientes con VENDEDOR en estos codven. */
  codvens?: string[];
  /** Filtro de las tarjetas: empresas / personas / prospectos. */
  tipo?: ErpClientTipoFiltro;
  /** Ordenamiento por columna (whitelist) y dirección. */
  sort?: ErpClientSortKey;
  dir?: "asc" | "desc";
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
  const scope = buildCodvenScope(request, opts.codvens);
  const tipoFiltro = buildTipoFilter(opts.tipo);

  // COUNT(*) OVER() devuelve el total del set filtrado en la misma consulta.
  const res = await request.query(`
    ${CLIENT_SELECT},
      COUNT(*) OVER()                  AS total
    ${CLIENT_FROM}
    WHERE C.ESCLIENTE = 'S' ${filtro} ${scope} ${tipoFiltro}
    ${buildOrderBy(opts.sort, opts.dir)}
    OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`);

  const rows = res.recordset.map(mapClientRow);
  const total = Number(res.recordset[0]?.total ?? 0);
  return { rows, total };
}

const CLIENT_SELECT = `
    SELECT
      LTRIM(RTRIM(C.NIT))              AS nit,
      LTRIM(RTRIM(C.NOMBRE))           AS nombre,
      C.PERSONANJ                      AS personanj,
      LTRIM(RTRIM(C.EMAIL))            AS email,
      LTRIM(RTRIM(C.TEL1))             AS telefono,
      LTRIM(RTRIM(C.CIUDADPRV))        AS ciudad,
      LTRIM(RTRIM(V.NOMBRE))           AS asesor,
      C.ISPROSPECT                     AS isprospect,
      CONVERT(varchar, C.FECHAING, 23) AS fecha`;

const CLIENT_FROM = `
    FROM MTPROCLI C
    LEFT JOIN VENDEN V ON V.CODVEN = C.VENDEDOR`;

function mapClientRow(r: Record<string, unknown>): ErpClientRow {
  return {
    nit: (r.nit as string) ?? "",
    nombre: (r.nombre as string) || "(sin nombre)",
    tipo: r.personanj === 2 ? "Empresa" : "Persona",
    email: (r.email as string) || "",
    telefono: (r.telefono as string) || "",
    ciudad: (r.ciudad as string) || "",
    asesor: (r.asesor as string) || "",
    estado: r.isprospect ? "Prospecto" : "Cliente",
    fechaRegistro: cleanErpDate(r.fecha as string),
  };
}

/** Todas las filas del set filtrado (para exportar a Excel; tope 20.000). */
export async function getErpClientsExport(opts: {
  q?: string;
  codvens?: string[];
  tipo?: ErpClientTipoFiltro;
  sort?: ErpClientSortKey;
  dir?: "asc" | "desc";
}): Promise<ErpClientRow[]> {
  const pool = await getErpPool();
  const request = pool.request();
  const filtro = buildSearch(request, opts.q ?? "");
  const scope = buildCodvenScope(request, opts.codvens);
  const tipoFiltro = buildTipoFilter(opts.tipo);

  const res = await request.query(`
    ${CLIENT_SELECT.replace("SELECT", "SELECT TOP 20000")}
    ${CLIENT_FROM}
    WHERE C.ESCLIENTE = 'S' ${filtro} ${scope} ${tipoFiltro}
    ${buildOrderBy(opts.sort, opts.dir)}`);
  return res.recordset.map(mapClientRow);
}

/** Totales para las tarjetas de resumen (respetan búsqueda y alcance por asesor). */
export async function getErpClientStats(
  q?: string,
  codvens?: string[]
): Promise<ErpClientStats> {
  const pool = await getErpPool();
  const request = pool.request();
  const filtro = buildSearch(request, q ?? "");
  const scope = buildCodvenScope(request, codvens);
  const res = await request.query(`
    SELECT
      COUNT(*)                                                    AS total,
      SUM(CASE WHEN C.PERSONANJ = 2 THEN 1 ELSE 0 END)            AS empresas,
      SUM(CASE WHEN C.PERSONANJ <> 2 OR C.PERSONANJ IS NULL THEN 1 ELSE 0 END) AS personas,
      SUM(CASE WHEN C.ISPROSPECT = 1 THEN 1 ELSE 0 END)          AS prospectos
    FROM MTPROCLI C
    WHERE C.ESCLIENTE = 'S' ${filtro} ${scope}`);
  const r = res.recordset[0] ?? {};
  return {
    total: Number(r.total ?? 0),
    empresas: Number(r.empresas ?? 0),
    personas: Number(r.personas ?? 0),
    prospectos: Number(r.prospectos ?? 0),
  };
}

/** Asesores activos del ERP (VENDEN, HABILITADO=1) para asignar a un cliente. */
export async function getErpAsesores(): Promise<{ codven: string; nombre: string }[]> {
  const pool = await getErpPool();
  const res = await pool.request().query(`
    SELECT LTRIM(RTRIM(CODVEN)) AS codven, LTRIM(RTRIM(NOMBRE)) AS nombre
    FROM VENDEN
    WHERE HABILITADO = 1 AND LTRIM(RTRIM(CODVEN)) NOT IN ('', '0')
    ORDER BY NOMBRE`);
  return res.recordset.map((r) => ({ codven: r.codven, nombre: r.nombre }));
}

/** Resuelve el nombre de asesores del ERP para códigos específicos (VENDEN). */
export async function getErpAsesoresByCodvens(
  codvens: string[]
): Promise<{ codven: string; nombre: string }[]> {
  const clean = [...new Set(codvens.map((c) => c.trim()).filter(Boolean))];
  if (clean.length === 0) return [];
  const pool = await getErpPool();
  const request = pool.request();
  const placeholders = clean.map((c, i) => {
    request.input(`c${i}`, sql.Char(15), c);
    return `@c${i}`;
  });
  const res = await request.query(`
    SELECT LTRIM(RTRIM(CODVEN)) AS codven, LTRIM(RTRIM(NOMBRE)) AS nombre
    FROM VENDEN WHERE LTRIM(RTRIM(CODVEN)) IN (${placeholders.join(", ")})`);
  return res.recordset.map((r) => ({ codven: r.codven, nombre: r.nombre }));
}

/** Listas de precio de venta del ERP (MTPRECIO), excluyendo las de costo. */
export async function getErpPriceLists(): Promise<{ codprecio: string; nombre: string }[]> {
  const pool = await getErpPool();
  const res = await pool.request().query(`
    SELECT LTRIM(RTRIM(CODPRECIO)) AS codprecio, LTRIM(RTRIM(DESCRIPCIO)) AS nombre
    FROM MTPRECIO
    WHERE LTRIM(RTRIM(CODPRECIO)) NOT IN ('CSI', 'CST', 'PAP', 'UPC', '0')
    ORDER BY CODPRECIO`);
  return res.recordset.map((r) => ({ codprecio: r.codprecio, nombre: r.nombre }));
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
        LTRIM(RTRIM(C.VENDEDOR))   AS codven,
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
    codven: clean(r.codven),
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

/**
 * Crea el cliente en el ERP (MTPROCLI) con HABILITADO='0' si el NIT aún no
 * existe (idempotente por PK). INSERT directo: MTPROCLI no tiene triggers ni
 * columnas obligatorias sin default, y las FKs se satisfacen con sus valores por
 * defecto (VENDEDOR/CANAL/CIUDAD='0', PAIS='169', …). Devuelve created=false si
 * el NIT ya existía en el ERP. `esProspecto` marca ISPROSPECT.
 */
export async function insertErpClient(c: {
  nit: string;
  nombre: string;
  esEmpresa: boolean;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  esProspecto: boolean;
  /** Asesor del ERP (VENDEN.CODVEN). Vacío → '0' (VARIOS). */
  codven?: string | null;
  /** Lista de precio del ERP (MTPRECIO.CODPRECIO). Vacío → '2' (PUBLICO). */
  codprecio?: string | null;
}): Promise<{ created: boolean }> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nit", sql.Char(15), fit(c.nit, 15))
    .input("nombre", sql.VarChar(200), fit(c.nombre, 200))
    .input("nom1", sql.Char(30), fit(c.esEmpresa ? c.nombre : c.nombres, 30))
    .input("ape1", sql.Char(30), fit(c.esEmpresa ? "" : c.apellidos, 30))
    .input("email", sql.VarChar(250), fit(c.email, 250))
    .input("tel", sql.Char(30), fit(c.telefono, 30))
    .input("dir", sql.Char(250), fit(c.direccion, 250))
    .input("personanj", sql.Numeric(5, 0), c.esEmpresa ? 2 : 1)
    .input("tipoiden", sql.Char(2), c.esEmpresa ? "01" : "02")
    .input("isprospect", sql.Bit, c.esProspecto ? 1 : 0)
    .input("vendedor", sql.Char(15), fit(c.codven, 15) || "0")
    .input("codprecio", sql.Char(5), fit(c.codprecio, 5) || "2")
    .input("fecha", sql.DateTime, new Date())
    .query(`
      IF NOT EXISTS (SELECT 1 FROM MTPROCLI WHERE NIT = @nit)
      BEGIN
        INSERT INTO MTPROCLI
          (NIT, NOMBRE, NOMBRE1, APELLIDO1, EMAIL, TEL1, DIRECCION,
           PERSONANJ, TIPOIDEN, ESCLIENTE, ESPROVEE, HABILITADO,
           ISPROSPECT, VENDEDOR, CODPRECIO, FECHAING, FECING, PASSWORDIN)
        VALUES
          (@nit, @nombre, @nom1, @ape1, @email, @tel, @dir,
           @personanj, @tipoiden, 'S', 'N', '0',
           @isprospect, @vendedor, @codprecio, @fecha, @fecha, 'JEPHUB');
        SELECT CAST(1 AS int) AS created;
      END
      ELSE SELECT CAST(0 AS int) AS created;`);
  return { created: Number(res.recordset[0]?.created ?? 0) === 1 };
}
