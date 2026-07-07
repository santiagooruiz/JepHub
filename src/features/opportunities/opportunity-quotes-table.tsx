"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Copy, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { quoteEstadoVariant, formatMoney } from "@/features/quotes/types";
import { duplicateQuote } from "@/features/quotes/actions";

export type OpportunityQuoteRow = {
  id: string;
  numero: number;
  registeredBy: string | null;
  total: number;
  vencida: boolean;
  fechaVencimiento: string | null;
  estado: string;
  fechaCreacion: string;
  observacion: string | null;
  actualizadaEl: string;
};

const th = "whitespace-nowrap px-3 py-2 font-medium";
const td = "px-3 py-2";

/** Tabla de cotizaciones del detalle de oportunidad: fila expandible con
 * observaciones + acciones ver / editar / duplicar. */
export function OpportunityQuotesTable({
  quotes,
  canEdit,
  canDuplicate,
}: {
  quotes: OpportunityQuoteRow[];
  canEdit: boolean;
  canDuplicate: boolean;
}) {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  function duplicar(q: OpportunityQuoteRow) {
    confirmDialog(
      `¿Duplicar la cotización N° ${q.numero}? Se creará una copia en «Pendiente cotización».`,
      () =>
        start(async () => {
          const res = await duplicateQuote(q.id);
          if (res.ok) {
            toast.success("Cotización duplicada");
            router.push(`/cotizaciones/${res.id}/editar`);
          } else {
            toast.error(res.error);
          }
        }),
      { actionLabel: "Duplicar", destructive: false }
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th className={`${th} w-8`} />
            <th className={th}>N°</th>
            <th className={th}>Registrado por</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Plazo</th>
            <th className={th}>Estado</th>
            <th className={th}>Fecha creación</th>
            <th className={td} />
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => {
            const open = openId === q.id;
            return (
              <React.Fragment key={q.id}>
                <tr className="border-b last:border-0 hover:bg-muted/20">
                  <td className={`${td} align-middle`}>
                    <button
                      onClick={() => setOpenId(open ? null : q.id)}
                      className={`inline-flex size-6 items-center justify-center rounded-full border ${
                        open
                          ? "border-transparent bg-destructive/10 text-[hsl(var(--destructive))]"
                          : "border-transparent bg-primary/10 text-primary"
                      }`}
                      aria-label={open ? "Ocultar detalle" : "Ver detalle"}
                      aria-expanded={open}
                    >
                      {open ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                    </button>
                  </td>
                  <td className={td}>
                    <Link
                      href={`/cotizaciones/${q.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {q.numero}
                    </Link>
                  </td>
                  <td className={`${td} text-muted-foreground`}>
                    {q.registeredBy ?? "—"}
                  </td>
                  <td className={`${td} tabular text-right whitespace-nowrap`}>
                    {formatMoney(q.total)}
                  </td>
                  <td className={td}>
                    {q.vencida ? (
                      <Badge variant="destructive">Vencida</Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {q.fechaVencimiento ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className={td}>
                    <Badge variant={quoteEstadoVariant(q.estado)}>{q.estado}</Badge>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted-foreground`}>
                    {q.fechaCreacion}
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/cotizaciones/${q.id}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                        aria-label="Ver"
                      >
                        <Eye className="size-4" />
                      </Link>
                      {canEdit && (
                        <Link
                          href={`/cotizaciones/${q.id}/editar`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                          aria-label="Editar"
                        >
                          <Pencil className="size-4" />
                        </Link>
                      )}
                      {canDuplicate && (
                        <button
                          onClick={() => duplicar(q)}
                          disabled={pending}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
                          aria-label="Duplicar"
                          title="Duplicar cotización"
                        >
                          <Copy className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {open && (
                  <tr className="border-b bg-muted/10 last:border-0">
                    <td />
                    <td colSpan={7} className="px-3 py-3 text-sm">
                      <div className="grid gap-1">
                        <div>
                          <span className="font-medium">Observaciones: </span>
                          <span className="text-muted-foreground">
                            {q.observacion || "Sin observaciones."}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Actualizada el {q.actualizadaEl}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
