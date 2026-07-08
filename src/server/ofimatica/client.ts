// Cliente del ERP "ofimática". Contrato real (definido 2026-07): conexión
// directa a la BD SQL Server del ERP (ver docs/INTEGRACION-OFIMATICA.md).
//
// ⛔ REGLA DURA: JEP-Hub SOLO inserta cotizaciones TIPODCTO='CV' (ORIGEN='FAC'),
//    NUNCA pedidos 'PD'/'PX'. La inserción se hace EXCLUSIVAMENTE mediante los
//    stored procedures del ERP (jamás con INSERT directo a TRADE/MVTRADE):
//      1. sp_gen_trade_generico_distribuidores  → cabecera (devuelve NRODCTO)
//      2. sp_gen_mvTrade_Generico_Distri        → cada renglón
//      3. Calculos_Trade                        → recalcula totales
//    Réplica del flujo probado en producción (PHP registrarEncabezado).
//
// Los hitos de producción (ZFTAPI/ZFLISTO/ZFDESPA en TRADEMAS) son de SOLO
// LECTURA. Si el .env no trae OFIMATICA_DB_*, se usa el cliente simulado (dev).

import { getErpPool, isErpDbConfigured, sql } from "./db";
import type { Hito } from "./types";

export const ERP_ORIGEN = "FAC";
/** Único TIPODCTO que JEP-Hub puede INSERTAR (cotización). */
export const ERP_TIPODCTO_COTIZACION = "CV";
/** TIPODCTO de pedido — solo para LECTURA de hitos; jamás para insertar. */
export const ERP_TIPODCTO_PEDIDO = "PD";
/** Tipos que JEP-Hub tiene PROHIBIDO insertar. */
export const ERP_TIPODCTO_PROHIBIDOS = ["PD", "PX"] as const;

export type ErpOrderLineInput = {
  /** Código de producto (FK a MTMERCIA.CODIGO en el ERP). */
  referencia: string | null;
  descripcion: string | null;
  cantidad: number;
  precio: number;
  total: number;
  /** Nota del renglón (opcional). */
  nota?: string | null;
};

export type ErpOrderInput = {
  id: string;
  numero: number;
  quoteNumero: number | null;
  total: number;
  subtotal?: number;
  impuesto?: number;
  /** NIT / documento del cliente (FK a MTPROCLI.NIT). */
  nit?: string | null;
  clientName?: string | null;
  ordenCompra?: string | null;
  direccionEnvio?: string | null;
  items?: ErpOrderLineInput[];
};

export type ErpSendResult = {
  /** NRODCTO de la cotización CV generada por el ERP. */
  nPedidoOfimatica: string;
  identificadorCotizacion: string;
  fechaCreacion: string; // ISO
};

export interface ErpClient {
  sendOrder(order: ErpOrderInput): Promise<ErpSendResult>;
}

/** Implementación simulada: genera identificadores y una fecha de creación. */
export class MockErpClient implements ErpClient {
  async sendOrder(order: ErpOrderInput): Promise<ErpSendResult> {
    // Latencia simulada del ERP.
    await new Promise((r) => setTimeout(r, 300));
    const yy = String(new Date().getFullYear()).slice(2);
    return {
      nPedidoOfimatica: `CV-${order.numero}${yy}`,
      identificadorCotizacion: order.quoteNumero ? `CTZ-${order.quoteNumero}` : `COT-${order.numero}`,
      fechaCreacion: new Date().toISOString(),
    };
  }
}

