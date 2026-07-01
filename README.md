# JEP-Hub

CRM propio para **JEP Mobiliari** (sector mobiliario): gestión de clientes/prospectos, oportunidades, cotizaciones, pedidos, diseño y producción.

> Proyecto inspirado en el CRM existente, reconstruido desde cero con **paridad funcional + mejoras de UX + un salto visual** (design system moderno).

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ESPEC-FUNCIONAL.md](docs/ESPEC-FUNCIONAL.md) | Especificación funcional completa (16 módulos): sitemap, inventario de pantallas, spec por módulo, modelo de datos, sistema de diseño y priorización MVP |
| [docs/ARQUITECTURA-DESPLIEGUE.md](docs/ARQUITECTURA-DESPLIEGUE.md) | Arquitectura de despliegue (Windows Server 2019 + Docker + reverse proxy, backups, seguridad) |
| [docs/SISTEMA-DISENO.md](docs/SISTEMA-DISENO.md) | Sistema de diseño objetivo (tokens claro/oscuro, tipografía, densidad, componentes) |
| [docs/PLAN-IMPLEMENTACION.md](docs/PLAN-IMPLEMENTACION.md) | Plan de implementación: esquema Prisma, estructura de carpetas y sprints del MVP |

## 🧱 Stack

- **Frontend/Backend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Base de datos:** PostgreSQL + Prisma
- **Auth & multi-tenant:** better-auth · **RBAC:** CASL
- **UI:** Tailwind CSS + shadcn/ui (tema neutro + acento teal, claro/oscuro)
- **Tablas/estado:** TanStack Table + TanStack Query · **Formularios:** React Hook Form + Zod
- **PDF:** Puppeteer · **Colas/integración ERP:** BullMQ + Redis · **Calendario:** FullCalendar · **BI:** Metabase embebido

## 🚦 Estado

✅ **Sprint 0 (fundaciones) completo:** Next.js 15 + Tailwind + shadcn/ui con tema teal (claro/oscuro + toggle de densidad), AppShell (sidebar + topbar + ⌘K), Prisma + Postgres/Redis vía Docker, y login/dashboard base. Próximo: Sprint 1 (Tenant + Auth + RBAC).

## 🛠️ Desarrollo local

Requisitos: Node 20+, pnpm (vía `corepack enable`), Docker.

```bash
pnpm install
docker compose up -d          # postgres + redis
cp .env.example .env          # ajustar si hace falta
pnpm db:migrate               # crea el esquema
pnpm dev                      # http://localhost:3000
```

Scripts: `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm db:migrate` · `pnpm db:studio`

## Ciclo de negocio

```
Prospecto → Cliente → Oportunidad → Cotización → [firma cliente] → Pedido
   → [Ingreso → Fabricación → Instalación → Facturación] → Facturado
```
