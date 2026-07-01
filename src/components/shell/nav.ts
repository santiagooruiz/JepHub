import {
  Home,
  Users,
  TrendingUp,
  FileText,
  ShoppingCart,
  PencilRuler,
  Library,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible si el usuario tiene AL MENOS uno de estos permisos. Vacío = siempre. */
  perms?: string[];
};

export const NAV: NavItem[] = [
  { label: "Principal", href: "/dashboard", icon: Home },
  { label: "Clientes", href: "/clientes", icon: Users, perms: ["clients.view"] },
  { label: "Oportunidades", href: "/oportunidades", icon: TrendingUp, perms: ["opportunities.view"] },
  { label: "Cotizaciones", href: "/cotizaciones", icon: FileText, perms: ["quotes.view"] },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart, perms: ["orders.view"] },
  { label: "Backlog Diseño", href: "/backlog", icon: PencilRuler, perms: ["backlog_design.view"] },
  { label: "Biblioteca Especiales", href: "/especiales", icon: Library, perms: ["special_designs.view"] },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    perms: ["reports.bi_quotes", "reports.bi_orders", "reports.bi_tracking", "reports.calendar"],
  },
  {
    label: "Configuración",
    href: "/configuracion",
    icon: Settings,
    perms: ["users.view", "roles.view", "categories.view", "tags.view", "parameters.view"],
  },
];

/** Hrefs de nav que el usuario puede ver, según sus permisos activos. */
export function allowedHrefs(grantKeys: Set<string>): string[] {
  return NAV.filter(
    (i) => !i.perms || i.perms.some((k) => grantKeys.has(k))
  ).map((i) => i.href);
}
