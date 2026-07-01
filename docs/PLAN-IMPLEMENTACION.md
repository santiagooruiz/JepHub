# Plan de Implementación — JEP-Hub

> Traduce la [ESPEC-FUNCIONAL](ESPEC-FUNCIONAL.md) y el [SISTEMA-DISENO](SISTEMA-DISENO.md) en algo construible: **esquema Prisma**, **estructura de carpetas** y **sprints del MVP**.
> Principio: paridad funcional + mejoras + salto visual. Stack: Next.js 15 (App Router) · PostgreSQL + Prisma · better-auth · CASL · Tailwind + shadcn/ui · TanStack · BullMQ/Redis · Puppeteer.

---

## 1. Decisiones de modelado transversales

1. **Multi-tenant** por `companyId` en todas las entidades operativas (aunque hoy haya una sola empresa). Todas las queries se filtran por tenant (helper `withTenant`).
2. **Estados como catálogo configurable** (principio de la spec): los estados de workflow se guardan como **string** validado contra el catálogo `Parameter`/`StatusOption` (con `id/value/icon/color`), **no** como enums Prisma rígidos. Solo se usan `enum` de Prisma para conjuntos verdaderamente fijos (tipo de persona, estado de usuario, probabilidad).
3. **Actividad y Archivos son transversales**: se relacionan opcionalmente con Cliente/Oportunidad/Cotización/Pedido mediante FKs nullable (Prisma no soporta polimorfismo real).
4. **Dinero** en `Decimal(15,2)`; **IVA** parametrizable (default 19%).
5. **IDs** internos `cuid()`; además `numero` (Int autoincrement por empresa) para el "N°" visible al usuario.
6. **Soft-delete** (`deletedAt`) y **auditoría** (`createdAt/updatedAt/createdById`) en entidades clave.

---

## 2. Esquema Prisma (v1 — se refina en migración)

> Objetivo: cercano a copy-paste. Las relaciones inversas en `User`/`Company` están declaradas para que `prisma validate` pase. Los catálogos y opciones de estado se afinan en el Sprint 2.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────── Enums fijos ───────────────────────────
enum PersonType   { NATURAL JURIDICA }
enum UserStatus   { ACTIVE INACTIVE PASSWORD_CHANGE }
enum CloseProb    { UNDEFINED HIGH FIXED }          // Sin Definir · Alta Probabilidad · Fijo
enum EntityType   { CLIENT OPPORTUNITY QUOTE ORDER } // para actividad/archivos
enum ApprovalKind { INGRESO FABRICACION INSTALACION FACTURACION }

// ─────────────────────────── Tenancy & Auth ───────────────────────────
model Company {
  id         String   @id @default(cuid())
  name       String
  createdAt  DateTime @default(now())
  users      User[]
  clients    Client[]
  parameters Parameter[]
  categories Category[]
  // ...otras colecciones scoped por tenant
}

model User {
  id            String     @id @default(cuid())
  companyId     String
  company       Company    @relation(fields: [companyId], references: [id])
  name          String
  email         String     @unique
  passwordHash  String
  roleId        String
  role          Role       @relation(fields: [roleId], references: [id])
  language      String     @default("es")
  status        UserStatus @default(ACTIVE)
  cargoActual   String?
  numeroDocumento String?
  numeroTelefonico String?
  codven        String?    // código vendedor (ERP ofimática)
  lastLoginAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  // Relaciones inversas (named)
  clientsAdvised    Client[]      @relation("ClientAdvisor")
  opportunitiesAdv  Opportunity[] @relation("OppAdvisor")
  quotesRegistered  Quote[]       @relation("QuoteRegisteredBy")
  ordersAdvised     Order[]       @relation("OrderAdvisor")
  activities        Activity[]    @relation("ActivityUser")
  approvals         OrderApproval[]
  designsAssigned   DesignRequest[] @relation("DesignAssignee")
}

model Role {
  id          String            @id @default(cuid())
  companyId   String
  name        String            // Administrador, Asesor, Diseñador, ...
  seatLimit   Int?              // cupo/licenciamiento (usados/límite)
  users       User[]
  permissions RolePermission[]
  @@unique([companyId, name])
}

