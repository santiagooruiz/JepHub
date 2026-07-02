import { db } from "@/lib/db";
import { clientDisplayName } from "@/features/clients/queries";

// ─────────────────────────── Filtros ───────────────────────────
export type Period = "month" | "quarter" | "year" | "all";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "Último mes" },
  { id: "quarter", label: "Último trimestre" },
  { id: "year", label: "Último año" },
  { id: "all", label: "Todo" },
];

export function periodFrom(period: Period): Date | null {
  const days = period === "month" ? 30 : period === "quarter" ? 90 : period === "year" ? 365 : 0;
  if (!days) return null;
  return new Date(Date.now() - days * 86400000);
}

export function parsePeriod(v?: string): Period {
  return v === "month" || v === "quarter" || v === "year" || v === "all" ? v : "year";
}

const num = (d: unknown) => Number(d ?? 0);
const CERRADAS_CTZ = new Set(["Aprobada", "No aprobada"]);
const CERRADOS_PED = new Set(["Facturado", "Denegado"]);
const PROB_LABEL: Record<string, string> = {
  UNDEFINED: "Sin Definir",
  HIGH: "Alta Probabilidad",
  FIXED: "Fijo",
};

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
}

export async function listAdvisors(companyId: string) {
  return db.user.findMany({
    where: { companyId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─────────────────────────── Dashboard ───────────────────────────
export async function getDashboard(companyId: string) {
  const [quotes, orders, clientsCount, oppsOpen] = await Promise.all([
    db.quote.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, numero: true, estado: true, total: true, fechaVencimiento: true, client: clientSelect() },
    }),
    db.order.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, numero: true, estado: true, total: true, client: clientSelect() },
    }),
    db.client.count({ where: { companyId, deletedAt: null } }),
    db.opportunity.count({ where: { companyId, deletedAt: null, estado: { notIn: ["Cotizada", "Perdida"] } } }),
  ]);

  const activeQuotes = quotes.filter((q) => !CERRADAS_CTZ.has(q.estado));
  const activeOrders = orders.filter((o) => !CERRADOS_PED.has(o.estado));

  const kpis = {
    cotizacionesActivas: activeQuotes.length,
    montoCotizaciones: activeQuotes.reduce((s, q) => s + num(q.total), 0),
    pedidosEnCurso: activeOrders.length,
    montoPedidos: activeOrders.reduce((s, o) => s + num(o.total), 0),
    clientes: clientsCount,
    oportunidadesAbiertas: oppsOpen,
  };

  // Bandeja "Requiere atención"
  const now = Date.now();
  const porAprobar = quotes.filter((q) => q.estado === "Pendiente Aprobación" || q.estado === "Enviada");
  const porVencer = quotes.filter(
    (q) => !CERRADAS_CTZ.has(q.estado) && q.fechaVencimiento && q.fechaVencimiento.getTime() <= now + 7 * 86400000
  );
  const pedidosIngreso = orders.filter((o) => o.estado === "Pendiente Ingreso");

  const [prospectosInactivos, backlogPendiente] = await Promise.all([
    db.client.findMany({
      where: {
        companyId,
        deletedAt: null,
        estado: "Prospecto",
        OR: [{ ultimaInteraccion: null }, { ultimaInteraccion: { lt: new Date(now - 14 * 86400000) } }],
      },
      select: { id: true, numero: true, ...clientSelect().select },
      take: 5,
    }),
    db.designRequest.count({
      where: { companyId, deletedAt: null, estado: { in: ["Pendiente Validación", "PT Aprobación FT"] } },
    }),
  ]);

  const attention = [
    {
      key: "por-aprobar",
      label: "Cotizaciones pendientes de aprobación",
      count: porAprobar.length,
      href: "/cotizaciones",
      items: porAprobar.slice(0, 5).map((q) => ({
        id: q.id,
        href: `/cotizaciones/${q.id}`,
        primary: `Cotización N° ${q.numero}`,
        secondary: clientDisplayName(q.client),
        amount: num(q.total),
      })),
    },
    {
      key: "por-vencer",
      label: "Cotizaciones por vencer (7 días)",
      count: porVencer.length,
      href: "/cotizaciones",
      items: porVencer.slice(0, 5).map((q) => ({
        id: q.id,
        href: `/cotizaciones/${q.id}`,
        primary: `Cotización N° ${q.numero}`,
        secondary: q.fechaVencimiento?.toLocaleDateString("es-CO") ?? "",
        amount: num(q.total),
      })),
    },
    {
      key: "pedidos-ingreso",
      label: "Pedidos pendientes de ingreso",
      count: pedidosIngreso.length,
      href: "/pedidos",
      items: pedidosIngreso.slice(0, 5).map((o) => ({
        id: o.id,
        href: `/pedidos/${o.id}`,
        primary: `Pedido N° ${o.numero}`,
        secondary: clientDisplayName(o.client),
        amount: num(o.total),
      })),
    },
    {
      key: "prospectos",
      label: "Prospectos sin interacción (14 días)",
      count: prospectosInactivos.length,
      href: "/clientes",
      items: prospectosInactivos.map((c) => ({
        id: c.id,
        href: `/clientes/${c.id}`,
        primary: clientDisplayName(c),
        secondary: `Prospecto N° ${c.numero}`,
        amount: null as number | null,
      })),
    },
    {
      key: "backlog",
      label: "Diseños pendientes de validación",
      count: backlogPendiente,
      href: "/backlog",
      items: [] as never[],
    },
  ];

  return { kpis, attention };
}

