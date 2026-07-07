// Cliente del ERP "ofimática". Contrato real (definido 2026-07): conexión
// directa a la BD SQL Server del ERP (ver docs/INTEGRACION-OFIMATICA.md).
//   - Pedido  = TRADE con ORIGEN='FAC' y TIPODCTO='PD' (+ renglones en MVTRADE).
//   - Hitos   = fechas ZFTAPI / ZFLISTO / ZFDESPA en TRADEMAS, relacionada con
//     TRADE por (ORIGEN, TIPODCTO, NRODCTO). '1900-01-01' significa "sin registrar".
// Si el .env no trae OFIMATICA_DB_*, se usa el cliente simulado (dev).

import { getErpPool, isErpDbConfigured, sql } from "./db";
import type { Hito } from "./types";

export const ERP_ORIGEN = "FAC";
export const ERP_TIPODCTO = "PD";

export type ErpOrderLineInput = {
  referencia: string | null;
  descripcion: string | null;
  cantidad: number;
  precio: number;
  total: number;
};

export type ErpOrderInput = {
  id: string;
  numero: number;
  quoteNumero: number | null;
  total: number;
  subtotal?: number;
  impuesto?: number;
  /** NIT / documento del cliente. */
  nit?: string | null;
  clientName?: string | null;
  /** Código de vendedor en ofimática (User.codven). */
  codven?: string | null;
  ordenCompra?: string | null;
  direccionEnvio?: string | null;
  items?: ErpOrderLineInput[];
};

export type ErpSendResult = {
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
      nPedidoOfimatica: `OF-${order.numero}${yy}`,
      identificadorCotizacion: order.quoteNumero ? `CTZ-${order.quoteNumero}` : `PED-${order.numero}`,
      fechaCreacion: new Date().toISOString(),
    };
  }
}