model Permission {
  id        String            @id @default(cuid())
  key       String            @unique   // {modulo}.{accion} → clients.create
  name      String                      // "Crear Cliente"
  roles     RolePermission[]
}

// permiso × rol con restricción/scope por rol
model RolePermission {
  roleId       String
  permissionId String
  active       Boolean @default(false)
  restriction  String? // scope: p.ej. "own" (solo registros propios)
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

// ─────────────────────────── Config & Catálogos ───────────────────────────
// Store clave-valor JSON que define enums/estados (con icon/color)
model Parameter {
  id         String   @id @default(cuid())
  companyId  String
  company    Company  @relation(fields: [companyId], references: [id])
  key        String   // action_activities, approved_types, approved_type_ctz...
  value      Json     // [{ id, value, icon, color }, ...]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@unique([companyId, key])
}

// Catálogo genérico parametrizable por entidad (channel, client type, file type...)
model Category {
  id        String   @id @default(cuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  entity    String   // "client" | "channel" | ...
  name      String
  createdAt DateTime @default(now())
}

model Tag {
  id        String       @id @default(cuid())
  companyId String
  name      String
  clients   ClientTag[]
}

model Sector {
  id         String      @id @default(cuid())
  name       String
  subsectors SubSector[]
}
model SubSector {
  id       String @id @default(cuid())
  name     String
  sectorId String
  sector   Sector @relation(fields: [sectorId], references: [id])
}

model PriceList {   // Lista de precio: Usuario Final, Distribuidor...
  id    String @id @default(cuid())
  name  String
}

// ─────────────────────────── CRM: Cliente ───────────────────────────
model Client {
  id             String     @id @default(cuid())
  companyId      String
  company        Company    @relation(fields: [companyId], references: [id])
  numero         Int
  personType     PersonType
  estado         String     // Prospecto·Gestión Prospectos·Gestión Cotización·Cliente·Gestión Perdida (config)
  // P. Natural
  nombres        String?
  apellidos      String?
  // P. Jurídica
  nombreComercial String?
  razonSocial    String?
  // comunes
  email          String?
  telefono       String?
  tipoDocumento  String?
  numeroDocumento String?
  direccion      String?
  complementoDireccion String?
  pais           String?
  ciudad         String?
  observaciones  String?
  priceListId    String?
  priceList      PriceList? @relation(fields: [priceListId], references: [id])
  sectorId       String?
  subSectorId    String?
  canal          String?    // categoría entity=channel
  saldoCartera   Decimal?   @db.Decimal(15,2)
  advisorId      String?
  advisor        User?      @relation("ClientAdvisor", fields: [advisorId], references: [id])
  ultimaInteraccion DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  deletedAt      DateTime?

  contacts       Contact[]
  opportunities  Opportunity[]
  quotes         Quote[]
  orders         Order[]
  tags           ClientTag[]
  @@unique([companyId, numero])
}

model Contact {          // contacto interno del cliente
  id         String  @id @default(cuid())
  clientId   String
  client     Client  @relation(fields: [clientId], references: [id])
  nombre     String
  email      String?
  telefono   String?
  cargo      String?
  observacion String?
}

model ClientTag {
  clientId String
  tagId    String
  client   Client @relation(fields: [clientId], references: [id])
  tag      Tag    @relation(fields: [tagId], references: [id])
  @@id([clientId, tagId])
}

// ─────────────────────────── Oportunidad (interna: proyecto) ───────────────────────────
model Opportunity {
  id            String   @id @default(cuid())
  companyId     String
  numero        Int
  clientId      String
  client        Client   @relation(fields: [clientId], references: [id])
  nombre        String
  contacto      String?
  advisorId     String?
  advisor       User?    @relation("OppAdvisor", fields: [advisorId], references: [id])
  fechaCierreProyectada DateTime?
  estado        String   // No Cotizada · Pendiente Aprobación · Cotizada · Perdida (config)
  probabilidad  CloseProb @default(UNDEFINED)
  createdAt     DateTime @default(now())
  quotes        Quote[]
  orders        Order[]
  @@unique([companyId, numero])
}

// ─────────────────────────── Cotización (interna: proposal) ───────────────────────────
model Quote {
  id             String   @id @default(cuid())
  companyId      String
  numero         Int
  clientId       String
  client         Client   @relation(fields: [clientId], references: [id])
  opportunityId  String
  opportunity    Opportunity @relation(fields: [opportunityId], references: [id])
  registeredById String?
  registeredBy   User?    @relation("QuoteRegisteredBy", fields: [registeredById], references: [id])
  estado         String   // workflow: Pendiente cotización → ... → Aprobada/No aprobada (config)
  probabilidad   CloseProb @default(UNDEFINED)
  formaPago      String?
  tiempoEntrega  String?
  ordenCompra    String?
  direccionEnvio String?
  observacion    String?
  fechaVencimiento DateTime?
  subtotal       Decimal  @default(0) @db.Decimal(15,2)
  impuesto       Decimal  @default(0) @db.Decimal(15,2)
  total          Decimal  @default(0) @db.Decimal(15,2)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  items          LineItem[]
  signature      Signature?
  order          Order?
  designRequests DesignRequest[]
  @@unique([companyId, numero])
}

model Product {          // catálogo
  id        String  @id @default(cuid())
  companyId String
  codigo    String
  nombre    String
  tipo      String? // principal / accesorio
  referencia String?
  imagen    String?
  precioBase Decimal? @db.Decimal(15,2)
  // acabados por defecto (pueden quedar "POR DEFINIR")
  formica   String?
  canto     String?
  herraje   String?
  items     LineItem[]
  @@unique([companyId, codigo])
}

model LineItem {         // ítem de cotización o pedido
  id            String  @id @default(cuid())
  quoteId       String?
  quote         Quote?  @relation(fields: [quoteId], references: [id])
  orderId       String?
  order         Order?  @relation(fields: [orderId], references: [id])
  productId     String?
  product       Product? @relation(fields: [productId], references: [id])
  imagen        String?
  referencia    String?
  descripcion   String?
  precio        Decimal @db.Decimal(15,2)
  cantidad      Int
  descuentoPct  Decimal @default(0) @db.Decimal(5,2)
  precioConDesc Decimal @db.Decimal(15,2)
  acabados      String?
  observacionesInternas String?
  total         Decimal @db.Decimal(15,2)
}

model Signature {        // firma electrónica del cliente
  id        String   @id @default(cuid())
  quoteId   String   @unique
  quote     Quote    @relation(fields: [quoteId], references: [id])
  token     String   @unique     // link público /firma/[token]
  estado    String   // pendiente · firmada · rechazada
  firmadaEn DateTime?
  createdAt DateTime @default(now())
}

// ─────────────────────────── Pedido (interna: order) ───────────────────────────
model Order {
  id             String   @id @default(cuid())
  companyId      String
  numero         Int
  clientId       String
  client         Client   @relation(fields: [clientId], references: [id])
  opportunityId  String?
  opportunity    Opportunity? @relation(fields: [opportunityId], references: [id])
  quoteId        String?  @unique
  quote          Quote?   @relation(fields: [quoteId], references: [id])
  advisorId      String?
  advisor        User?    @relation("OrderAdvisor", fields: [advisorId], references: [id])
  estado         String   // Pendiente Ingreso · En Producción · Instalación · Pendientes Facturación · Facturado · Denegado (config)
  tipoProducto   String   @default("Estandar") // Estándar | Especial
  requiereInstalacion Boolean @default(false)
  formaPago      String?
  ordenCompra    String?
  direccionEnvio String?
  subtotal       Decimal  @default(0) @db.Decimal(15,2)
  impuesto       Decimal  @default(0) @db.Decimal(15,2)
  total          Decimal  @default(0) @db.Decimal(15,2)
  createdAt      DateTime @default(now())
  items          LineItem[]
  approvals      OrderApproval[]
  erpSync        ErpSync?
  @@unique([companyId, numero])
}

model OrderApproval {
  id           String       @id @default(cuid())
  orderId      String
  order        Order        @relation(fields: [orderId], references: [id])
  kind         ApprovalKind
  aprobado     Boolean      @default(false)
  approvedById String?
  approvedBy   User?        @relation(fields: [approvedById], references: [id])
  observacion  String?
  fecha        DateTime?
}

model ErpSync {           // integración ofimática
  id                  String   @id @default(cuid())
  orderId             String   @unique
  order               Order    @relation(fields: [orderId], references: [id])
  nPedidoOfimatica    String?
  identificadorCotizacion String?
  estadoEnvio         String?  // ENVIADO...
  fechaEnvio          DateTime?
  fechaCreacion       DateTime?
  fechaTapiceria      DateTime?
  fechaVencimiento    DateTime?
  fechaListo          DateTime?
  fechaDespacho       DateTime?
  notasGenerales      String?
}

// ─────────────────────────── Diseño ───────────────────────────
model DesignRequest {    // Backlog Diseño (PR-DI-01)
  id            String  @id @default(cuid())
  companyId     String
  quoteId       String?
  quote         Quote?  @relation(fields: [quoteId], references: [id])
  clientId      String?
  designerId    String?
  designer      User?   @relation("DesignAssignee", fields: [designerId], references: [id])
  imagen        String?
  descripcion   String?
  // planificación PR-DI-01
  datosEntrada        String?
  requisitosTecnicos  String?
  requisitosFuncionales String?
  posiblesFallos      String?
  requisitosLegales   String?
  disenosPrevios      String?
  estado        String  // PT precio comercial · ... · Rechazado · Finalizado (config)
  despiece      String? // archivo/estado
  armadoGeneral String?
  planosTecnicos String?
  nPedidoOfimatica String?
  createdAt     DateTime @default(now())
  special       SpecialDesign?
}

model SpecialDesign {    // Biblioteca Especiales
  id            String  @id @default(cuid())
  companyId     String
  designRequestId String? @unique
  designRequest DesignRequest? @relation(fields: [designRequestId], references: [id])
  codigo        String  // CÓDIGO ESPECIAL
  tipo          String?
  descripcion   String?
  imagen        String?
  precioVentaPublico Decimal? @db.Decimal(15,2)
  precioVentaDto     Decimal? @db.Decimal(15,2)
  cantRequerida Int?
  estado        String?
  createdAt     DateTime @default(now())
}

// ─────────────────────────── Transversales: Actividad & Archivos ───────────────────────────
model Activity {         // seguimiento + eventos del sistema (timeline/calendario/BI)
  id          String     @id @default(cuid())
  companyId   String
  entityType  EntityType
  clientId      String?
  opportunityId String?
  quoteId       String?
  orderId       String?
  accion      String     // config: contacto·Registrar·Llamada·Visita·Email·Observación·...
  fechaHora   DateTime
  observaciones String?
  userId      String?
  user        User?      @relation("ActivityUser", fields: [userId], references: [id])
  auto        Boolean    @default(false) // evento de sistema vs manual
  createdAt   DateTime   @default(now())
  @@index([entityType, clientId])
}

model Attachment {
  id          String     @id @default(cuid())
  companyId   String
  entityType  EntityType
  clientId      String?
  opportunityId String?
  quoteId       String?
  orderId       String?
  tipoArchivo String?
  bucket      String?    // "archivos" | "con_aprobacion" | "para_aprobacion"
  observaciones String?
  url         String
  createdAt   DateTime   @default(now())
}
```

> **Pendiente de afinar en migración:** back-relations restantes en `Company` (clients, opportunities, quotes, orders, etc.), índices adicionales, y si `Sector/SubSector/PriceList` se vuelven `Category` genéricas.

---

## 3. Estructura de carpetas (Next.js App Router)

```
jep-hub/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                # roles, permisos (54), parámetros/estados, empresa demo
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/        # público
│  │  ├─ firma/[token]/       # página pública de firma del cliente (fuera del shell)
│  │  ├─ (app)/               # zona autenticada (AppShell)
│  │  │  ├─ layout.tsx        # sidebar + topbar + command palette
│  │  │  ├─ dashboard/
│  │  │  ├─ clientes/         # page + [id] + nuevo
│  │  │  ├─ oportunidades/
│  │  │  ├─ cotizaciones/
│  │  │  ├─ pedidos/
│  │  │  ├─ backlog/
│  │  │  ├─ especiales/
│  │  │  ├─ reportes/         # calendario + BI embebido
│  │  │  └─ configuracion/    # categorias · tags · usuarios · parametros · roles
│  │  ├─ api/                 # route handlers: webhooks, firma callback, ofimatica
│  │  └─ layout.tsx           # ThemeProvider, density, providers
│  ├─ components/
│  │  ├─ ui/                  # shadcn/ui primitives (tematizados)
│  │  ├─ data-table/          # wrapper TanStack (orden/filtros/selección/densidad/export)
│  │  ├─ shell/               # sidebar, topbar, command-palette
│  │  ├─ timeline/  kanban/  status-badge/  money/  file-upload/
│  ├─ features/               # lógica de dominio por módulo
│  │  └─ <modulo>/
│  │       ├─ schema.ts       # Zod (validación + tipos)
│  │       ├─ queries.ts      # lecturas (Server Components)
│  │       ├─ actions.ts      # Server Actions (mutaciones, guard CASL + tenant)
│  │       └─ columns.tsx     # columnas de tabla
│  ├─ lib/
│  │  ├─ db.ts                # PrismaClient singleton
│  │  ├─ auth.ts              # better-auth (sesión, org/tenant)
│  │  ├─ abilities.ts         # defineAbilitiesFor(user) — CASL
│  │  ├─ tenant.ts            # withTenant / scoping por companyId
│  │  ├─ params.ts            # loader de estados/enums desde Parameter (cache)
│  │  ├─ pdf.ts               # render HTML→PDF (Puppeteer)
│  │  └─ format.ts            # moneda, fechas, "días transcurridos"
│  ├─ server/
│  │  ├─ queue/               # BullMQ (definición de colas/jobs)
│  │  └─ ofimatica/           # cliente + jobs de sync ERP
│  └─ styles/globals.css      # tokens claro/oscuro (de SISTEMA-DISENO.md)
├─ worker/index.ts            # proceso worker BullMQ (sync ofimática, PDFs, notif.)
├─ docker-compose.yml         # dev: postgres + redis (prod en ARQUITECTURA-DESPLIEGUE.md)
├─ Dockerfile                 # Next standalone + deps Chromium
├─ .env.example
└─ package.json
```

**Patrón por módulo (vertical slice):** `schema.ts` (Zod) → `queries.ts` (RSC) → `actions.ts` (Server Actions con guard) → `columns.tsx` + `page.tsx`. Cada mutación pasa por **guard CASL + scope de tenant** antes de tocar la BD.

---

## 4. Capas transversales (se construyen una vez, se reutilizan en todo)

| Capa | Qué resuelve |
|------|--------------|
| **Tenant** (`lib/tenant.ts`) | Inyecta `companyId` en toda query; imposible leer datos de otra empresa |
| **Auth** (`lib/auth.ts`) | Sesión, login, cambio de contraseña, cupos por rol |
| **RBAC** (`lib/abilities.ts`) | CASL: `can(action, subject)` desde `RolePermission` + `restriction` (scope "own") |
| **Params** (`lib/params.ts`) | Carga estados/enums (`icon/color`) desde `Parameter`; alimenta badges, selects, máquinas de estado |
| **DataTable** | Tabla estándar: orden, filtros por columna, búsqueda, selección masiva, fila expandible, densidad, export, skeleton/empty/error |
| **Activity/Timeline** | Registro manual + eventos automáticos; feed reutilizable (cliente/oportunidad/cotización/pedido) |
| **Attachments** | Subida a S3/R2/MinIO con buckets; tarjetas de archivo |
| **PDF** (`lib/pdf.ts`) | Cotización/pedido (normal y con despiece) vía job en el worker |

---

## 5. Sprints del MVP

> Cada sprint = commit(s) con incremento demostrable. MVP = Sprints 0–6 (ciclo comercial completo). Fase 2 = Sprints 7–10.

| Sprint | Objetivo | Entregable demostrable |
|:------:|----------|------------------------|
| **0** | **Fundaciones** | Next.js + Tailwind + shadcn con **tema teal + claro/oscuro + toggle densidad**; Prisma conectado a Postgres (docker-compose); AppShell (sidebar grafito + topbar + ⌘K) vacío; login básico |
| **1** | **Tenant + Auth + RBAC** | Modelos User/Role/Permission/Company; **seed de 8 roles + 54 permisos**; CASL + guard; menú que se muestra/oculta por permiso; pantallas **Usuarios** (con cupos) y **Roles** (matriz) |
| **2** | **Config & catálogos** | **Parámetros** (editor amigable por tipo + fallback JSON) como fuente de estados/enums; **Categorías** y **Tags**; `lib/params.ts` con badges por `icon/color` |
| **3** | **Clientes** ⭐ patrón base | CRUD + **ficha 360°** (contactos, adjuntos, timeline); dependencia P. Natural/Jurídica; importar por documento; embudo prospecto→cliente. Aquí nacen **DataTable, Activity y Attachments** reutilizables |
| **4** | **Oportunidades** | Listado con tarjetas-filtro por estado + **vista Kanban** + detalle con tabs (cotizaciones/ítems/pedidos) |
| **5** | **Cotizaciones** ⭐ núcleo | **Constructor de ítems** (buscador de productos con imagen, totales en vivo, IVA), workflow de estados, **PDF** (normal y despiece), **firma del cliente** (link + `/firma/[token]` público) |
| **6** | **Pedidos** | Generación desde cotización aprobada, **cadena de aprobaciones** (Ingreso/Fabricación/Instalación/Facturación), toggle instalación, PDF. **→ Fin del MVP** |
| **7** | **Integración ofimática** | Worker BullMQ: envío de pedido al ERP + recepción de hitos (tapicería/listo/despacho); notificaciones |
| **8** | **Diseño** | Backlog Diseño (PR-DI-01, asignación, entregables) + Biblioteca Especiales (catálogo + archivos/mensajes/histórico) |
| **9** | **Dashboard + Reportes** | Dashboard con KPIs + bandeja "Requiere atención"; Calendario (FullCalendar); **BI embebido (Metabase)** |
| **10** | **Endurecimiento + Deploy** | Docker prod, Caddy + TLS, backups, hardening; despliegue en Windows Server (ver ARQUITECTURA-DESPLIEGUE.md) |

### Detalle de los primeros sprints
- **S0 — Fundaciones:** inicializar Next 15 (TS, ESLint), Tailwind + shadcn (aplicar tokens de `SISTEMA-DISENO.md`), Prisma init, `docker-compose` (postgres+redis), estructura de carpetas, `.env.example`. **DoD:** app corre en dark/light, cambia densidad, hay login.
- **S1 — RBAC:** este sprint define cómo se protege *todo lo demás*, por eso va temprano. **DoD:** un Asesor y un Administrador ven menús/acciones distintos; matriz de permisos editable.
- **S2 — Config:** los estados de Cotización/Pedido/Backlog dependen de esto → debe existir antes de esos módulos. **DoD:** cambiar un color/estado en Parámetros se refleja en los badges.
- **S3 — Clientes:** primer slice vertical completo; consolida DataTable + Activity + Attachments que reusan S4–S8.

---

## 6. Convenciones de código

- **Vertical slices** en `features/<modulo>`; nada de lógica de dominio en componentes.
- **Server Actions** para mutaciones (siempre `guard(ability, ...)` + `withTenant`), **Server Components** para lecturas.
- **Zod** como única fuente de validación y tipos de entrada.
- **Estados/enums**: nunca hardcodear strings de estado — leerlos de `lib/params.ts`.
- **Dinero** siempre `Decimal` en BD y helper `formatMoney` en UI (cifras tabulares).
- **Commits** conventional (`feat:`, `fix:`, `chore:`, `docs:`) en rama `main`.

## 7. Riesgos / decisiones abiertas
- **Integración ofimática**: falta el contrato real (API/DB/archivos) del ERP → definir en S7.
- **BI**: confirmar si Metabase embebido o reconstrucción con charts propios (coste vs control).
- **Migración de datos** del CRM actual (opcional): si se requiere, planear ETL aparte.
- **"PT"** en Backlog: confirmar significado exacto del prefijo con el negocio.
- Storage de archivos: elegir R2 vs MinIO on-prem (coherente con despliegue).
