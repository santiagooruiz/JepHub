// Lectura en vivo de ACABADOS desde el ERP (solo lectura).
//
// Modelo en ofimática:
// - ZPROACA: qué acabados lleva cada producto (PRODUCTO → ACABADO, donde
//   ACABADO es el código de ZACABADOS: 002=HERRAJE, 003=FORMICA, 004=CANTO…).
//   Un producto puede tener 0, 1 o varios acabados.
// - Las opciones ("colores") de un acabado son ítems reales de MTMERCIA cuyo
//   CLASIFICA2 = código del acabado, con su color en MT1CLAF (CLASIFICA1).

import { getErpPool, sql } from "./db";

export type ErpAcabadoProducto = {
  /** Código del acabado (ZACABADOS.CODIGO, ej. "003"). */
  codigo: string;
  /** Nombre del acabado (ej. "FORMICA"). */
  nombre: string;
};

export type ErpAcabadoOpcion = {
  /** Código del material elegido (MTMERCIA.CODIGO, ej. "F8"). */
  codigo: string;
  /** Descripción del material (DESCRIPCIO, capitalizada). */
  nombre: string;
  /** Color del material (MT1CLAF.NOMBRE); "varios" cuando no aplica. */
  color: string;
};

/**
 * true si el producto es "de área" (MTMERCIA.CODSBLIN = 'AREA'): sus renglones
 * llevan largo/ancho/figura (MVTRADE.ZLARGO/ZANCHO/ZFIGURA).
 */
export async function getErpEsArea(referencia: string): Promise<boolean> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("ref", sql.VarChar(20), referencia.trim())
    .query(`
      SELECT LTRIM(RTRIM(CODSBLIN)) AS codsblin
      FROM MTMERCIA WHERE CODIGO = @ref`);
  return (res.recordset[0]?.codsblin as string | undefined)?.toUpperCase() === "AREA";
}

/** Acabados que lleva un producto según el ERP (ZPROACA + ZACABADOS). */
export async function getErpAcabadosDeProducto(
  referencia: string
): Promise<ErpAcabadoProducto[]> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("ref", sql.VarChar(20), referencia.trim())
    .query(`
      SELECT DISTINCT
        LTRIM(RTRIM(P.ACABADO)) AS codigo,
        LTRIM(RTRIM(Z.NOMBRE))  AS nombre
      FROM ZPROACA P
        INNER JOIN ZACABADOS Z ON P.ACABADO = Z.CODIGO
      WHERE LTRIM(RTRIM(P.PRODUCTO)) = @ref
      ORDER BY 1`);
  return res.recordset.map((r) => ({
    codigo: (r.codigo as string) ?? "",
    nombre: (r.nombre as string) ?? "",
  }));
}

/**
 * Opciones (materiales/colores) disponibles para un acabado: ítems habilitados
 * de MTMERCIA con CLASIFICA2 = código del acabado. Se excluye el ítem genérico
 * cuyo código coincide con el del acabado (placeholder del ERP).
 */
export async function getErpOpcionesAcabado(
  codigoAcabado: string
): Promise<ErpAcabadoOpcion[]> {
  const pool = await getErpPool();
  const res = await pool
    .request()
    .input("cod", sql.VarChar(15), codigoAcabado.trim())
    .query(`
      SELECT
        LTRIM(RTRIM(MT.CODIGO)) AS codigo,
        LTRIM(RTRIM(UPPER(SUBSTRING(MT.DESCRIPCIO, 1, 1)) +
          LOWER(SUBSTRING(MT.DESCRIPCIO, 2, LEN(MT.DESCRIPCIO))))) AS nombre,
        LTRIM(RTRIM(CL.NOMBRE)) AS color
      FROM MTMERCIA MT
        INNER JOIN ZACABADOS Z ON MT.CLASIFICA2 = Z.CODIGO
        INNER JOIN MT1CLAF CL ON MT.CLASIFICA1 = CL.CODIGO
      WHERE MT.HABILITADO = 1 AND MT.ESPRODUCTO = 1
        AND MT.CLASIFICA2 = @cod
        AND LTRIM(RTRIM(MT.CODIGO)) <> LTRIM(RTRIM(@cod))
      ORDER BY 2`);
  return res.recordset.map((r) => ({
    codigo: (r.codigo as string) ?? "",
    nombre: (r.nombre as string) ?? "",
    color: (r.color as string) ?? "",
  }));
}
