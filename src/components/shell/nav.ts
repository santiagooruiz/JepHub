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
};

export const NAV: NavItem[] = [
  { label: "Principal", href: "/dashboard", icon: Home },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Oportunidades", href: "/oportunidades", icon: TrendingUp },
  { label: "Cotizaciones", href: "/cotizaciones", icon: FileText },
  { label: "Pedidos", href: "/pedidos", icon: ShoppingCart },
  { label: "Backlog Diseño", href: "/backlog", icon: PencilRuler },
  { label: "Biblioteca Especiales", href: "/especiales", icon: Library },
  { label: "Reportes", href: "/reportes", icon: BarChart3 },
  { label: "Configuración", href: "/configuracion", icon: Settings },
];