function clientSelect() {
  return {
    select: {
      personType: true,
      nombres: true,
      apellidos: true,
      razonSocial: true,
      nombreComercial: true,
    },
  } as const;
}

// ─────────────────────── BI Cotizaciones ───────────────────────
type BiFilter = { from: Date | null; asesorId: string | null };

export async function biCotizaciones(companyId: string, f: BiFilter) {
  const quotes = await db.quote.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(f.from ? { createdAt: { gte: f.from } } : {}),
      ...(f.asesorId ? { registeredById: f.asesorId } : {}),
    },
    select: {
      id: true,
      numero: true,
      estado: true,
      total: true,
      probabilidad: true,
      createdAt: true,
      clientId: true,
      client: clientSelect(),
      registeredBy: { select: { name: true } },
      order: { select: { id: true } },
    },
    orderBy: { total: "desc" },
  });

  const kpis = {
    cotizaciones: quotes.length,
    totalCotizado: quotes.reduce((s, q) => s + num(q.total), 0),
    convertidas: quotes.filter((q) => q.order).length,
    convertidoTotal: quotes.filter((q) => q.order).reduce((s, q) => s + num(q.total), 0),
    clientes: new Set(quotes.map((q) => q.clientId)).size,
  };

  const aprobadas = quotes.filter((q) => q.estado === "Aprobada").length;
  const conversionPie = [
    { name: "Aprobada", value: aprobadas },
    { name: "Pendiente", value: quotes.length - aprobadas },
  ];

  const estadoData = groupSum(quotes, (q) => q.estado);
  const participacionPie = groupSum(quotes, (q) => q.registeredBy?.name ?? "Sin asesor");

  // Serie semanal por asesor (top 5 asesores por total)
  const topAsesores = participacionPie.slice(0, 5).map((p) => p.name);
  const weeks = Array.from(new Set(quotes.map((q) => isoWeekKey(q.createdAt)))).sort();
  const seriesByWeek = weeks.map((w) => {
    const row: Record<string, number | string> = { semana: w };
    for (const a of topAsesores) {
      row[a] = quotes
        .filter((q) => isoWeekKey(q.createdAt) === w && (q.registeredBy?.name ?? "Sin asesor") === a)
        .reduce((s, q) => s + num(q.total), 0);
    }
    return row;
  });

  // Pivote asesor × estado (SUM total)
  const estados = Array.from(new Set(quotes.map((q) => q.estado)));
  const asesores = Array.from(new Set(quotes.map((q) => q.registeredBy?.name ?? "Sin asesor")));
  const pivot = {
    columns: estados,
    rows: asesores.map((a) => {
      const cells = estados.map((e) =>
        quotes
          .filter((q) => (q.registeredBy?.name ?? "Sin asesor") === a && q.estado === e)
          .reduce((s, q) => s + num(q.total), 0)
      );
      return { label: a, cells, total: cells.reduce((s, c) => s + c, 0) };
    }),
  };

  const top = quotes.slice(0, 10).map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente: clientDisplayName(q.client),
    asesor: q.registeredBy?.name ?? "—",
    estado: q.estado,
    probabilidad: PROB_LABEL[q.probabilidad] ?? q.probabilidad,
    total: num(q.total),
  }));

  return { kpis, conversionPie, estadoData, participacionPie, seriesByWeek, seriesKeys: topAsesores, pivot, top };
}

