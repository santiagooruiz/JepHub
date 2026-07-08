import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Building2, Truck, Wallet, Users, Mail, MapPin, Phone } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/features/quotes/types";
import {
  getErpClientByNit,
  getErpClientCartera,
  getErpClientDocuments,
} from "@/server/ofimatica/clients";
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

  const [cartera, { summary, recent }] = await Promise.all([
    getErpClientCartera(nit),
    getErpClientDocuments(nit),
  ]);

  const agingItems = [
    { label: "Por vencer", value: cartera.aging.porVencer },
    { label: "1–30 días", value: cartera.aging.d0_30 },
    { label: "31–60", value: cartera.aging.d31_60 },
    { label: "61–90", value: cartera.aging.d61_90 },
    { label: "+90 días", value: cartera.aging.d91 },
  ];

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
        {/* Izquierda: ficha + contactos */}
        <div className="space-y-6">
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

          {c.contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <Users className="mr-1 inline size-4 opacity-70" /> Contactos ({c.contacts.length})
                </CardTitle>
              </CardHeader>
              <div className="space-y-3 px-4 pb-4">
                {c.contacts.map((ct, i) => (
                  <div key={i} className="rounded-md border p-2.5 text-sm">
                    <p className="font-medium">{ct.nombre}</p>
                    {ct.cargo && <p className="text-xs text-muted-foreground">{ct.cargo}</p>}
                    {ct.telefono && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="size-3.5" /> {ct.telefono}
                      </p>
                    )}
                    {ct.direccion &&
                      (ct.direccion.includes("@") ? (
                        <p className="mt-0.5 flex items-center gap-1.5 break-all text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" /> {ct.direccion.toLowerCase()}
                        </p>
                      ) : (
                        <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" /> {ct.direccion}
                        </p>
                      ))}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Derecha: cartera + historial */}
        <div className="space-y-6">
          {/* Cartera */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Wallet className="mr-1 inline size-4 opacity-70" /> Cartera
              </CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
              {cartera.totalSaldo > 0 ? (
                <>
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Saldo pendiente</p>
                      <p className="tabular text-2xl font-bold text-destructive">
                        {formatMoney(cartera.totalSaldo)}
                      </p>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                      {agingItems.map((a) => (
                        <div key={a.label} className="rounded-md border px-2 py-1">
                          <p className="text-muted-foreground">{a.label}</p>
                          <p className="tabular mt-0.5 font-medium">{formatMoney(a.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-3 py-2 font-medium">Documento</th>
                          <th className="px-3 py-2 font-medium">Vencimiento</th>
                          <th className="px-3 py-2 text-right font-medium">Días vencido</th>
                          <th className="px-3 py-2 text-right font-medium">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartera.docs.map((d) => (
                          <tr key={`${d.tipo}-${d.documento}`} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              {d.documento} <span className="text-muted-foreground">({d.tipo})</span>
                            </td>
                            <td className="tabular px-3 py-2 text-muted-foreground">{d.fVencim || "—"}</td>
                            <td className="tabular px-3 py-2 text-right">
                              {d.diasVenc > 0 ? (
                                <span className="text-destructive">{d.diasVenc}</span>
                              ) : (
                                <span className="text-muted-foreground">{d.diasVenc}</span>
                              )}
                            </td>
                            <td className="tabular px-3 py-2 text-right font-medium">
                              {formatMoney(d.saldo)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Sin cartera pendiente.
                </p>
              )}
            </div>
          </Card>

          {/* Historial comercial */}
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
                            {s.label} <span className="text-muted-foreground">({s.tipo})</span>
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
