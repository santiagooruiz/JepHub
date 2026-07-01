# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is in the **documentation / planning phase**. There is **no application code yet** — no `package.json`, no build/lint/test tooling. The tracked content is the specification and architecture that the app will be built from:

| File | What it holds |
|------|---------------|
| `docs/ESPEC-FUNCIONAL.md` | **Source of truth.** Full functional spec of all 16 modules: sitemap, screen inventory (with real routes), per-module A–G spec, the inferred **data model** (entities/attributes/relations/enums), and MVP prioritization. |
| `docs/SISTEMA-DISENO.md` | Target design system: light/dark CSS tokens, typography, density rules, component list. **The design tokens here are authoritative** for any UI work. |
| `docs/ARQUITECTURA-DESPLIEGUE.md` | Deployment topology (Windows Server 2019 + Hyper-V Ubuntu VM + Docker Compose, Caddy reverse proxy, backups). |
| `README.md` | Stack summary and business cycle. |

Before writing code, read `docs/ESPEC-FUNCIONAL.md` (data model + module specs) and `docs/SISTEMA-DISENO.md` (tokens). Keep these docs in sync when the design or model changes.

## What we are building

JEP-Hub is an own CRM for **JEP Mobiliari** (furniture sector), a from-scratch rebuild of an existing CRM (`jep.toscanagestion.co`). Guiding principle for the rebuild: **functional parity** with the original (nothing the team relies on is lost) **+ proactively apply improvements** where a better approach is clear **+ a big visual upgrade** (modern design system, not a clone of the old Bootstrap panel). Fix observed defects rather than replicate them (e.g. broken loading states, typos like "Guradar"/"Adminsitración").

## Decided tech stack (build against this)

- **Next.js 15 (App Router) + React 19 + TypeScript** — Server Components for reads, Server Actions for mutations, Route Handlers for the ERP webhook.
- **PostgreSQL + Prisma** (the Parámetros module needs `jsonb`).
- **better-auth** (auth + multi-tenant/organizations = `company_id`) · **CASL** for RBAC.
- **Tailwind CSS + shadcn/ui** (theme = neutral grafito + teal `#12A2BC` accent, dark sidebar in both modes) · **Lucide** icons.
- **TanStack Table + TanStack Query** · **React Hook Form + Zod**.
- **Puppeteer** for PDF (quote/order documents are HTML+images) · **BullMQ + Redis** worker for the "ofimática" ERP sync jobs · **FullCalendar** · **Metabase** embedded for the heavy BI dashboards.

## Domain architecture (essential, non-obvious)

The whole system is one **commercial pipeline** — read this before touching any module:

```
Prospecto → Cliente → Oportunidad → Cotización → [client e-signature] → APROBADA
   → generates Pedido → [approvals: Ingreso → Fabricación → Instalación → Facturación]
   → sync to ofimática ERP (milestones: Tapicería → Listo → Despacho) → Facturado
        ↑ "Solicitar planos" branches a Cotización into Backlog Diseño → Biblioteca Especiales
```

Facts that will bite you if unknown:

- **Internal vs UI naming** (the original app's names; keep the app's own domain naming clean but be aware when reading the spec): Oportunidad = *proyecto* / `project_estimate`; Cotización = *proposal*; Pedido = *order*.
- **States are data, not hardcoded.** The `Parámetros` module (`/settings`, JSON values like `approved_types`, `action_activities`) defines every enum/state machine, each value carrying `id/value/icon/color`. Model states as a configurable catalog, not constants.
- **Multi-tenant** via `company_id` on users/parameters — scope queries by tenant from day one.
- **RBAC** = permissions named `{modulo}.{accion}` (e.g. `clients.create`, `backlog_design.view`) assigned per role, each with an optional **scope restriction** per role. 8 roles, ~54 permissions. Map this to CASL.
- **Furniture domain:** quote/order line items carry `acabados` (Formica/Canto/Herraje) that can be "POR DEFINIR" until design completes; PDFs come in two flavors (normal and **con despiece** / BOM).
- **Activity/timeline is transversal** to clients, oportunidades, cotizaciones and pedidos (a shared events/`activities` table drives the timelines, the calendar, and BI Seguimiento).

## Once the app is scaffolded

No commands exist yet. When scaffolding, this stack implies (adjust to the chosen package manager, pnpm recommended):

- Dev server: `pnpm dev` · Build: `pnpm build` · Start: `pnpm start`
- Lint/format: `pnpm lint` · Types: `pnpm typecheck`
- DB (Prisma): `pnpm prisma migrate dev`, `pnpm prisma generate`, `pnpm prisma studio`
- Worker (BullMQ) runs as a separate process; Redis + Postgres via `docker compose` (see `docs/ARQUITECTURA-DESPLIEGUE.md`).

Update this section with the real scripts from `package.json` (including how to run a single test) as soon as tooling lands.

## Conventions

- Default branch is **`main`**. Commit messages use conventional prefixes (`docs:`, `chore:`, `feat:`) and end with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. Push only when asked.
- The spec was built **from screenshots** (no browser automation is available in this environment); the original app cannot be crawled directly.