// ─────────────────────── BI Pedidos ───────────────────────
export async function biPedidos(companyId: string, f: BiFilter) {
  const orders = await db.order.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(f.from ? { createdAt: { gte: f.from } } : {}),
      ...(f.asesorId ? { advisorId: f.asesorId } : {}),
    },
    select: {
      id: true,
      estado: true,
      total: true,
      clientId: true,
      advisor: { select: { name: true } },
      client: { select: { ciudad: true } },
    },
  });

  const kpis = {
    totalPedidos: orders.reduce((s, o) => s + num(o.total), 0),
    cantidadPedidos: orders.length,
    clientes: new Set(orders.map((o) => o.clientId)).size,
  };

  const porVendedor = groupSum(orders, (o) => o.advisor?.name ?? "Sin vendedor");
  const topCiudades = groupSum(orders, (o) => o.client?.ciudad || "Sin ciudad").slice(0, 8);
  const estadoPie = groupCount(orders, (o) => o.estado);

  return { kpis, porVendedor, topCiudades, estadoPie };
}

// ─────────────────────── BI Seguimiento ───────────────────────
export async function biSeguimiento(companyId: string, f: BiFilter) {
  const quotes = await db.quote.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(f.from ? { createdAt: { gte: f.from } } : {}),
      ...(f.asesorId ? { registeredById: f.asesorId } : {}),
    },
    select: {
      id: true,
      numero: true,
      estado: true,
      total: true,
      probabilidad: true,
      client: clientSelect(),
      registeredBy: { select: { name: true } },
    },
    orderBy: { total: "desc" },
  });

  const probabilidadPie = groupSum(quotes, (q) => PROB_LABEL[q.probabilidad] ?? q.probabilidad);
  const participacionPie = groupSum(quotes, (q) => q.registeredBy?.name ?? "Sin asesor");
  const top = quotes.slice(0, 10).map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente: clientDisplayName(q.client),
    asesor: q.registeredBy?.name ?? "—",
    estado: q.estado,
    probabilidad: PROB_LABEL[q.probabilidad] ?? q.probabilidad,
    total: num(q.total),
  }));

  return { probabilidadPie, participacionPie, top, registros: quotes.length };
}

// ─────────────────────── Calendario ───────────────────────
export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  accion: string;
  userId: string | null;
  userName: string | null;
};

/** Actividades como eventos del calendario (se filtran en cliente). */
export async function calendarEvents(companyId: string): Promise<CalendarEvent[]> {
  const activities = await db.activity.findMany({
    where: { companyId },
    select: {
      id: true,
      accion: true,
      fechaHora: true,
      userId: true,
      user: { select: { name: true } },
    },
    orderBy: { fechaHora: "desc" },
    take: 800,
  });

  return activities.map((a) => ({
    id: a.id,
    title: `${a.accion}${a.user?.name ? ` · ${a.user.name}` : ""}`,
    start: a.fechaHora.toISOString(),
    accion: a.accion,
    userId: a.userId,
    userName: a.user?.name ?? null,
  }));
}

// ─────────────────────── helpers de agregación ───────────────────────
function groupSum<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + num((r as { total?: unknown }).total));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function groupCount<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