/** Recorta a la longitud del char(n) destino (el ERP no acepta overflow). */
function fit(value: string | null | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Cliente real: inserta el pedido en la BD del ERP dentro de una transacción
 * (cabecera TRADE + renglones MVTRADE + fila TRADEMAS para los hitos).
 * El consecutivo se toma como MAX(NRODCTO numérico)+1 de los pedidos FAC/PD,
 * serializado con UPDLOCK/HOLDLOCK para evitar duplicados concurrentes.
 *
 * La BD del ERP exige integridad referencial contra sus maestros:
 * NIT → MTPROCLI, CODVEN → VENDEN, PRODUCTO → MTMERCIA. Se valida antes de
 * insertar para fallar con un error accionable (queda en ErpSync.ultimoError).
 */
export class OfimaticaDbClient implements ErpClient {
  private async validateMasters(pool: sql.ConnectionPool, order: ErpOrderInput, nit: string) {
    if (!nit) {
      throw new Error("El pedido no tiene NIT de cliente (requerido por ofimática).");
    }
    const nitOk = await pool
      .request()
      .input("nit", sql.Char(15), nit)
      .query("SELECT 1 AS ok FROM MTPROCLI WHERE NIT = @nit");
    if (!nitOk.recordset.length) {
      throw new Error(`El cliente con NIT "${nit}" no existe en ofimática (maestro MTPROCLI).`);
    }

    const codven = fit(order.codven, 15);
    if (codven) {
      const venOk = await pool
        .request()
        .input("codven", sql.Char(15), codven)
        .query("SELECT 1 AS ok FROM VENDEN WHERE CODVEN = @codven");
      if (!venOk.recordset.length) {
        throw new Error(`El vendedor "${codven}" no existe en ofimática (maestro VENDEN).`);
      }
    }

    const items = order.items ?? [];
    const faltantes: string[] = [];
    for (const it of items) {
      const ref = fit(it.referencia, 20);
      if (!ref) {
        throw new Error("Hay renglones del pedido sin referencia de producto (requerida por ofimática).");
      }
      const prodOk = await pool
        .request()
        .input("ref", sql.Char(20), ref)
        .query("SELECT 1 AS ok FROM MTMERCIA WHERE CODIGO = @ref");
      if (!prodOk.recordset.length) faltantes.push(ref);
    }
    if (faltantes.length) {
      throw new Error(
        `Referencias sin crear en ofimática (maestro MTMERCIA): ${[...new Set(faltantes)].join(", ")}.`
      );
    }
  }

  async sendOrder(order: ErpOrderInput): Promise<ErpSendResult> {
    const pool = await getErpPool();
    const nit = fit(order.nit, 15);
    await this.validateMasters(pool, order, nit);

    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const maxRes = await new sql.Request(tx).query(`
        SELECT MAX(TRY_CAST(LTRIM(RTRIM(NRODCTO)) AS int)) AS maxN
        FROM TRADE WITH (UPDLOCK, HOLDLOCK)
        WHERE ORIGEN = '${ERP_ORIGEN}' AND TIPODCTO = '${ERP_TIPODCTO}'
          AND TRY_CAST(LTRIM(RTRIM(NRODCTO)) AS int) IS NOT NULL`);
      const nro = String((maxRes.recordset[0]?.maxN ?? 0) + 1);

      const now = new Date();
      const hora = now.toTimeString().slice(0, 8);
      const codven = fit(order.codven, 15);

      // CODVEN es FK a VENDEN: si el pedido no trae vendedor, se omite la
      // columna para que aplique el default del ERP.
      const headReq = new sql.Request(tx)
        .input("nro", sql.Char(10), nro)
        .input("fecha", sql.DateTime, now)
        .input("hora", sql.Char(8), hora)
        .input("nit", sql.Char(15), nit)
        .input("bruto", sql.Numeric(18, 2), order.subtotal ?? order.total)
        .input("iva", sql.Numeric(18, 2), order.impuesto ?? 0)
        .input("dir", sql.Char(200), fit(order.direccionEnvio, 200))
        .input("orden", sql.Char(20), fit(order.ordenCompra, 20))
        .input("nota", sql.Char(250), fit(`JEP-Hub pedido N° ${order.numero}`, 250));
      if (codven) headReq.input("codven", sql.Char(15), codven);
      await headReq.query(`
        INSERT INTO TRADE (ORIGEN, TIPODCTO, NRODCTO, FECHA, HORA, NIT,
                           BRUTO, IVABRUTO, DIR, ORDEN, NOTA, PASSWORDIN${codven ? ", CODVEN" : ""})
        VALUES ('${ERP_ORIGEN}', '${ERP_TIPODCTO}', @nro, @fecha, @hora, @nit,
                @bruto, @iva, @dir, @orden, @nota, 'JEPHUB'${codven ? ", @codven" : ""})`);

      const items = order.items ?? [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const lineReq = new sql.Request(tx)
          .input("nro", sql.Char(10), nro)
          .input("consecut", sql.Numeric(18, 0), i + 1)
          .input("producto", sql.Char(20), fit(it.referencia, 20))
          .input("detalle", sql.Char(250), fit(it.descripcion, 250))
          .input("nombre", sql.Char(250), fit(order.clientName, 250))
          .input("cantidad", sql.Numeric(18, 2), it.cantidad)
          .input("valorunit", sql.Numeric(18, 2), it.precio)
          .input("vlrventa", sql.Numeric(18, 2), it.total)
          .input("nit", sql.Char(15), nit)
          .input("fecha", sql.DateTime, now);
        if (codven) lineReq.input("vendedor", sql.Char(15), codven);
        await lineReq.query(`
          INSERT INTO MVTRADE (ORIGEN, TIPODCTO, NRODCTO, CONSECUT, PRODUCTO, DETALLE,
                               NOMBRE, CANTIDAD, VALORUNIT, VLRVENTA, NIT, FECHA${codven ? ", VENDEDOR" : ""})
          VALUES ('${ERP_ORIGEN}', '${ERP_TIPODCTO}', @nro, @consecut, @producto, @detalle,
                  @nombre, @cantidad, @valorunit, @vlrventa, @nit, @fecha${codven ? ", @vendedor" : ""})`);
      }

      // Fila de TRADEMAS donde el ERP registrará los hitos de producción.
      await new sql.Request(tx).input("nro", sql.Char(10), nro).query(`
        IF NOT EXISTS (SELECT 1 FROM TRADEMAS
                       WHERE ORIGEN = '${ERP_ORIGEN}' AND TIPODCTO = '${ERP_TIPODCTO}' AND NRODCTO = @nro)
          INSERT INTO TRADEMAS (ORIGEN, TIPODCTO, NRODCTO) VALUES ('${ERP_ORIGEN}', '${ERP_TIPODCTO}', @nro)`);

      await tx.commit();

      return {
        nPedidoOfimatica: nro,
        identificadorCotizacion: order.quoteNumero
          ? `CTZ-${order.quoteNumero}`
          : `PED-${order.numero}`,
        fechaCreacion: now.toISOString(),
      };
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }
}

/** Fechas de hitos registradas en el ERP para un pedido (null = sin registrar). */
export async function fetchErpMilestones(
  nPedidoOfimatica: string
): Promise<Record<Hito, Date | null> | null> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("nro", sql.Char(10), nPedidoOfimatica.trim())
    .query(`
      SELECT ZFTAPI, ZFLISTO, ZFDESPA
      FROM TRADEMAS
      WHERE ORIGEN = '${ERP_ORIGEN}' AND TIPODCTO = '${ERP_TIPODCTO}' AND NRODCTO = @nro`);
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
