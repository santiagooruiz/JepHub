import Link from "next/link";
import {
  Users,
  ShieldCheck,
  FolderTree,
  Tag,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SECTIONS = [
  {
    title: "Usuarios",
    desc: "Gestión de usuarios y cupos por rol",
    href: "/configuracion/usuarios",
    icon: Users,
    ready: true,
  },
  {
    title: "Roles y permisos",
    desc: "Matriz de permisos por rol",
    href: "/configuracion/roles",
    icon: ShieldCheck,
    ready: true,
  },
  {
    title: "Categorías",
    desc: "Catálogos parametrizables por entidad",
    href: "#",
    icon: FolderTree,
    ready: false,
  },
  {
    title: "Tags",
    desc: "Etiquetas de clasificación",
    href: "#",
    icon: Tag,
    ready: false,
  },
  {
    title: "Parámetros",
    desc: "Estados y enums del sistema",
    href: "#",
    icon: SlidersHorizontal,
    ready: false,
  },
];

export default function ConfiguracionPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Configuración
      </h1>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: "var(--card-gap)" }}
      >
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const inner = (
            <Card
              className={`flex items-start gap-4 p-4 transition-colors ${
                s.ready ? "hover:border-primary/50" : "opacity-60"
              }`}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{s.title}</p>
                  {!s.ready && (
                    <Badge variant="muted" className="text-[10px]">
                      Sprint 2
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
              {s.ready && (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              )}
            </Card>
          );
          return s.ready ? (
            <Link key={s.title} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.title}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
