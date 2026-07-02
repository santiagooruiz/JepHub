import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/guard";
import { cn } from "@/lib/utils";
import {
  listAdvisors,
  calendarEvents,
  biCotizaciones,
  biPedidos,
  biSeguimiento,
  parsePeriod,
  periodFrom,
} from "@/features/reports/queries";
import { ActivityCalendar } from "@/features/reports/calendar";
import { BiFilterBar } from "@/features/reports/filter-bar";
import {
  BiCotizacionesBoard,
  BiPedidosBoard,
  BiSeguimientoBoard,
} from "@/features/reports/boards";

export const dynamic = "force-dynamic";

const DEFAULT_TIPOS = [
  "Llamada", "Visita", "Email", "Observación", "Registrar",
  "Enviada", "Aprobado", "Perdida", "Detenido", "Denegado",
];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; periodo?: string; asesor?: string }>;
}) {
  const user = await requireUser();
  const can = (a: string) => user.ability.can(a, "reports");

  const tabs = [
    { id: "calendario", label: "Calendario", show: can("calendar") },
    { id: "cotizaciones", label: "BI Cotizaciones", show: can("bi_quotes") },
    { id: "pedidos", label: "BI Pedidos", show: can("bi_orders") },
    { id: "seguimiento", label: "BI Seguimiento", show: can("bi_tracking") },
  ].filter((t) => t.show);

  if (!tabs.length) redirect("/dashboard");

  const sp = await searchParams;
  const active = tabs.find((t) => t.id === sp.tab)?.id ?? tabs[0].id;
  const period = parsePeriod(sp.periodo);
  const from = periodFrom(period);
  const asesorId = sp.asesor || null;
  const isBi = active !== "calendario";

  const advisors = await listAdvisors(user.companyId);
  const mkHref = (tabId: string) => {
    const params = new URLSearchParams();
    params.set("tab", tabId);
    if (sp.periodo) params.set("periodo", sp.periodo);
    if (sp.asesor) params.set("asesor", sp.asesor);
    return `/reportes?${params.toString()}`;
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Calendario de actividades y tableros de analítica
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={mkHref(t.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {isBi && (
          <div className="pb-2">
            <BiFilterBar advisors={advisors} />
          </div>
        )}
      </div>

      {active === "calendario" && (
        <CalendarTab companyId={user.companyId} advisors={advisors} />
      )}
      {active === "cotizaciones" && (
        <BiCotizacionesBoard data={await biCotizaciones(user.companyId, { from, asesorId })} />
      )}
      {active === "pedidos" && (
        <BiPedidosBoard data={await biPedidos(user.companyId, { from, asesorId })} />
      )}
      {active === "seguimiento" && (
        <BiSeguimientoBoard data={await biSeguimiento(user.companyId, { from, asesorId })} />
      )}
    </div>
  );
}

async function CalendarTab({
  companyId,
  advisors,
}: {
  companyId: string;
  advisors: { id: string; name: string }[];
}) {
  const [events, param] = await Promise.all([
    calendarEvents(companyId),
    db.parameter.findUnique({
      where: { companyId_key: { companyId, key: "action_activities" } },
    }),
  ]);
  const paramTipos = Array.isArray(param?.value)
    ? (param!.value as { value?: string }[]).map((a) => a.value ?? "").filter(Boolean)
    : [];
  const tipos = Array.from(
    new Set([...paramTipos, ...DEFAULT_TIPOS, ...events.map((e) => e.accion)])
  );

  return <ActivityCalendar events={events} advisors={advisors} tipos={tipos} />;
}
