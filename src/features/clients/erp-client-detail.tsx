import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Building2, Truck } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/features/quotes/types";
import { getErpClientByNit, getErpClientDocuments } from "@/server/ofimatica/clients";
import { estadoVariant } from "./types";

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-words">{value || "—"}</span>
    </div>
  );
}

const cellCls = "px-3 align-middle";
const cellStyle: React.CSSProperties = {
  paddingTop: "var(--cell-py)",
  paddingBottom: "var(--cell-py)",
};

export async function ErpClientDetail({ nit }: { nit: string }) {
  const c = await getErpClientByNit(nit);
  if (!c) notFound();

  const { summary, recent } = await getErpClientDocuments(nit);

  return (
    <div>
      <Link
        href="/clientes"
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{c.nombre}</h1>
        <Badge variant="secondary">{c.tipo}</Badge>
        <Badge variant={estadoVariant(c.estado)}>{c.estado}</Badge>
        {c.esProveedor && (
          <Badge variant="muted">
            <Truck className="size-3" /> También proveedor
          </Badge>
        )}
        {!c.habilitado && <Badge variant="destructive">Inhabilitado</Badge>}
        <span className="ml-auto text-sm text-muted-foreground">Datos en vivo desde el ERP</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Izquierda: ficha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Building2 className="mr-1 inline size-4 opacity-70" /> Información
            </CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
            <Row label="Documento (NIT)" value={c.nit} />
            <Row label="Tipo" value={c.tipo === "Empresa" ? "Persona Jurídica" : "Persona Natural"} />
            <Row label="Email" value={c.email} />
            {c.emailAlt && <Row label="Email alterno" value={c.emailAlt} />}
            <Row label="Teléfono" value={c.tel1} />
            {c.tel2 && <Row label="Teléfono 2" value={c.tel2} />}
            <Row label="Dirección" value={c.direccion} />
            <Row label="Ciudad" value={c.ciudad} />
            {c.web && <Row label="Página web" value={c.web} />}
            <Row label="Asesor" value={c.asesor} />
            {c.canal && <Row label="Canal" value={c.canal} />}
            <Row label="Plazo" value={c.plazo > 0 ? `${c.plazo} días` : null} />
            <Row label="Cupo crédito" value={c.cupoCredito > 0 ? formatMoney(c.cupoCredito) : null} />
            <Row label="Fecha ingreso" value={c.fechaIngreso} />
          </div>
        </Card>

        {/* Derecha: historial comercial */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen comercial</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              {summary.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-3 py-2 font-medium">Documento</th>
                        <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                        <th className="px-3 py-2 text-right font-medium">Valor total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((s) => (
                        <tr key={s.tipo} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            {s.label}{" "}
                            <span className="text-muted-foreground">({s.tipo})</span>
                          </td>
                          <td className="tabular px-3 py-2 text-right">{s.count}</td>
                          <td className="tabular px-3 py-2 text-right">{formatMoney(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin documentos en el ERP.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos recientes</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              {recent.length ? (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="whitespace-nowrap px-3 font-medium" style={{ height: "var(--row-h)" }}>
                          Documento
                        </th>
                        <th className="px-3 font-medium">N°</th>
                        <th className="px-3 font-medium">Fecha</th>
                        <th className="px-3 text-right font-medium">Valor</th>
                        <th className="px-3 font-medium">Orden compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((d) => (
                        <tr key={`${d.tipo}-${d.numero}`} className="border-b last:border-0 hover:bg-muted/20">
                          <td className={cellCls} style={cellStyle}>
                            {d.label} <span className="text-muted-foreground">({d.tipo})</span>
                          </td>
                          <td className={`tabular ${cellCls}`} style={cellStyle}>
                            {d.numero}
                          </td>
                          <td className={`tabular ${cellCls} text-muted-foreground`} style={cellStyle}>
                            {d.fecha || "—"}
                          </td>
                          <td className={`tabular ${cellCls} text-right`} style={cellStyle}>
                            {formatMoney(d.valor)}
                          </td>
                          <td className={`${cellCls} text-muted-foreground`} style={cellStyle}>
                            {d.orden || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Sin documentos recientes.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