/** Recorta a la longitud del char(n) destino (el ERP no acepta overflow). */
function fit(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/** Configuración específica del ERP con defaults observados en CV reales. */
function erpConfig() {
  return {
    // Usuario/estampa del ERP (PASSWORDIN). PHP usaba $_SESSION['usuario'].
    passwordin: fit(process.env.OFIMATICA_PASSWORDIN || "JEPHUB", 20),
    // Centro de costo (existe en CENTCOS).
    codcc: fit(process.env.OFIMATICA_CODCC || "051501", 15),
    // Bodega base por defecto (se sobreescribe por TIPOINV del producto).
    bodega: fit(process.env.OFIMATICA_BODEGA || "PTCAL", 20),
    // Código de tarifa de IVA y porcentaje (líneas CV usan '0'/19).
    tariva: fit(process.env.OFIMATICA_TARIVA || "0", 5),
    poriva: Number(process.env.OFIMATICA_PORIVA || 19),
  };
}

/** Mapeo bodega por tipo de inventario del producto (réplica del PHP). */
function bodegaPorTipoInv(tipoinv: string, base: string): string {
  switch (tipoinv.trim()) {
    case "01":
      return "MPACO";
    case "03":
      return "PTCAL";
    case "07":
    case "08":
      return "NOFABRI";
    default:
      return base;
  }
}

/**
 * Cliente real: crea una COTIZACIÓN (CV) en el ERP vía sus stored procedures.
 * Deriva del maestro de terceros (MTPROCLI) los mismos campos que el flujo PHP
 * y valida contra los maestros antes de ejecutar, para fallar con un mensaje
 * accionable (queda en ErpSync.ultimoError) en vez de a mitad de la inserción.
 */
export class OfimaticaDbClient implements ErpClient {
  async sendOrder(order: ErpOrderInput): Promise<ErpSendResult> {
    const cfg = erpConfig();
    const tipodcto = ERP_TIPODCTO_COTIZACION;

    // Guard defensivo: bajo ninguna circunstancia insertar PD/PX.
    if ((ERP_TIPODCTO_PROHIBIDOS as readonly string[]).includes(tipodcto)) {
      throw new Error(`REGLA VIOLADA: JEP-Hub no puede insertar TIPODCTO='${tipodcto}'.`);
    }

    const nit = fit(order.nit, 15);
    if (!nit) throw new Error("El pedido no tiene NIT de cliente (requerido por ofimática).");

    const pool = await getErpPool();

    // 1. Datos del cliente desde MTPROCLI (vendedor, cuenta, ciudad, retención…).
    const cliRes = await pool
      .request()
      .input("nit", sql.Char(15), nit)
      .query(`
        SELECT LTRIM(RTRIM(VENDEDOR)) AS VENDEDOR, LTRIM(RTRIM(CODIGOCTA)) AS CODIGOCTA,
               LTRIM(RTRIM(CIUDADPRV)) AS CIUDADPRV, LTRIM(RTRIM(TIPOCAR)) AS TIPOCAR,
               LTRIM(RTRIM(TIPOPER)) AS TIPOPER, LTRIM(RTRIM(CODRETE)) AS CODRETE
        FROM MTPROCLI WHERE NIT = @nit`);
    const cli = cliRes.recordset[0];
    if (!cli) {
      throw new Error(`El cliente con NIT "${nit}" no existe en ofimática (maestro MTPROCLI).`);
    }

    // 2. Retención (PRETE/TOPE) por CODRETE desde MTTOPRTE.
    let prete = "0";
    let tope = "0";
    if (cli.CODRETE) {
      const retRes = await pool
        .request()
        .input("codrete", sql.Char(5), cli.CODRETE)
        .query("SELECT PRETE, TOPE FROM MTTOPRTE WHERE CODRETE = @codrete");
      if (retRes.recordset[0]) {
        prete = String(retRes.recordset[0].PRETE ?? 0);
        tope = String(retRes.recordset[0].TOPE ?? 0);
      }
    }

    // 3. Validar productos y precargar su TIPOINV (para la bodega).
    const items = order.items ?? [];
    if (items.length === 0) throw new Error("La cotización no tiene renglones.");
    const tipoInvByRef = new Map<string, string>();
    const faltantes: string[] = [];
    for (const it of items) {
      const ref = fit(it.referencia, 20);
      if (!ref) throw new Error("Hay renglones sin referencia de producto (requerida por ofimática).");
      if (tipoInvByRef.has(ref)) continue;
      const prodRes = await pool
        .request()
        .input("ref", sql.Char(20), ref)
        .query("SELECT LTRIM(RTRIM(TIPOINV)) AS TIPOINV FROM MTMERCIA WHERE CODIGO = @ref");
      if (!prodRes.recordset[0]) faltantes.push(ref);
      else tipoInvByRef.set(ref, prodRes.recordset[0].TIPOINV ?? "");
    }
    if (faltantes.length) {
      throw new Error(
        `Referencias sin crear en ofimática (maestro MTMERCIA): ${[...new Set(faltantes)].join(", ")}.`
      );
    }

    const now = new Date();
    const hora = now.toTimeString().slice(0, 8);

    // 4. Cabecera → sp_gen_trade_generico_distribuidores (devuelve NRODCTO).
    // Los nombres de input DEBEN coincidir con los parámetros del SP (mssql liga
    // por nombre, no por posición como el PHP con PDO).
    const headRes = await pool
      .request()
      .input("pOrigen", sql.Char(3), ERP_ORIGEN)
      .input("pTipodctoGenerar", sql.Char(2), tipodcto)
      .input("pFecha", sql.DateTime, now)
      .input("Pnit", sql.Char(15), nit)
      .input("Porden", sql.Char(10), fit(order.ordenCompra, 10))
      .input("pPassword", sql.Char(20), cfg.passwordin)
      .input("pCodven", sql.Char(10), fit(cli.VENDEDOR, 10))
      .input("pTipovta", sql.Char(10), "1")
      .input("pCodcc", sql.Char(15), cfg.codcc)
      .input("pCodigoCta", sql.Char(15), fit(cli.CODIGOCTA, 15))
      .input("pACTIVA", sql.Char(15), "0")
      .input("pAUTORET", sql.Char(15), "0")
      .input("pCALRETE", sql.Char(15), "0")
      .input("pCALRETICA", sql.Char(15), "0")
      .input("pCIUDADCLI", sql.Char(15), fit(cli.CIUDADPRV, 15))
      .input("pCTRLCORIG", sql.Char(15), "1")
      .input("pCTRTOPES", sql.Char(15), "1")
      .input("pDECIMALES", sql.Char(15), "2")
      .input("pFACTORSUS", sql.Char(15), "83.3334")
      .input("pHORA", sql.Char(15), hora)
      .input("pMOTIVOTRAS", sql.Char(15), "")
      .input("pPRIORIDAD", sql.Char(15), "0")
      .input("pRESPICA", sql.Char(15), "0")
      .input("pTIPOCAR", sql.Char(15), fit(cli.TIPOCAR, 15))
      .input("pTIPOPER", sql.Char(15), fit(cli.TIPOPER, 15))
      .input("pNUMCUOTAS", sql.Char(10), "0")
      .execute("sp_gen_trade_generico_distribuidores");

    const headRow = (headRes.recordset?.[0] ?? {}) as Record<string, unknown>;
    const nroKey = Object.keys(headRow).find((k) => k.toLowerCase() === "nrodcto");
    const nro = nroKey ? String(headRow[nroKey]).trim() : "";
    if (!nro) {
      throw new Error("sp_gen_trade_generico_distribuidores no devolvió NRODCTO.");
    }

    // 5. Renglones → sp_gen_mvTrade_Generico_Distri (uno por producto).
    let zrenglon = 1;
    for (const it of items) {
      const ref = fit(it.referencia, 20);
      const bodega = bodegaPorTipoInv(tipoInvByRef.get(ref) ?? "", cfg.bodega);
      await pool
        .request()
        .input("pOrigen", sql.Char(3), ERP_ORIGEN)
        .input("pTipodctoGenerar", sql.Char(2), tipodcto)
        .input("pNrodctoGenerar", sql.Char(10), nro)
        .input("Pproducto", sql.Char(20), ref)
        .input("Pcantidad", sql.Numeric(18, 2), it.cantidad)
        .input("Pvalorunit", sql.Numeric(18, 2), it.precio)
        .input("Pbodega", sql.Char(20), bodega)
        .input("pPassword", sql.Char(20), cfg.passwordin)
        .input("pNota", sql.Char(60), fit(it.nota ?? it.descripcion, 60))
        .input("pTarIva", sql.Char(5), cfg.tariva)
        .input("pIva", sql.Numeric(5, 2), cfg.poriva)
        .input("zRenglon", sql.Char(10), String(zrenglon))
        .input("pCODRETE", sql.Char(10), fit(cli.CODRETE, 10))
        .input("pPORRETE", sql.Char(10), prete)
        .input("pTOPRETE", sql.Char(10), tope)
        .input("pCODCC", sql.Char(10), cfg.codcc)
        .input("pPLANPED", sql.Char(10), "1")
        .execute("sp_gen_mvTrade_Generico_Distri");
      zrenglon++;
    }

    // 6. Recalcular totales de la cotización.
    await pool
      .request()
      .input("pOrigen", sql.Char(3), ERP_ORIGEN)
      .input("pTipoDcto", sql.Char(2), tipodcto)
      .input("pNroDcto", sql.Char(10), nro)
      .execute("Calculos_Trade");

    return {
      nPedidoOfimatica: nro,
      identificadorCotizacion: order.quoteNumero ? `CTZ-${order.quoteNumero}` : `COT-${order.numero}`,
      fechaCreacion: now.toISOString(),
    };
  }
}

/**
 * Fechas de hitos registradas en el ERP para un documento (null = sin registrar).
 * Los hitos viven en el PEDIDO (TIPODCTO='PD') generado por el ERP a partir de la
 * cotización — ver docs/INTEGRACION-OFIMATICA.md (enlace CV→PD pendiente).
 */
export async function fetchErpMilestones(
  nrodcto: string,
  tipodcto: string = ERP_TIPODCTO_PEDIDO
): Promise<Record<Hito, Date | null> | null> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nro", sql.Char(10), nrodcto.trim())
    .input("tipo", sql.Char(2), tipodcto)
    .query(`
      SELECT ZFTAPI, ZFLISTO, ZFDESPA
      FROM TRADEMAS
      WHERE ORIGEN = '${ERP_ORIGEN}' AND TIPODCTO = @tipo AND NRODCTO = @nro`);
  const row = res.recordset[0];
  if (!row) return null;

  // El ERP usa '1900-01-01' como "sin fecha".
  const real = (d: Date | null): Date | null =>
    d && d.getTime() > Date.UTC(1901, 0, 1) ? d : null;
  return { tapiceria: real(row.ZFTAPI), listo: real(row.ZFLISTO), despacho: real(row.ZFDESPA) };
}

export function getErpClient(): ErpClient {
  return isErpDbConfigured() ? new OfimaticaDbClient() : new MockErpClient();
}

export { isErpDbConfigured };
