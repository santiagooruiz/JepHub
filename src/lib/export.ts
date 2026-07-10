// Exportación a Excel desde el navegador. Genera un CSV con BOM UTF-8 y
// separador ";" (convención es-CO): Excel lo abre directamente con las
// columnas separadas y los acentos correctos.

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replaceAll('"', '""')}"`;
}

/** Descarga `rows` como archivo Excel-compatible (`<nombre>-YYYY-MM-DD.csv`). */
export function downloadExcel(
  nombre: string,
  headers: string[],
  rows: unknown[][]
) {
  const csv =
    "﻿" +
    [headers.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))].join(
      "\r\n"
    );
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
