# JEP-Hub

CRM propio para **JEP Mobiliari** (sector mobiliario): gestión de clientes/prospectos, oportunidades, cotizaciones, pedidos, diseño y producción.

> Proyecto inspirado en el CRM existente, reconstruido desde cero con **paridad funcional + mejoras de UX + un salto visual** (design system moderno).

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ESPEC-FUNCIONAL.md](docs/ESPEC-FUNCIONAL.md) | Especificación funcional completa (16 módulos): sitemap, inventario de pantallas, spec por módulo, modelo de datos, sistema de diseño y priorización MVP |
| [docs/ARQUITECTURA-DESPLIEGUE.md](docs/ARQUITECTURA-DESPLIEGUE.md) | Arquitectura de despliegue (Windows Server 2019 + Docker + reverse proxy, backups, seguridad) |
| [docs/SISTEMA-DISENO.md](docs/SISTEMA-DISENO.md) | Sistema de diseño objetivo (tokens claro/oscuro, tipografía, densidad, componentes) |

## 🧱 Stack

- **Frontend/Backend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Base de datos:** PostgreSQL + Prisma
- **Auth & multi-tenant:** better-auth · **RBAC:** CASL
- **UI:** Tailwind CSS + shadcn/ui (tema neutro + acento teal, claro/oscuro)
- **Tablas/estado:** TanStack Table + TanStack Query · **Formularios:** React Hook Form + Zod
- **PDF:** Puppeteer · **Colas/integración ERP:** BullMQ + Redis · **Calendario:** FullCalendar · **BI:** Metabase embebido

## 🚦 Estado

📄 Documentación y decisiones de arquitectura completas. Próximo hito: plan de implementación + scaffolding del MVP.

## Ciclo de negocio

```
Prospecto → Cliente → Oportunidad → Cotización → [firma cliente] → Pedido
   → [Ingreso → Fabricación → Instalación → Facturación] → Facturado
```
