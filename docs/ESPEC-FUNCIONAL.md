# Especificación Funcional — CRM JEP Mobiliari (App propia inspirada)

> **Estado:** ✅ Completo — 16/16 módulos documentados a partir de capturas de pantalla.
> **Método de exploración:** Screenshots aportados por el usuario, módulo por módulo.
> **Producto observado:** "JEP Mobiliari CRM" — host `jep.toscanagestion.co`. Sector mobiliario (B2B: cotizaciones, pedidos, diseño/producción de mobiliario).
> **Regla de datos:** Todos los ejemplos están anonimizados. No se reproducen registros reales de clientes ni valores monetarios reales.

---

## 0. Rastreador de progreso

Leyenda: ⬜ pendiente · 🟡 parcial · ✅ completo

| # | Sección del entregable | Estado | Notas |
|---|------------------------|--------|-------|
| 1 | Sitemap / árbol de navegación | ✅ | Completo (16 ítems) con rutas confirmadas |
| 2 | Inventario de pantallas | ✅ | Todas las rutas confirmadas |
| 3 | Spec por módulo (A–G) | ✅ | 16/16 módulos documentados |
| 4 | Modelo de datos inferido | ✅ | Consolidado (entidades, atributos, relaciones, enums) |
| 5 | Sistema de diseño | ✅ | Paleta, tipografía, componentes y layout |
| 6 | Priorización MVP vs avanzado | ✅ | MVP vs Fase 2+ |

### Cobertura por módulo

| # | Módulo | Listado | Detalle | Crear | Editar | Modales | Estado |
|---|--------|:------:|:------:|:-----:|:-----:|:------:|--------|
| 1 | Principal (Dashboard) | n/a | n/a | n/a | n/a | n/a | 🟡 (vista capturada) |
| 2 | Clientes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | Oportunidades | ✅ | ✅ | 🟡 | 🟡 | ✅ | 🟡 (falta form alta/edición aislado) |
| 4 | Cotizaciones | ✅ | ✅ | 🟡 | 🟡 | ✅ | ✅ (falta editor de ítems aislado) |
| 5 | Pedidos | ✅ | ✅ | n/a | n/a | ✅ | ✅ (se genera desde cotización aprobada) |
| 6 | Backlog Diseño | ✅ | 🟡 | ✅ | n/a | ✅ | ✅ |
| 7 | Biblioteca Especiales | ✅ | ✅ | n/a | n/a | ✅ | ✅ |
| 8 | Reportes › Calendario Actividades | ✅ | — | — | — | — | ✅ |
| 9 | Reportes › BI Cotizaciones | ✅ | — | — | — | — | ✅ |
| 10 | Reportes › BI Pedidos | 🟡 | — | — | — | — | 🟡 (estructura; no cargó datos) |
| 11 | Reportes › BI Seguimiento | ✅ | — | — | — | — | ✅ |
| 12 | Configuración › Categorías | ✅ | n/a | ✅ | ✅ | n/a | ✅ |
| 13 | Configuración › Tags | ✅ | n/a | ✅ | ✅ | n/a | ✅ |
| 14 | Configuración › Usuarios | ✅ | n/a | ✅ | ✅ | ✅ | ✅ |
| 15 | Configuración › Parámetros | ✅ | n/a | ✅ | ✅ | n/a | ✅ |
| 16 | Configuración › Roles | ✅ | n/a | ✅ | ✅ | ✅ | ✅ |

---

## 1. Sitemap / Árbol de navegación

**Host base:** `jep.toscanagestion.co`
**Marca:** "JEP Mobiliari CRM" (logo isotipo tipo origami multicolor: triángulos rojo, azul, verde, amarillo formando una "M").

```
JEP Mobiliari CRM
│
├── 🏠 Principal ......................... /home            (Dashboard)
├── 👥 Clientes .......................... /clientes (?)    (Gestión de clientes)
├── 📈 Oportunidades ..................... /oportunidades (?) (Pipeline comercial)
├── 🗒️ Cotizaciones ...................... /cotizaciones (?)
├── 💵 Pedidos ........................... /pedidos (?)
├── 🎨 Backlog Diseño .................... /backlog-diseno (?) (Cola de trabajo de diseño)
├── 🎨 Biblioteca Especiales ............. /biblioteca-especiales (?) (Catálogo de piezas/productos especiales)
│
├── 📑 Reportes ▼  (grupo desplegable)
│     ├── 📅 Calendario Actividades ...... (?)  (Agenda de seguimiento/actividades)
│     ├── 📊 BI Cotizaciones ............. (?)  (Inteligencia de negocio - cotizaciones)
│     ├── 📊 BI Pedidos .................. (?)  (Inteligencia de negocio - pedidos)
│     └── 📊 BI Seguimiento .............. (?)  (Inteligencia de negocio - seguimiento)
│
└── ⚙️ Configuración ▼  (grupo desplegable)
      ├── 🗂️ Categorías .................. (?)
      ├── 🏷️ Tags ....................... (?)
      ├── 👤 Usuarios ................... (?)
      ├── ⚙️ Parámetros ................. (?)
      └── 👤 Roles ...................... (?)
```

> `(?)` = ruta inferida, pendiente de confirmar al visitar el módulo. La única ruta confirmada es `/home`.

### Barra superior (Header / Navbar)
De izquierda a derecha:
1. **Logo isotipo** (cuadro de color, ancla al inicio).
2. **☰ Botón hamburguesa** — colapsa/expande el sidebar.
3. **Título** "JEP Mobiliari" (nombre de la empresa/tenant).
4. *(espacio flexible)*
5. **🔍 Búsqueda** (icono lupa) — probable buscador global (por confirmar).
6. **❓ Ayuda** (icono interrogación) — acceso a ayuda/soporte.
7. **Avatar + nombre de usuario** ("MP — monica parrado") con **▾ menú desplegable** (perfil, cerrar sesión, etc. — por confirmar).

### Estructura de menú (3 zonas)
- **Zona operativa (accesos directos):** Principal, Clientes, Oportunidades, Cotizaciones, Pedidos, Backlog Diseño, Biblioteca Especiales.
- **Zona analítica (Reportes):** grupo colapsable con 4 reportes (1 calendario + 3 tableros BI).
- **Zona administración (Configuración):** grupo colapsable con maestros y seguridad (Categorías, Tags, Usuarios, Parámetros, Roles).

---

## 2. Inventario de pantallas

> Las URLs internas se confirman al visitar cada módulo. `/home` confirmada; el resto son rutas inferidas.

| # | Módulo | Vista | Propósito | Ruta / URL |
|---|--------|-------|-----------|------------|
| 1 | Principal | Dashboard | KPIs del mes + widgets de cotizaciones y probabilidad de cierre | `/home` ✅ |
| 2 | Clientes | Listado | Gestión de prospectos/clientes (embudo) | `/clients` ✅ |
| 2 | Clientes | Crear (prospecto) | Alta de prospecto | `/form_client//2` ✅ |
| 2 | Clientes | Editar | Edición de cliente/prospecto | `/form_client/{id}` ✅ |
| 2 | Clientes | Detalle / ficha | Ficha 360°: datos, oportunidades, cotizaciones, pedidos, actividad, contactos, archivos | `/show_client/{id}` ✅ |
| 2 | Clientes | Modal Importar | Importar prospecto/cliente por documento | `/clients#` (modal) ✅ |
| 3 | Oportunidades | Listado | Pipeline comercial (filtros por estado) | `/project_estimate/{estado}` ✅ |
| 3 | Oportunidades | Detalle | Cotizaciones, ítems para pedidos, pedidos, actividad | `/show_proyect/{id}?project_id={No}` ✅ |
| 4 | Cotizaciones | Listado | Cotizaciones con filtros por estado/antigüedad/plazo | `/quotes/{estado}` ✅ |
| 4 | Cotizaciones | Detalle | Documento de cotización: ítems, acabados, firma, PDF, actividad | `/show_proposal/{id}?proposal_id={No}` ✅ |
| 5 | Pedidos | Listado | Pedidos por estado de producción/facturación | `/table_orders` ✅ |
| 5 | Pedidos | Detalle | Documento de pedido, aprobaciones, fechas ofimática, instalación | `/show_order?order_id={No}` ✅ |
| 6 | Backlog Diseño | Listado/Tablero | Cola de diseño y desarrollo de producto (por estado) | `/backlog2/{estado}` ✅ |
| 6 | Backlog Diseño | Modal Nuevo producto | Planificación de diseño & desarrollo (PR-DI-01) | `/backlog2/{estado}` (modal) ✅ |
| 7 | Biblioteca Especiales | Catálogo (cards) | Catálogo de diseños/piezas especiales | `/special_designs` ✅ |
| 7 | Biblioteca Especiales | Modal detalle | Ficha del diseño especial (info/archivos/mensajes/histórico) | `/special_designs` (modal) ✅ |
| 8 | Reportes › Calendario Actividades | Calendario | Agenda de actividades por asesor/tipo | `/calendar` ✅ |
| 9 | Reportes › BI Cotizaciones | Tablero BI | Analítica de cotizaciones (embebido) | `/bi-cotizaciones` ✅ |
| 10 | Reportes › BI Pedidos | Tablero BI | Analítica de pedidos (embebido) | `/bi-pedidos` ✅ |
| 11 | Reportes › BI Seguimiento | Tablero BI | Analítica de seguimiento/probabilidad | `/bi-seguimiento` ✅ |
| 12 | Config › Categorías | CRUD | Maestro de categorías por entidad | `/categories` ✅ |
| 13 | Config › Tags | CRUD | Maestro de etiquetas | `/tags` ✅ |
| 14 | Config › Usuarios | CRUD | Gestión de usuarios + cupos por rol | `/users` ✅ |
| 15 | Config › Parámetros | CRUD (JSON) | Parámetros/enums del sistema (config store) | `/settings` ✅ |
| 16 | Config › Roles | Matriz permisos | Permisos × roles | `/rol_users` ✅ |

---

## 3. Especificación por módulo

### Módulo 1 — Principal (Dashboard) · sección D

**Ruta:** `/home` · **Título de página:** "Bienvenido {nombre de usuario}"

#### D.1 Tarjetas KPI (fila superior, 4 tarjetas)
Cada tarjeta = ícono cuadrado de color + título + subtítulo (periodo/estado) + valor grande.

| # | Título | Subtítulo | Valor (ejemplo anonimizado) | Color de ícono | Métrica que representa |
|---|--------|-----------|------------------------------|----------------|------------------------|
| 1 | **Cotizaciones activas** | `06-2026` (mes actual) | `120` | Rojo/rosa | Nº de cotizaciones activas en el mes corriente |
| 2 | **$ Cotizaciones** | `06-2026` | `$3.133,67 M` | Amarillo | Valor monetario total cotizado en el mes (en millones) |
| 3 | **Cant. Pedidos** *(en pantalla "Catn.")* | `En Curso` | `7.169` | Verde | Nº/cantidad de pedidos en curso |
| 4 | **$ Pedidos** | `En Curso` | `$51.674,84 M` | Azul/índigo | Valor monetario total de pedidos en curso (en millones) |

> Observaciones: los importes se muestran en **millones con sufijo "M"**. El periodo `06-2026` corresponde al mes en curso (jun-2026); sugiere KPIs filtrados por mes. La etiqueta del KPI 3 aparece como "Catn. Pedidos" (probable errata de "Cant. Pedidos").

#### D.2 Widget "Probabilidad de Cierre - Cotizaciones" (gráfico)
- **Tipo:** gráfico de **dona (donut)**.
- **Categorías (leyenda):** `Sin Definir`, `Fijo`, `Alta Probabilidad`.
- **Representa:** distribución de las cotizaciones según su probabilidad de cierre.
- **Controles del widget:** botón **— (minimizar)** y **✕ (cerrar)** → los widgets del dashboard son **colapsables/cerrables** (posible dashboard personalizable / arrastrable).

#### D.3 Widget "Cotizaciones {mes}" (tabla embebida)
Tabla de cotizaciones del mes con controles tipo DataTable.

- **Controles:** `Mostrar [10] registros` (selector de tamaño de página) · `Buscar:` (búsqueda en vivo).
- **Columnas:**

| Columna | Tipo de dato | Notas |
|---------|--------------|-------|
| `No` | Número (entero) | Nº de cotización; **enlace** al detalle. Lleva un toggle **➕** para expandir fila (sub-detalle) |
| `Nombre del cliente` | Texto | **Enlace** a la ficha del cliente |
| `Oportunidad` | Texto | Descripción/nombre de la oportunidad asociada |
| `Registrado por` | Texto | Usuario/vendedor que registró |
| `Total` | Moneda | Importe total de la cotización (`$xx,xxx,xxx.00`) |
| `Ultima Interacción` | Badge fecha + días | Ej. `05/jun./26 - 24 Dias`. **Badge rojo** = días transcurridos desde la última interacción (alerta de seguimiento) |
| `Acciones` | Botón | 👁️ **Ver** (botón azul con icono de ojo) |

- **Ordenamiento:** columnas ordenables (iconos ▲▼ en `No`, `Nombre del cliente`, `Oportunidad`, `Registrado por`, `Total`, `Ultima Interacción`).
- **Fila expandible:** el `➕` sugiere detalle inline (líneas/ítems o info ampliada de la cotización).
- **Semántica de color:** el badge rojo de "Ultima Interacción" funciona como **alerta de cotizaciones sin seguimiento reciente** (cuanto más días, más urgente).

#### Pendiente del Dashboard
- Confirmar si las tarjetas KPI son **clicables** (drill-down).
- Confirmar si hay más widgets debajo (scroll) o un selector de periodo.

---

### Módulo 2 — Clientes

**Concepto clave:** una misma entidad recorre un **embudo Prospecto → Cliente**. El módulo gestiona ambos estados en la misma tabla y ficha.

#### A) Vista de listado — `/clients`
**Cabecera:** título "Clientes" + 2 botones de acción primaria (arriba dcha.):
- **`Importar Prospectos o Clientes`** → abre modal (ver A.4).
- **`Registrar Prospecto`** → va al formulario de alta (`/form_client//2`).

**A.1 Tarjetas KPI del embudo (5 tarjetas):**
| Tarjeta | Formato | Ejemplo | Métrica |
|---------|---------|---------|---------|
| **Prospectos** | entero | `4.928` | Total de prospectos |
| **Gestión Prospectos** | `n / %` | `206 / 206.00%` | Prospectos en gestión + % |
| **Prospectos (Con Cotización)** | `n / %` | `794 / 794.00%` | Prospectos que ya tienen cotización + % |
| **Clientes** | entero | `903` | Prospectos convertidos en cliente |
| **Gestión Perdidas** | entero | `24` | Oportunidades/prospectos perdidos |
> El formato `n / %` muestra conteo y porcentaje (en las capturas el % supera 100%, probable cálculo sobre una base distinta — documentar como está y revisar fórmula al reimplementar).

**A.2 Barra de herramientas de la tabla:**
- **Exportar:** botones `CSV`, `Excel`, `Descargar Todos`.
- **Filtro por asesor:** dropdown `Todos` + botón `Asesores`.
- **`Mostrar [10] registros`** (tamaño de página) · **`Buscar:`** (búsqueda en vivo).

**A.3 Columnas de la tabla:**
| Columna | Tipo | Notas |
|---------|------|-------|
| `Nombres` | Texto + toggle `➕` | Nombre del cliente/empresa; expandible (ver A.5). Para prospectos sin nombre aparece vacío |
| `Documento del cliente` | Texto | NIT/documento (ej. `90042036-8`) |
| `Tipo de cliente` | Texto/enum | ej. `empresa` |
| `Email` | Email | |
| `Teléfono` | Texto | |
| `Nombres del asesor` | Texto + **filtro select en cabecera** | Asesor asignado; la cabecera incluye un `<select>` para filtrar |
| `Fecha registro` | Fecha | `dd/mmm/aa` |
| `Ultima interacción` | Badge fecha+días | **Badge rojo** `16/jun./25 - 379 Dias` = días desde la última interacción (alerta) |
| `Acción realizada` | Badge / `-` | Última acción comercial; ej. badge **verde** `Presentación Virtual`, o `-` si ninguna |
| `Acciones` | Botones | Ver A.6 |
- Columnas **ordenables** (▲▼).

**A.4 Modal "Importar Prospectos":**
- `Tipo de importación` (select; opción vista: *Importar por documento*).
- `Numero de documento` (texto).
- Botón **`Cargar Cliente`** · cierre `✕`.
- Propósito: traer datos de un prospecto/cliente por su documento (probable integración con fuente externa: ERP / registro mercantil).

**A.5 Fila expandible (toggle ➕/➖):** muestra campos extra inline:
- `Ciudad` (ej. Medellín) · `Canal` (ej. ERP) · `Estado` (ej. **GESTIÓN COTIZACIÓN**).

**A.6 Acciones por fila (3 botones azules):**
| Icono | Acción | Destino |
|-------|--------|---------|
| ✏️ Lápiz | Editar | `/form_client/{id}` |
| 👁️ Ojo | Ver ficha | `/show_client/{id}` |
| 👤➕ Persona+ | Gestionar/registrar actividad del cliente | `/show_client/{id}` (foco en registro de actividad/contactos) |

#### B) Formulario Crear / Editar — `/form_client//2` (crear) · `/form_client/{id}` (editar)
**Título:** "Datos Cliente - prospecto" (alta) / "Datos Cliente - cliente" (edición).

**B.1 Cabecera del formulario (3 campos):**
| Campo | Tipo | Obligatorio | Valores / notas |
|-------|------|:----:|------------------|
| `Tipo` | Select | Sí | `Persona Natural` · `Persona Juridica` — **controla los campos de Información Básica** (dependencia) |
| `Asignar Asesor` | Select | (Sí) | Lista de asesores; placeholder "Seleccione" |
| `Canal` | Select | (Sí) | ej. `ERP`; placeholder "Seleccione" |

**B.2 Información Básica — CAMPOS DEPENDIENTES de `Tipo`:**

*Si `Tipo = Persona Natural`:*
| Campo | Tipo |
|-------|------|
| `Nombres` | Texto |
| `Apellidos` | Texto |
| `Email` | Email |
| `Telefono` | Texto |
| `Tipo Documento` | Select (ej. CC) |
| `Numero Documento` | Texto |

*Si `Tipo = Persona Juridica`:*
| Campo | Tipo |
|-------|------|
| `Nombre Comercial` | Texto |
| `Razon Social` | Texto |
| `Email` | Email |
| `Telefono` | Texto |
| `Tipo Documento` | Select (ej. `NIT`) |
| `Numero Documento` | Texto (ej. `90042036-8`) |

**B.3 Datos De Ubicación:**
| Campo | Tipo | Notas |
|-------|------|-------|
| `Dirección` | Texto | |
| `Complemento Dirección` | Texto | |
| `País` | Select | Default `Colombia` |
| `Ciudad` | Select | Dependiente de País |
| `Observaciones` | Textarea | |

**B.4 Información Adicional:**
| Campo | Tipo | Notas |
|-------|------|-------|
| `Lista de precio` | Select | Default `Usuario Final` (afecta precios en cotización) |
| `Sector` | Select | ej. `CORPORATIVO` |
| `SubSector` | Select | ej. `MINERALES NO METALICOS`; dependiente de Sector |

**B.5 Botones:** `Registrar` (alta) / `Modificar` (edición) · `Volver`.

#### C) Vista de detalle / ficha 360° — `/show_client/{id}`
**Breadcrumb:** Home / cliente. **Título:** "Cliente - {nombre}". Layout de **3 columnas**.

**C.1 Columna izquierda — datos del cliente (card):**
- Etiqueta de tipo (`empresa`) + **badge de estado** (negro): ej. `Gestión cotización`, `Prospectos`.
- **Información Básica:** Email, Teléfono, Tipo Documento, Número Documento.
- **Datos de ubicación:** Dirección, Complemento Dirección, País, Ciudad.
- **Asesor asignado:** `Nombre del asesor` (select editable inline).
- Botón **`Acciones ▼`** (menú desplegable de acciones del cliente).
- **Información Adicional:** Lista de precio, Sector, SubSector.
- **CONTACTOS INTERNOS:** lista de contactos (ej. "Nicolle") con **editar** (👤 verde) y **eliminar** (✕ rojo); cada contacto: Email, Telefono, **Cargo** (ej. RRHH), Observación. (Soporta N contactos por cliente; botón para añadir.)

**C.2 Columna central — relaciones y archivos:**
- **Pestañas:** `Oportunidades` · `Cotizaciones` · `Pedidos` (cada una con su tabla: *Mostrar N registros*, *Buscar*, paginación *Anterior / 1 / Siguiente*).
  - Tabla Oportunidades: `N° Oportunidad`, `Nombre de la oportunidad`, `Asesor`, `Fecha registro`, `Estado`, `Acciones` (✏️ editar, 👁️ ver).
- **Subir Archivo:** `Tipo Archivo` (select), `Observaciones` (textarea), `Seleccionar archivo` (file upload) + listado **`Archivos`**.

**C.3 Columna derecha — cartera y actividad:**
- **Card `Saldo Cartera`** (teal): importe (`$ 0`) — saldo de cuenta por cobrar (integración con cartera/ERP).
- **Card `Registro de actividad`** (form de seguimiento):
  | Campo | Tipo | Obligatorio |
  |-------|------|:----:|
  | `Acción` | Select | **Sí** (*) |
  | `Fecha` | Date (`dd/mm/aaaa`) | **Sí** (*) |
  | `Observaciones` | Textarea | No |
  - Botón **`Registrar`**.
- **Timeline de actividad** (agrupado por día, ej. "16 June 2025"): eventos con icono de color + actor + texto + hora. Mezcla **eventos del sistema** y **seguimientos manuales**. Ejemplos de eventos auto-generados:
  - `Registro Cliente`
  - `creó contacto interno {X} a Cliente`
  - `ha convertido este prospecto a contacto con el nombre de {X}`
  - `Registró la Oportunidad {X} al cliente`

#### D) (No aplica — sin dashboard propio; KPIs de embudo descritos en A.1)

#### E) Flujos y estados (Cliente / Prospecto)
**Estados observados (badge):** `Prospectos` → `Gestión Prospectos` → `Gestión cotización` / `Prospectos (Con Cotización)` → `Cliente`; rama de salida `Gestión Perdida`.
```
Prospecto ──registra──▶ Gestión Prospectos ──crea oportunidad/cotización──▶ Gestión Cotización
     │                                                                            │
     └──────────────── Gestión Perdida (perdido) ◀───────────────────────────────┘
                                          convierte ▼
                                        CLIENTE (con cotización/pedido)
```
- **Conversión prospecto→cliente** registra evento en timeline y crea contacto.
- Cada cliente acumula **oportunidades, cotizaciones, pedidos, actividades, archivos y contactos**.

#### F) Transversales (en este módulo)
- **Exportar** CSV / Excel / Descargar Todos.
- **Importar** por documento.
- **Adjuntos** (subir archivo con tipo + observación).
- **Seguimiento/actividad** + timeline auditable.
- **Filtros** por asesor y por estado (dropdown "Todos").

#### G) Diseño (componentes nuevos vistos)
- **Botón de acción primaria** azul redondeado (Importar / Registrar Prospecto).
- **KPI cards** tipo embudo (formato `n / %`).
- **Badges**: rojo (alerta de días sin interacción), verde (acción realizada), negro (estado actual del cliente).
- **Tabla con filtro select embebido en cabecera de columna** (asesor) + fila expandible.
- **Tabs** (Oportunidades/Cotizaciones/Pedidos).
- **Timeline vertical** con iconos circulares de color por tipo de evento.
- **File upload** con dropzone/botón "Seleccionar archivo".
- **Dropdown "Acciones ▼"** contextual.
- **Card teal "Saldo Cartera"**.

---

### Módulo 3 — Oportunidades

> **Nota de nomenclatura interna:** la Oportunidad se llama internamente **"proyecto"** (`project_estimate`, `show_proyect`, `project_id`). En la UI siempre aparece como "Oportunidad".

#### A) Vista de listado — `/project_estimate/{estado}`
**Cabecera:** título "Oportunidades".

**A.1 Tarjetas-filtro por estado (4, actúan como pestañas/filtros clicables):**
| Tarjeta (estado) | Ejemplo | Significado |
|------------------|---------|-------------|
| **No Cotizadas** | `24` | Oportunidades sin cotización aún |
| **Pendiente aprobación** | `1.361` | Con cotización esperando aprobación (resaltada = filtro activo) |
| **Cotizadas** | `5.764` | Ya cotizadas/aprobadas |
| **Perdidas** | `1.805` | Oportunidades perdidas |
> Al hacer clic, la tabla se filtra por ese estado (la URL refleja el filtro, ej. `/project_estimate/9`).

**A.2 Barra de herramientas:** Exportar `CSV` / `Excel` / `Descargar Todos` · `Mostrar [10] registros` · `Buscar:`.

**A.3 Columnas:**
| Columna | Tipo | Notas |
|---------|------|-------|
| ☑️ (checkbox) | Selección | **Selección masiva** (acciones en lote) |
| `No.` | Número | N° de oportunidad; **enlace**; ordenable |
| `Oportunidad` | Texto | Nombre/descripción (ej. "SILLAS INTERLOCUTORAS OFICINAS NUEVAS") |
| `Cliente` | Texto | **Enlace** a ficha de cliente |
| `Asesor` | Texto + **select filtro en cabecera** | Asesor responsable |
| `Fecha de cierre` | Mes-Año (`MM-YYYY`) | Cierre proyectado |
| `Plazo` | Badge + **select filtro en cabecera** | Vigencia; badge **rojo `Vencida`** |
| `Fecha registro` | Fecha-hora | `dd/mmm/aa hh:mm` |
| `Estado` | Badge | **Rojo** `PENDIENTE APROBACIÓN - 971 Dias` (estado + días en ese estado) |
| `Acciones` | Botones | 👁️ Ver · 🗄️ Archivar (icono caja) |

#### C) Vista de detalle — `/show_proyect/{id}?project_id={No}`
**Breadcrumb:** Home / cliente: {cliente} / oportunidad: {nombre}. **Título:** "Oportunidad N° {No} - {nombre}". Layout **3 columnas**.

**C.1 Columna izquierda (card de la oportunidad):**
- Cliente (enlace) + `empresa` + **badge de estado** (`PENDIENTE APROBACIÓN`) + badge rojo `30/jun./26 - 971 Dias` (días en estado).
- `Nombre` (de la oportunidad), `Fecha De Cierre Proyectada` (`MM-YYYY`), `Contacto` (contacto del cliente), `Registrado Por` (select de usuario).
- Botón **`Acciones ▼`**.

**C.2 Columna central — 3 pestañas (núcleo del flujo):**
1. **`Cotizaciones`** — tabla: `No. Cotización`, `Oportunidad`, `Nombre Asesor`, `Total` (moneda), `Plazo` (badge `Vencida`), `Acciones` (✏️ editar · 👁️ ver · 📄 **duplicar/copiar** cotización). Fila con toggle `➕`. Paginación.
2. **`items disponibles para pedidos`** (`#tabs-orderGenerate`) — tabla de ítems de cotización aprobada listos para convertir en pedido: `Tipo`, `#`, `Referencia`, `Nombre`, `Cantidad`, `Descuento`, `Precio`, `Total`, `Acción`.
3. **`Pedidos en proceso`** (`#tabs-order-process`) — tabla: `No. Pedido`, `Nombre Asesor`, `Total`, `Estado`, `Acciones`.
- **Subir Archivo:** `Tipo Archivo`, `Observaciones`, `Seleccionar archivo` + listados **`Archivos`** y **`Archivos para aprobación`** (bucket separado para documentos de aprobación).

**C.3 Columna derecha — actividad:**
- **`Registro de actividad`**: `Accion` (select, *obligatorio*), `Fecha Hora` (datetime, *obligatorio*, ej. `30/06/2026 16:35`), `Observaciones` (textarea), botón `Registrar`.
- **Timeline** por fecha con iconos de color (👁️ verde = interacción/visita, 🔧 verde = actualización). Ej.: "{asesor} realizó una al cliente {X}", "{usuario} Actualizó la Oportunidad {X} al cliente {X}".

#### E) Flujo y estados (Oportunidad)
```
No Cotizada ──crea cotización──▶ Pendiente Aprobación ──aprueba──▶ Cotizada
     │                                                                │
     │                                                    items aprobados ▼
     └────────────▶ Perdida                              Items disponibles → Pedido (en proceso)
```
- Una oportunidad puede tener **varias cotizaciones**; la aprobada libera sus **ítems** para generar **pedidos**.
- Cada estado registra **días transcurridos** (alerta visual en badge).
- Acciones sobre cotización: **editar, ver, duplicar**.

#### F) Transversales
- Exportar CSV/Excel · selección masiva · adjuntos (con bucket "para aprobación") · seguimiento/actividad + timeline · archivar oportunidad.

#### G) Diseño
- **Tarjetas-filtro** clicables (la activa en teal sólido, inactivas en gris claro) — patrón de "tabs tipo KPI".
- **Badges de estado** rojos con contador de días.
- **Tabla con doble filtro select** en cabecera (Asesor + Plazo) y **checkbox masivo**.
- **Tabs internos** con icono de lista.
- Botón de acción extra **duplicar** (icono de copia).

---

### Módulo 4 — Cotizaciones ⭐ (núcleo del CRM)

> **Nomenclatura interna:** la Cotización se llama internamente **"proposal"** (`show_proposal`, `proposal_id`); el listado usa `/quotes`.

#### A) Vista de listado — `/quotes/{estado}`
**Cabecera:** título "Cotizaciones".

**A.1 Tarjetas-filtro por ESTADO del workflow (7 + 1):**
| Tarjeta (estado) | Conteo ej. | Monto ej. |
|------------------|-----------|-----------|
| **Todas** | 1.191 | $95.649 M |
| **Pendientes cotización** | 89 | … |
| **Pendientes plano comercial** | 10 | … |
| **Pendientes ficha comercial** | 2 | … |
| **Pendientes Aprobación** *(activa)* | 1.059 | … |
| **Aplazados / detenidos** | 112 | … |
| **Aprobadas** | 120 | … |
| **No aprobadas** *(card ancho aparte)* | 2.063 | … |
> Cada tarjeta muestra **conteo + suma monetaria** y filtra la tabla. Revelan el **pipeline de producción de la cotización**: cotización → plano comercial → ficha comercial → aprobación.

**A.2 Filtros adicionales agrupados:**
- **ANTIGÜEDAD** (semáforo): `0-30 días` (verde) · `30-90 días` (ámbar) · `+90 días` (rojo) — cada uno con conteo + monto.
- **PLAZO DE CIERRE**: `Este mes` · `Próximo mes` · `Largo Plazo` · `Vencida` — con conteo + monto.
- Filtro **`Todos` + `Asesores`** (por asesor).

**A.3 Barra de herramientas:** Exportar CSV/Excel/Descargar Todos · Mostrar N registros · Buscar.

**A.4 Columnas:**
| Columna | Tipo | Notas |
|---------|------|-------|
| ☑️ | Selección masiva | |
| `No` | Número | Enlace; ordenable |
| `Nombre del cliente` | Texto | Enlace a ficha |
| `Oportunidad` | Texto | Enlace a oportunidad |
| `Registrado por` | Texto + **filtro select** | Asesor |
| `Total` | Moneda | |
| `Plazo` | Badge + **filtro select** | `Vencida` (rojo) |
| `Estado` | Badge | `PENDIENTE APROBACIÓN` |
| `Dias Transcurridos` | Badge rojo | `20/nov./23 - 952 Dias` |
| `Fecha registro` | Fecha-hora | |
| `Fecha de cierre` | Mes-Año | |
| `Acciones` | Botones | 👁️ Ver · 📅 (agendar/calendario) · 🗄️ Archivar |

#### C) Vista de detalle — `/show_proposal/{id}?proposal_id={No}`
**Breadcrumb:** Home / cliente / oportunidad / cotización: No.{No}. **Título:** "Cotización N° {No}" + **badge de estado**. Layout **3 columnas**.

**C.1 Columna izquierda (card):**
- Cliente (enlace) + `empresa` + **badge estado** (`GESTIÓN PEDIDOS`) + badge rojo de días.
- ⭐ **`Probabilidad de Cierre`** — **slider/range interactivo** de 3 niveles: `Sin Definir` · `Alta Probabilidad` · `Fijo`.
- Información Básica (Email, Teléfono, Tipo/Número Documento), Datos de ubicación, Asesor asignado.
- Botón **`Visualizar Cotización en PDF`** (oscuro, con ojo).
- Botón **`Acciones ▼`** (ver C.4).

**C.2 Columna central — documento de cotización (tabs: `Cotizaciones` · `Pedidos`):**
- **Encabezado del documento:** `Fecha Creación`, `Cliente`, `Teléfono`, `Email`, `Oportunidad`, `Dirección Principal`, `Dirección de envío`, `Orden de compra`, `N°`, `Forma de pago` (ej. *50% ANTICIPO, SALDO TERMINADA INSTALACIÓN*), `Tiempo de entrega` (ej. *15 DÍAS HÁBILES*), `Fecha de vencimiento`.
- ⭐ **Tabla de ÍTEMS** (líneas de la cotización):
  | Columna | Tipo |
  |---------|------|
  | `Imagen` | Thumbnail del producto |
  | `Referencia` | Texto/código |
  | `Descripcion` | Texto |
  | `Precio` | Moneda (unitario) |
  | `Cantidad` | Número |
  | `Desc. (%)` | Porcentaje |
  | `Precio con desc.` | Moneda |
  | `Acabados` | Texto (acabado/material) |
  | `Observaciones Internas` | Texto |
  | `Total` | Moneda (línea) |
- **Totales:** `Subtotal` · `Impuesto (19%)` (IVA Colombia) · `Total`.
- ⭐ **Carátulas y separadores** (extensión JEP-Hub, no existía en el original): un ítem puede ser una **carátula** — línea-título (ej. *ISLA 8 PUESTOS*) que agrupa productos reales (jerarquía de 1 nivel: `LineItem.tipo` PRODUCTO/CARATULA/SEPARADOR + `parentId` + `posicion`) — o un **separador** — línea de **solo texto** para seccionar la cotización (ej. *PISO 1*, *PISO 2*), sin montos ni hijos. Reglas:
  - La carátula no tiene referencia, precio ni acabados propios; su valor mostrado **siempre se deriva** de la suma de sus productos (carátula y separador guardan montos en 0 → `sum(total de líneas) == subtotal` se mantiene).
  - Toda carátula debe tener **≥1 producto** y el separador un texto; el subtotal de la cotización suma **solo productos**.
  - **PDF/impresión y firma del cliente:** la carátula se imprime como **una sola línea con la suma**; el desglose no se muestra al cliente (ni siquiera viaja en el payload). El separador **sí** se imprime como fila de sección. La página de impresión acepta `?detalle=1` (uso interno) para listar además los productos internos.
  - Vistas internas (detalle de cotización/pedido): la carátula aparece **colapsada** (título + suma) con un botón para **desplegar** sus productos; en el builder cada carátula también se puede colapsar/desplegar. El correo de respaldo lista carátula + desglose y separadores.
  - **ERP ofimática:** carátulas y separadores **nunca** viajan como renglón de la CV (no existen en `MTMERCIA`); se insertan solo los productos.
  - Al generar el pedido y al duplicar la cotización, la estructura (carátulas + hijos + separadores) se copia completa.
- ⭐ **Acabados desde el ERP** (extensión JEP-Hub): al elegir un producto en el builder se consultan sus acabados en ofimática (`ZPROACA`/`ZACABADOS`: FORMICA, CANTO, HERRAJE, PAÑO…) y por cada uno aparece un **select buscable** con los materiales/colores disponibles (ítems `MTMERCIA` de esa familia + color `MT1CLAF`; en la lista se ve `CODIGO = DESCRIPCIO` y elegido muestra el color). Un acabado sin elegir queda **POR DEFINIR** (bloquea generar el pedido, como siempre). Las selecciones se guardan estructuradas (`LineItem.acabadosJson`) y el texto `acabados` que imprime el PDF/correo se **deriva** de ellas (`FORMICA: Formica blanco nevado [F8] · CANTO: POR DEFINIR`). Con el ERP fuera de línea el builder conserva el texto heredado del catálogo local.
- ⭐ **Productos de área** (extensión JEP-Hub): si `MTMERCIA.CODSBLIN='AREA'`, el ítem captura **Largo**, **Ancho** y el checkbox **Figura** (`LineItem.esArea/largo/ancho/figura`). Se muestran en detalle/PDF/correo ("Largo 1,20 × Ancho 0,60 · Figura") y al insertar la CV en el ERP se escriben en `MVTRADE.ZLARGO/ZANCHO/ZFIGURA` (UPDATE de los renglones recién creados, identificados por `ZRENGLON`).
- Campo `Observación`.
- **Subir Archivo** + listados `Archivos` y **`Archivos con aprobación`**.
- **Tab `Pedidos`:** si no hay, muestra "No tiene pedido generado, por el momento."

**C.3 Columna derecha:**
- **Card `Saldo Cartera`** (teal): saldo del cliente.
- ⭐ **Card `Producto por definir acabados`** (borde rojo): lista los **productos que requieren especificar materiales/acabados** antes de producir. Por producto: `Producto Principal`, `Código`, `Nombre`, y atributos a definir: **`Formica`**, **`Canto`**, **`Herraje`** (valor *POR DEFINIR*). → conecta con **Backlog Diseño / Biblioteca Especiales**.
- ⭐ **Card `Firma`** (flujo de aprobación del cliente): texto "Recuerde que para convertir esta cotización a pedido debe ser aprobada por el cliente" + botones **`Copiar link de firma para el cliente`** (firma electrónica remota) y **`Verificar estado de la cotización`**.
- **`Registro de actividad`** (Accion*, Fecha Hora*, Observaciones, Registrar).
- **Timeline** de cambios de estado (iconos 👍 de color por evento). Ej.: "{asesor} ha pasado a **Enviada/Detenido/Pendiente Aprobación** del cliente de Cotización N° {No}".

**C.4 Menú `Acciones ▼` (acciones de la cotización):**
| Acción | Propósito |
|--------|-----------|
| `Items Cotización` | Editar líneas/ítems |
| `Solicitar planos/cambios` | Enviar a diseño (→ Backlog Diseño) |
| `Solicitar ficha comercial` | Generar ficha comercial |
| `Cliente para facturación` | Asignar datos de facturación |
| `Descargar cotización en PDF` | PDF estándar |
| `Descargar cotización con despiece en PDF` | PDF con **despiece** (BOM/materiales) |
| `Aprobación del cliente` | Marcar aprobada |
| `Volver a la oportunidad` | Navegación |
| `Ver cliente` | Navegación |
| `Cotización Detenida` (ámbar) | Pausar |
| `Cotización no aprobada` (rojo) | Rechazar |

#### E) Flujo y estados (Cotización)
```
Pendiente cotización → Pendiente plano comercial → Pendiente ficha comercial
        → Enviada (envío al cliente) → Pendiente Aprobación
              ├─ Aprobada ─▶ GESTIÓN PEDIDOS (genera pedido)
              ├─ Detenida / Aplazada
              └─ No aprobada (rechazada)
```
- **Probabilidad de cierre** ajustable por slider.
- **Conversión a pedido** requiere **aprobación del cliente** (firma electrónica vía link).
- Productos con **acabados "POR DEFINIR"** deben completarse (planos/ficha) → integra el flujo de diseño.
- Cada transición se **audita** en el timeline.

#### F) Transversales
- Exportar CSV/Excel · selección masiva · **PDF (estándar y con despiece)** · **firma electrónica remota** · adjuntos (con bucket "con aprobación") · seguimiento/actividad · duplicar cotización (desde oportunidad) · archivar.

#### G) Diseño
- **Banco de tarjetas-filtro** (7+) con conteo + monto; semáforo de antigüedad (verde/ámbar/rojo).
- **Slider de probabilidad** de 3 puntos.
- **Documento tipo factura** embebido con tabla de ítems con **thumbnails**.
- **Cards laterales** especiales: "Producto por definir acabados" (borde rojo de alerta) y "Firma".
- Botones PDF (oscuro) y de aprobación (verde) bien diferenciados por color.
- **Timeline** con iconos 👍 por cambio de estado.

---

### Módulo 5 — Pedidos

> **Nomenclatura interna:** `show_order` / `order_id`; listado `/table_orders`. Un pedido se **genera desde una cotización aprobada** (no hay alta manual directa). Integra con **"ofimática"** (ERP/sistema de producción externo).

#### A) Vista de listado — `/table_orders`
**Cabecera:** título "Pedidos".

**A.1 Tarjetas-filtro por estado del flujo de producción/facturación (9 + 1):**
| Tarjeta (estado) | Conteo ej. | Monto ej. |
|------------------|-----------|-----------|
| Pendiente creación de cliente | 0 | $0 |
| Pendiente ficha técnica | 6 | … |
| Pendiente creación de referencia | 3 | … |
| Pedidos con cartera vencida | 6 | … |
| Pendiente Ingreso | 1 | … |
| **En Producción** | 85 | $1.183 M |
| **Instalación** | 157 | $2.736 M |
| **Pendientes Facturación** | 6.774 | $47.135 M |
| **Pedidos Facturados** | 41 | … |
| **Pedidos Denegados** *(card ancho aparte)* | 102 | … |
> Cada tarjeta = conteo + suma monetaria, y filtra la tabla.

**A.2 Barra de herramientas:** Exportar CSV/Excel/Descargar Todos · Mostrar N · Buscar.

**A.3 Columnas:**
| Columna | Tipo | Notas |
|---------|------|-------|
| ☑️ | Selección masiva | |
| `No` | Número | Enlace; ordenable |
| `Cliente` | Texto | Enlace |
| `Registrado por` | Texto | Asesor |
| `Total` | Moneda | |
| `Estado` | Badge | `PENDIENTE FACTURACIÓN`, etc. |
| `Tipo de producto` | Badge | `Estándar` (vs especial) |
| `Acciones` | Botones | 👁️ Ver · 🗄️ Archivar |

#### C) Vista de detalle — `/show_order?order_id={No}`
**Breadcrumb:** Home / {cliente} / cotización: No.{Nc} / pedido: No.{No}. **Título:** "Información del pedido N° {No}" + **badge de estado**. Layout **3 columnas**.

**C.1 Columna izquierda:** idéntica a cotización (cliente, datos, ubicación, asesor) + **`Visualizar pedido en PDF`** + **`Acciones ▼`**.

**C.2 Columna central — documento del pedido (tabs `Pedido` · `Código especial`):**
- **Encabezado:** Fecha Creación, Cliente, Teléfono, Email, Dirección Principal/envío, Orden de compra, N°, Forma de pago (ej. *CRÉDITO*), Tiempo de entrega, Fecha de vencimiento.
- **Tabla de ÍTEMS** (igual que cotización): Imagen, Referencia, Descripción, Precio, Cantidad, Desc.(%), Precio con desc., **Acabados** (ej. *PAÑO: TELA MURANO NEGRO*), Observaciones Internas, Total. *(Incluye líneas tipo `FLETE` para transporte.)*
- **Totales:** Subtotal · Impuesto (19%) · Total.
- **Subir Archivo** + **Archivos** (con **tarjetas de PDF descargables**: "Documentos De Apoyo", "Orden de compra", con fecha y observación) + **Archivos con aprobación**.
- **Tab `Código especial`:** gestión de códigos/piezas especiales (adjuntos).

**C.3 Columna derecha — aprobaciones e integración de producción:**
- ⭐ **`Aprobación Facturación`** (card): `Aprobación` (select, *obligatorio*), `Observación`, `Aprobado por` (usuario), botón `Registrar`.
- ⭐ **`Enviar pedido a ofimática`** (card): `Estado del proceso` (badge `ENVIADO`), `identificador de cotización` (badge), `Fecha de envío`. → **envía el pedido al ERP de producción ("ofimática")**.
- ⭐ **`¿Este pedido requiere instalación?`** (card): `Requiere Instalación` (**toggle/switch**).
- ⭐ **`Fechas del pedido en ofimática`** (card de hitos de producción): `N° pedido ofimática`, `Fecha Creación`, `Fecha Tapicería` (+ nota, ej. "NO HAY SILLA … EN ALMACÉN"), `Fecha Vencimiento`, `Fecha Listo`, `Fecha Despacho`, `Notas Generales`. (Badges verdes con fecha.)
- **Timeline** de **aprobaciones secuenciales** (iconos 👍): "Aprobación Ingreso Pedido" → "Aprobación Fabricación" → "Aprobación Instalación" → "Aprobación Facturación", cada una con actor, fecha y observación.

#### E) Flujo y estados (Pedido) — cadena de aprobaciones + producción
```
Cotización APROBADA ──genera──▶ PEDIDO
   │
   ├─ Aprobación Ingreso Pedido ──▶ Pendiente Ingreso
   ├─ (Pendiente ficha técnica / creación de referencia)
   ├─ Enviar a ofimática (ERP)  ──▶ En Producción
   │        └─ hitos ofimática: Tapicería → Listo → Despacho
   ├─ Aprobación Fabricación
   ├─ ¿Requiere instalación? → Aprobación Instalación → Instalación
   ├─ Aprobación Facturación  ──▶ Pendientes Facturación → Pedidos Facturados
   └─ (rama) Pedidos Denegados
```
- **Múltiples gates de aprobación** por distintos roles (ingreso, fabricación, instalación, facturación).
- **Integración bidireccional con ofimática**: se envía el pedido y se reciben **fechas de producción** (tapicería, listo, despacho).
- Control de **cartera vencida** a nivel de pedido.

#### F) Transversales
- Exportar · selección masiva · **PDF del pedido** · adjuntos (apoyo, orden de compra, con aprobación) · seguimiento/timeline de aprobaciones · integración ERP "ofimática".

#### G) Diseño
- Mismo patrón de 3 columnas que cotización.
- **Cards de aprobación** (con select + "Aprobado por") y **cards de integración** (badges de estado `ENVIADO`, identificadores).
- **Toggle/switch** (requiere instalación).
- **Tarjetas de archivo PDF** con icono rojo, fecha, observación y descarga.
- **Card de hitos** con fechas en badges verdes.

---

### Módulo 6 — Backlog Diseño (diseño y desarrollo de producto)

> Cola de trabajo del área de **diseño/I+D**. Recibe solicitudes desde cotizaciones (acción "Solicitar planos/cambios") o como productos **[INTERNO]** (desarrollo propio). Sigue un proceso tipo **ISO 9001** de control de diseño (código de procedimiento **PR-DI-01**).

#### A) Vista de listado — `/backlog2/{estado}`
**Cabecera:** título "{estado} (Total N)" + botón **`Nuevo producto`**.

**A.1 Tarjetas-filtro por estado (9, con color):**
| Estado | Ej. | Color |
|--------|-----|-------|
| **PT precio comercial** *(activa)* | 3 | gris |
| **Especial sin aprobar cliente** | 101 | claro |
| **PT asignar diseñador** | 0 | claro |
| **PT Ficha Técnica** | 4 | claro |
| **PT Aprobación FT** | 1 | claro |
| **Proceso de diseño** | 37 | claro |
| **Pendiente Validación** | 241 | claro |
| **Rechazados** | 303 | **rojo** |
| **Finalizados** | 41 | **verde** |
> *PT* = prefijo de producto/etapa; *FT* = Ficha Técnica. (Confirmar significado exacto de "PT".)

**A.2 Barra de herramientas:** Exportar CSV/Excel · Mostrar N · Buscar.

**A.3 Columnas:**
| Columna | Tipo | Notas |
|---------|------|-------|
| `Tipo` | Texto/enum | `[INTERNO]` o enlace a `Cotización N°… (estado)` |
| `Imagen` | Thumbnail | Render/foto del producto |
| `Cliente` | Texto | `[INTERNO]` o cliente |
| `Asesor` | Texto | |
| `Fecha solicitud` | Fecha-hora | |
| `Descripción` | Texto largo | **DATOS DE ENTRADA** + **REQUISITOS TÉCNICOS** ("Leer más") |
| `N° pedido (Ofimática)` | Texto | Si ya pasó a producción |
| `Diseñador` | Texto | Asignado |
| `Estado` | Texto | Estado actual del backlog |
| `Despiece` | Archivo/✓ | Entregable de diseño |
| `Armado General` | Archivo/✓ | Entregable de diseño |
| `Planos Técnicos` | Archivo/✓ | Entregable de diseño |
| `Acciones` | Botón | 👁️ Ver |

#### B) Modal "Nuevo producto" — `PLANIFICACIÓN DE DISEÑO & DESARROLLO (PR-DI-01)`
Formato de planificación de diseño (campos de texto):
| Campo | Tipo |
|-------|------|
| `DATOS DE ENTRADA` | Texto |
| `REQUISITOS TÉCNICOS` | Texto |
| `REQUISITOS FUNCIONALES Y DESEMPEÑO` | Texto |
| `POSIBLES ASPECTOS A FALLAR` | Texto |
| `REQUISITOS LEGALES Y REGLAMENTARIOS` | Texto |
| `INFORMACIÓN DE DISEÑOS PREVIOS (REFERENTES)` | Texto |
- Botones: `Guardar` · `Cerrar`.

#### E) Flujo y estados (Backlog Diseño)
```
Solicitud (cotización "Solicitar planos" o producto [INTERNO])
  → PT precio comercial → (Especial sin aprobar cliente)
  → PT asignar diseñador → PT Ficha Técnica → PT Aprobación FT
  → Proceso de diseño → Pendiente Validación
  → Finalizado  |  Rechazado
```
- Entregables de diseño: **Despiece, Armado General, Planos Técnicos**.
- Una vez finalizado, el producto puede pasar a **Biblioteca Especiales** y/o generar **N° pedido en ofimática**.

#### F/G) Transversales y diseño
- Exportar CSV/Excel · búsqueda · modal de planificación ISO · thumbnails · cards-filtro con **semáforo** (rojo rechazados / verde finalizados).

---

### Módulo 7 — Biblioteca Especiales (Diseños especiales)

> Catálogo de **piezas/productos a medida** (CÓDIGO ESPECIAL) ya diseñados; reutilizables y trazables a pedidos.

#### A) Vista de catálogo — `/special_designs`
**Cabecera:** "Diseños especiales (Total N)" + buscador "Buscar diseños especiales…".
- **Grid de tarjetas** (3 columnas). Cada **card**:
  - `Tipo` (ej. *CONVERTIDA A PEDIDO*) · `Asesor` · `Fecha de creación` · `Precio` · `Descripción` (ej. *MESA HEXAGONAL DIÁMETRO 1200 CON CONECTIVIDAD*) · **imagen** (render 3D o foto) · botón 👁️ Ver.

#### C) Modal de detalle (botón 👁️)
- Encabezado: **diseñador/creador**, `Pedido #{n}` + **badge estado** (ej. *FACTURADO*), imagen.
- **Pestañas:** `Información` · `Archivos` · `Mensajes` · `Histórico`.
- **Información:** `Producto` (CÓDIGO ESPECIAL), `Asesor`, `Fecha de creación`, `Descripción`, `Precio estimado venta Público`, `Precio estimado venta Dto`, `Cant. requerida`.
- `Archivos` (adjuntos del diseño), `Mensajes` (colaboración/chat interno), `Histórico` (trazabilidad de cambios).

#### F/G) Transversales y diseño
- Búsqueda · **layout de catálogo en cards con imagen** · **modal con tabs** (info/archivos/mensajes/histórico) · trazabilidad a pedido.

---

### Módulos 8–11 — Reportes

> Grupo colapsable con 1 **calendario** + 3 **tableros BI** de analítica embebida (la UI y filtros sugieren un **motor BI tipo Apache Superset**: filtros con "Apply/Clear All", tablas dinámicas/pivote, treemap, series temporales, KPIs con sparkline).

#### 8. Calendario de Actividades — `/calendar`
- **Panel izquierdo "Selecciona un asesor":**
  - `Asesores` (select).
  - `Opciones` — **chips de tipo de actividad** (multiselección) = catálogo de acciones: **contacto · Registrar · Detenido · Denegado · Aprobado · Perdida · Enviada · Llamada · Visita · Email · Observación**.
  - Botón `Mostrar 🔍`.
- **Calendario (FullCalendar):** vista `month / week / day`, navegación `‹ › today`, título "mes de año", resalta el día actual. Muestra las actividades/seguimientos como eventos según filtro.
> ⭐ Los chips confirman el **enum de `Acción`** usado en "Registro de actividad" de clientes/oportunidades/cotizaciones/pedidos.

#### 9. BI Cotizaciones — `/bi-cotizaciones`
- **Filtros (barra superior):** `Periodo*` (ej. *Last month*), `Asesor` (multiselección, "14 options"), botones `APPLY` / `Clear All`.
- **Widgets:**
  1. **Etapa Cotizaciones por Asesor (Último Año)** — tabla **pivote** (filas=asesor, columnas=estado, métrica `SUM(total)`, columna `Total (Sum)`).
  2. **Cotizaciones Por Semana** — pivote (filas=asesor, columnas=semanas de `created_at`) con **formato condicional** (celdas resaltadas).
  3. **Cotizaciones por Asesor** — **serie temporal multilínea** ($ por día, una línea por asesor; leyenda, All/Inv, paginación).
  4. **KPIs (big-number con sparkline):** `Cotizaciones` (261) · `Total Cotizado (Millones)` ($3.679,36) · `Convertidas a Pedido` (137) · `Convertido a Pedido (Millones)` ($485,72) · `Cantidad Clientes` (157).
  5. **Tasa Conversión** — **pie** (Pendiente 86,8% / Aprobada 13,2%).
  6. **Conversión Por Asesor** — tabla (% Aprobada / % Pendiente por asesor).
  7. **Top Cotizaciones** — data table (id, asesor, client, estado, probabilidad, SUM(total)) con buscador, paginación y fila de Totales.
  8. **Estado Cotizaciones** — **treemap** por estado.
  9. **Participación** — **pie** por asesor (%).

#### 10. BI Pedidos — `/bi-pedidos`
- **Filtros:** `VENDEDOR`, `FECHA` (ej. *previous calendar…*), `APPLY` / `Clear All`.
- **Widgets (estructura; en la captura los datos no cargaron):** `PEDIDOS TOTAL` · `TOTAL PEDIDOS` · `CANTIDAD PEDIDOS` · `CANTIDAD CLIENTES` · `PEDIDOS POR VENDEDOR` · `TOP CIUDADES`.
> ⚠️ Documentado a nivel de estructura/títulos; el tablero mostró spinner sin datos al capturar.

#### 11. BI Seguimiento — `/bi-seguimiento`
- **Filtros:** `Periodo*` (ej. *Last year*), `Asesor` (17 options), `Estado` (ej. *4 - Pendiente Aprobación*), `APPLY` / `Clear All`.
- **Widgets:**
  1. **Probabilidad** — **pie** por probabilidad de cierre (Sin Definir / Alta Probabilidad / Fijo) con montos $.
  2. **Participación** — **pie** por asesor (%).
  3. **Top Cotizaciones** — data table (id, asesor, client, estado, probabilidad, SUM(total)); "836 records".

#### F/G) Transversales y diseño (Reportes)
- Filtros comunes: **Periodo, Asesor, Estado** con `Apply/Clear All`.
- Componentes: **FullCalendar**, tablas pivote con formato condicional, **series temporales multilínea**, **pie/dona**, **treemap**, **KPIs big-number con sparkline**, data tables con búsqueda/paginación.
- **Recomendación de reimplementación:** BI embebido (Superset/Metabase) o construido con librería de charts (ECharts/Recharts) + endpoint de agregaciones.

---

### Módulos 12–16 — Configuración

> Patrón común: **layout de 2 columnas** (formulario a la izquierda + tabla/matriz a la derecha con Mostrar N / Buscar / paginación / acciones ✏️❌).

#### 12. Categorías — `/categories`
**"Administración de Categorías".**
- **Form "Registrar Categoría":** `Entidad` (select, *obligatorio*) · `Nombre` (texto, *obligatorio*) · `Registrar`.
- **Tabla:** `Entidad` · `Nombre` · `Fecha Registro` · `Acciones` (❌ eliminar, ✏️ editar). (71 registros.)
- ⭐ **Concepto:** catálogo **genérico parametrizable por `Entidad`**. Ej.: `entidad=client` → *cliente, prospecto, contacto, Pagaduría*; `entidad=channel` → *Página Web, Redes sociales, Teléfono, Correo, Whatsapp, Gestión Prospecto*. → alimenta selects como **Canal** y tipos de cliente.

#### 13. Tags — `/tags`
**"Administración de Tags".**
- **Form "Registrar Tags":** `Nombre Del Tags` (texto, *obligatorio*) · `Registrar`.
- **Tabla:** `Nombre` · `Fecha Registro` · `Acciones` (❌/✏️). Ej.: *Empleado, Independiente, Pensionado*. (Etiquetas para clasificar clientes/personas.)

#### 14. Usuarios — `/users`
**"Administración de usuarios".**
- **Form "Registrar Usuario":**
  | Campo | Tipo | Obl. |
  |-------|------|:----:|
  | `Nombre` | Texto | ✱ |
  | `Email` | Email | ✱ |
  | `Contraseña` | Password | ✱ |
  | `Perfil` | Select (rol) | ✱ |
  | `Idioma` | Select (Español…) | ✱ |
  | `Estado Usuario` | Select (ACTIVO/INACTIVO) | ✱ |
  | `Cargo Actual` | Texto | |
  | `Número de documento` | Texto | |
  | `Número Telefónico` | Texto | |
  | `Registrado por` | Texto (auto) | |
- ⭐ **Tarjetas de cupo por rol (usados / límite):** `Asesor 15/20` · `Diseñador 2/5` · `Administrador 1/2` · `Diseñador Comercial 1/5` · `Analista de Cartera 0/1` · `Analista de Pedido 1/2` · `Jefe de compra 0/1` · `Consultor 3/3` · **`Total de usuarios 23/39`** → **licenciamiento por rol**.
- **Tabla:** `Nombre` · `Email` · `Empresa` · `Información adicional` (Cargo, Nº documento, Nº telefónico, **`codven`** = código vendedor ERP) · `Perfil` (filtro select) · `Fecha registro` · `Último ingreso` · `Estado Usuario` (ACTIVO / INACTIVO / **CAMBIO DE CONTRASEÑA**) · `Acciones` (❌ eliminar, ✅ activar, ✏️ editar, ↪️ reset/enviar, 👤➕ asignar).

#### 15. Parámetros — `/settings`
**"Administración de Configuración".**
- **Form "Editar Configuración":** `Configuración` (clave, texto, *obligatorio*) · `Valor` (**editor de código ACE**, contenido **JSON**) · `Company Id` (número) · `Registrado por` · `Registrar`.
- **Tabla "Parámetros de Configuración":** `Parametro` (clave) · `Valor` (JSON) · `Fecha Registro` · `Fecha Actualización` · `Company Id` · `Acciones` (✏️).
- ⭐⭐ **Store de configuración clave-valor (JSON) que define TODOS los enums/máquinas de estado del sistema.** Ejemplos observados:
  - `action_activities`: tipos de actividad con `value/id/icon(fa-*)/color` (Presentación Virtual, Llamada, Visita, Email, Observación…).
  - `approved_types`: PENDIENTE(0) · APROBADO(1) · NO APROBADA(2) · DETENIDO(3).
  - `approved_type_ctz` (cotización): PENDIENTE · COMPLETADO · PTE ORDEN DE COMPRA · PTE MERCANCÍA · DENEGADO · DETENIDO.
  - `approved_type_design`: PENDIENTE · SI · NO · DETENIDA.
  - `approved_type_send`: PENDIENTE · ENVIADA · PERDIDA · DETENIDA.
  - `approved_type_estimator`, `approved_type_filing`, `approved_installation`, `approved_types_hold`, etc.
  - `file_types` (JEP-Hub): catálogo del select **Tipo Archivo** al subir adjuntos — Ficha técnica (aprobación cliente) · Plano comercial (aprobación cliente) · Contrato · Documentos de apoyo · Orden de compra · Soporte de pago.
  - `Company Id` → **multi-tenant** (parámetros por empresa).
> Implicación para reimplementación: modelar los **estados como catálogo configurable** (no hardcodeados), con `icon` y `color` por valor.

#### 16. Roles — `/rol_users`
**"Roles de Usuarios" → matriz de Permisos.**
- Botón **`Registrar permiso`** · Exportar CSV/Excel/Descargar Todos · Mostrar N · Buscar.
- **Matriz (tabla):** `Permisos` (clave, ej. `clients.create`) · `Nombre del permiso` (humano) · **una columna por ROL** con badge **ACTIVO (verde) / INACTIVO (gris)** · `Acciones` (❌/✏️). (54 permisos.)
- **8 roles:** `Administrador` · `Asesor` · `Diseñador` · `Diseñador Comercial` · `Analista de Cartera` · `Analista de Pedido` · `Jefe de compra` · `Consultor`.
- **Convención de permisos:** `{modulo}.{accion}` — ej. `backlog_design.approved_files` (Aprobación de archivos en backlog), `backlog_design.view`, `categories.view`, `clients.assign` (Asignación de asesor), `clients.create`, `clients.createcontact`, `clients.deletecontact`, `clients.editcontact`, `clients.list_price` (Asignar lista de precio)…
- **Modal `Nuevo permiso` / `Editar roles`:** `Permiso` (clave) · `Nombre Del Permiso` + por cada rol un **checkbox** (activar) y un campo **`Restricción`** (alcance/scope por rol, ej. limitar a registros propios). Botones `Cerrar` / `Registrar permiso` / `Modificar`.

#### F/G) Transversales y diseño (Configuración)
- CRUD con **form + tabla** en 2 columnas; **editor de código (ACE)** para JSON; **matriz de permisos** con badges por celda; **tarjetas de cupo** (usados/límite).
- **Modelo de seguridad:** RBAC con permisos `{modulo}.{accion}`, asignación por rol y **restricción de alcance** opcional por rol.

---

## 4. Modelo de datos inferido

> Consolidado a partir de los 16 módulos. Nombres internos reales entre paréntesis cuando se conocen.

**Entidades:**

- **Cliente / Prospecto** — `id`, `tipo_persona` (Persona Natural | Persona Juridica), `tipo_cliente` (ej. empresa), `estado` (Prospecto | Gestión Prospectos | Gestión Cotización | Cliente | Gestión Perdida), `nombres`/`apellidos` (P. Natural) ó `nombre_comercial`/`razon_social` (P. Jurídica), `email`, `telefono`, `tipo_documento`, `numero_documento`, `direccion`, `complemento_direccion`, `pais`, `ciudad`, `observaciones`, `lista_precio`, `sector`, `subsector`, `canal`, `asesor_id`, `fecha_registro`, `ultima_interaccion`, `saldo_cartera`. [1—N Oportunidad/Cotización/Pedido/Contacto/Actividad/Archivo]
- **Contacto Interno** — `id`, `cliente_id`, `nombre`, `email`, `telefono`, `cargo`, `observacion`. [N—1 Cliente]
- **Actividad / Seguimiento** — `id`, `entidad` (cliente | oportunidad | cotización | pedido), `entidad_id`, `accion` (enum: *contacto · Registrar · Detenido · Denegado · Aprobado · Perdida · Enviada · Llamada · Visita · Email · Observación*), `fecha`/`fecha_hora`, `observaciones`, `usuario_id`, `auto` (sistema/manual). Alimenta el timeline, el Calendario y "BI Seguimiento" + "Ultima Interacción".
- **Archivo** — `id`, `cliente_id`, `tipo_archivo`, `observaciones`, `ruta/blob`.
- **Asesor** *(= Usuario con rol comercial)* — `id`, `nombre`.
- **Oportunidad** *(interna: "Proyecto" / project_estimate)* — `id` interno, `no` (N° visible), `cliente_id`, `nombre/descripcion`, `contacto` (contacto del cliente), `asesor_id`, `registrado_por`, `fecha_registro`, `fecha_cierre_proyectada` (MM-YYYY), `estado` (enum: *No Cotizada · Pendiente Aprobación · Cotizada · Perdida*), `plazo`/`vencida`, `probabilidad_cierre` (enum: *Sin Definir · Fijo · Alta Probabilidad*), `dias_en_estado`. [1—N Cotización] [1—N Archivo]
- **Cotización** *(interna: "proposal")* — `id` interno, `no` (N°), `cliente_id`, `oportunidad_id`, `registrado_por`/`asesor`, `fecha_creacion`, `fecha_registro`, `fecha_vencimiento`, `fecha_cierre`, `forma_pago`, `tiempo_entrega`, `orden_compra`, `direccion_principal`, `direccion_envio`, `observacion`, `subtotal`, `impuesto` (IVA 19%), `total`, `probabilidad_cierre` (Sin Definir·Alta Probabilidad·Fijo), `estado` (enum del workflow ↓), `plazo`/`vencida`, `dias_transcurridos`, `datos_facturacion`. [1—N Ítem] [1—N Archivo]
  - **estado (workflow):** *Pendiente cotización · Pendiente plano comercial · Pendiente ficha comercial · Enviada · Pendiente Aprobación · Aprobada (Gestión Pedidos) · Detenida/Aplazada · No aprobada*.
- **Ítem de cotización / pedido** — `id`, `cotizacion_id`, `producto_id`, `imagen`, `referencia`, `descripcion`, `precio` (unitario), `cantidad`, `descuento_pct`, `precio_con_desc`, `acabados`, `observaciones_internas`, `total`. (Los ítems de la cotización aprobada quedan "disponibles para pedidos".)
- **Producto** *(catálogo)* — `id`, `codigo` (ej. S60120U25, PMS-120), `nombre`, `tipo` (principal/accesorio), `referencia`, `imagen`, `precio_base`. Atributos de acabado configurables: **`formica`**, **`canto`**, **`herraje`** (pueden quedar *POR DEFINIR* hasta el diseño). [relacionado con Biblioteca Especiales]
- **Firma / Aprobación** — `id`, `cotizacion_id`, `link_firma`, `estado_firma`, `fecha`. (Firma electrónica remota del cliente para aprobar.)
- **Solicitud de Diseño (Backlog)** — `id`, `origen` (cotización_id | [INTERNO]), `cliente_id`(nullable), `asesor_id`, `diseñador_id`, `fecha_solicitud`, `imagen`, `descripcion`, **planificación PR-DI-01:** `datos_entrada`, `requisitos_tecnicos`, `requisitos_funcionales`, `posibles_fallos`, `requisitos_legales`, `diseños_previos`, `estado` (enum: *PT precio comercial · Especial sin aprobar cliente · PT asignar diseñador · PT Ficha Técnica · PT Aprobación FT · Proceso de diseño · Pendiente Validación · Rechazado · Finalizado*), entregables: `despiece`, `armado_general`, `planos_tecnicos`, `n_pedido_ofimatica`.
- **Diseño Especial / Pieza a medida** *(Biblioteca Especiales)* — `id`, `codigo` (CÓDIGO ESPECIAL), `tipo` (ej. *CONVERTIDA A PEDIDO*), `diseñador`, `asesor_id`, `fecha_creacion`, `descripcion`, `imagen`, `precio_venta_publico`, `precio_venta_dto`, `cant_requerida`, `pedido_id`(nullable), `estado` (ej. *FACTURADO*). Sub-colecciones: `archivos`, `mensajes` (chat), `historico`.
- **Pedido** *(interna: "order")* — `id` (No), `cliente_id`, `oportunidad_id`, `cotizacion_id`, `asesor`, `fecha_creacion`, `forma_pago`, `tiempo_entrega`, `fecha_vencimiento`, `orden_compra`, `direccion_envio`, `subtotal`, `impuesto`, `total`, `tipo_producto` (Estándar | Especial), `requiere_instalacion` (bool), `estado` (enum del flujo ↓), `dias_transcurridos`. [1—N Ítem] [1—N Aprobación] [1—N Archivo]
  - **estado (flujo):** *Pendiente creación de cliente · Pendiente ficha técnica · Pendiente creación de referencia · Pendiente Ingreso · En Producción · Instalación · Pendientes Facturación · Facturado · Denegado · Cartera vencida*.
- **Aprobación de pedido** — `id`, `pedido_id`, `tipo` (Ingreso Pedido · Fabricación · Instalación · Facturación), `estado` (Aprobado/Pendiente), `aprobado_por` (usuario), `observacion`, `fecha`.
- **Integración Ofimática (ERP producción)** — `pedido_id`, `n_pedido_ofimatica`, `identificador_cotizacion`, `estado_envio` (ENVIADO), `fecha_envio`, hitos: `fecha_creacion`, `fecha_tapiceria`, `fecha_vencimiento`, `fecha_listo`, `fecha_despacho`, `notas_generales`.
- **Usuario** — `id`, `nombre`, `email`, `password`, `perfil`/`rol_id`, `idioma`, `estado` (ACTIVO · INACTIVO · CAMBIO DE CONTRASEÑA), `cargo_actual`, `numero_documento`, `numero_telefonico`, `codven` (código vendedor ERP), `empresa_id`, `fecha_registro`, `ultimo_ingreso`, `registrado_por`.
- **Rol / Perfil** — `id`, `nombre` (Administrador · Asesor · Diseñador · Diseñador Comercial · Analista de Cartera · Analista de Pedido · Jefe de compra · Consultor), `cupo`/`limite` (licenciamiento). [N—N Permiso]
- **Permiso** — `id`, `clave` (`{modulo}.{accion}`), `nombre`, y por rol: `activo` (bool) + `restriccion` (scope). [N—N Rol]
- **Categoría** — `id`, `entidad` (client · channel · …), `nombre`, `fecha_registro`. (Catálogo genérico parametrizable.)
- **Tag** — `id`, `nombre`, `fecha_registro`.
- **Parámetro de Configuración** — `id`, `parametro` (clave), `valor` (JSON), `company_id`, `fecha_registro`, `fecha_actualizacion`. Define enums/estados del sistema (con `icon`/`color`).
- **Empresa (tenant)** — `id`, `nombre` (JEP Mobiliari). Multi-tenant vía `company_id`.
- **Catálogos derivados:** `Sector`/`SubSector`, `Lista de precio`, `Canal`, `Tipo Documento`, `Tipo Archivo`, `País`/`Ciudad`, `Acción` (tipos de actividad) — muchos provienen de **Categorías** o **Parámetros**.

**Relaciones (preliminares):**
```
Cliente 1───N Contacto Interno
Cliente 1───N Actividad/Seguimiento
Cliente 1───N Archivo
Cliente 1───N Oportunidad
Cliente 1───N Cotización
Cliente 1───N Pedido
Cliente N───1 Asesor (Usuario)
Oportunidad 1───N Cotización
Cotización 1───N Ítem
Ítem N───1 Producto            (catálogo)
Cotización 1───1 Firma/Aprobación
Cotización 1───1 Pedido        (cotización aprobada → ítems disponibles → pedido)
Pedido 1───N Ítem
Pedido 1───N Aprobación        (Ingreso·Fabricación·Instalación·Facturación)
Pedido 1───1 Integración Ofimática
Cotización 1───? Solicitud de Diseño (Backlog)   ("Solicitar planos/cambios")
Solicitud de Diseño ──finaliza──▶ Diseño Especial (Biblioteca)
Diseño Especial 1───? Pedido
Producto/Diseño Especial N───1 Diseñador (Usuario)
Oportunidad 1───N Pedido
Usuario 1───N Cotización       (registrado_por)
Usuario N───1 Rol
Rol N───N Permiso              (con restricción/scope por rol)
Cliente N───N Tag
Categoría (entidad, nombre)    → alimenta Canal, tipo cliente, etc.
Empresa 1───N Usuario/Parámetro (multi-tenant, company_id)
Sector 1───N SubSector
```

**Catálogos/maestros (de Configuración):** Categorías, Tags, Roles, Parámetros.

**Ciclo de negocio (confirmado):**
```
Prospecto ─▶ Cliente ─▶ Oportunidad ─▶ Cotización ─[firma cliente]▶ APROBADA
                                              │                          │
                                   Solicitar planos ▼                    ▼ genera
                              Backlog Diseño (PR-DI-01)               PEDIDO
                                   │ finaliza                            │
                                   ▼                     Aprobaciones: Ingreso▶Fabricación▶Instalación▶Facturación
                            Biblioteca Especiales           │ envía a ofimática (ERP)
                                                            ▼ hitos: Tapicería▶Listo▶Despacho
                                                        FACTURADO
       (Seguimiento/Actividades + Timeline auditable transversal a todas las entidades)
```

---

## 5. Sistema de diseño

> Colores aproximados leídos de las capturas. La estética es coherente con una **plantilla de panel Bootstrap** (estilo *Skote/Veltrix*): reconstruible desde cero con Bootstrap 5 o Tailwind + un tema teal.

### 5.1 Paleta de colores
| Rol | Hex aprox. | Uso observado |
|-----|-----------|---------------|
| **Primario / Sidebar** | `#1CA9C9`–`#2399B5` (teal-azul) | Fondo del menú lateral, botones primarios, acento del logo |
| Sidebar ítem activo/grupo | teal más claro | Grupos "Reportes"/"Configuración" expandidos |
| Texto sidebar | Blanco `#FFFFFF` / submenús atenuados | Ítems y subítems |
| Fondo de contenido | Gris claro `#EEF0F2` | Área principal |
| Tarjeta/superficie | Blanco `#FFFFFF` | Cards, tablas, widgets |
| KPI Rojo/rosa | `#EC4561` | Ícono "Cotizaciones activas" |
| KPI Amarillo | `#FCB92C` | Ícono "$ Cotizaciones" |
| KPI Verde | `#1CBB8C` | Ícono "Cant. Pedidos" |
| KPI Azul/índigo | `#5B73E8`/`#3B3F7A` | Ícono "$ Pedidos" |
| Acción primaria (botones) | Teal/Azul `#3B5DE7`/`#29B6D8` | Botones Ver/Editar, "Registrar" |
| Botón oscuro | `#2A3042` (navy) | "Visualizar en PDF", "Copiar link de firma" |
| **Estado: éxito/activo** | Verde `#1CBB8C` | Badge `ACTIVO`, `ENVIADO`, `Finalizados`, acción realizada |
| **Estado: alerta/vencido** | Rojo `#EC4561` | Badge de días, `Vencida`, `Rechazados` |
| **Estado: neutro/estado** | Gris `#74788D` / negro | Badge `Estándar`, estado de cliente, `INACTIVO` |
| Semáforo antigüedad | verde / ámbar / rojo | 0-30 / 30-90 / +90 días |
| Dona/pie — series | Navy `#2A3042`, teal `#1CBB8C`, morado `#A66FE0`, azul claro | Probabilidad, participación por asesor |

### 5.2 Tipografía
- Sans-serif tipo **Poppins/Inter/system**. Títulos seminegrita; **números KPI grandes en negrita** (big-number). Etiquetas de formulario en negrita.

### 5.3 Componentes UI (biblioteca completa observada)
- **Sidebar** vertical fijo (teal) con iconos + texto, grupos colapsables (chevron ▾), ítem activo resaltado, colapsable con ☰.
- **Header** blanco: título de empresa, búsqueda global 🔍, ayuda ❓, avatar con iniciales + menú de perfil ▾.
- **KPI Card** (2 variantes): (a) ícono cuadrado de color + título/subtítulo/valor; (b) **tarjeta-filtro** clicable con conteo (+ monto) que filtra la tabla (activa en teal sólido).
- **KPI big-number con sparkline** (en BI).
- **KPI de cupo** (usados/límite, en Usuarios).
- **DataTable**: `Mostrar N registros`, `Buscar`, encabezados ordenables (▲▼), **filtro `<select>` embebido en cabecera de columna**, **fila expandible** (toggle ➕/➖), **checkbox de selección masiva**, paginación (`Anterior/1/Siguiente`), exportar `CSV/Excel/Descargar Todos`.
- **Badge/píldora**: verde (activo/ok), rojo (alerta/vencido), gris/negro (estado), con texto+días.
- **Botones de acción icónicos** (azules): 👁️ ver, ✏️ editar, ❌ eliminar, 📄 duplicar, 🗄️ archivar, 📅 agendar, 👤➕ asignar, ✅ activar, ↪️ reset.
- **Botón dropdown "Acciones ▼"** contextual con lista de acciones (colores para peligro/pausa).
- **Layout de ficha 3 columnas**: datos (izq) · documento/relaciones + tabs (centro) · cartera/actividad (der).
- **Tabs** (con icono de lista) para sub-secciones.
- **Timeline vertical** con iconos circulares de color por tipo de evento (👍 aprobación, 👁️ interacción, 🔧 actualización), agrupado por fecha.
- **Slider/range** de 3 puntos (probabilidad de cierre).
- **Toggle/switch** (requiere instalación).
- **File upload** (Tipo Archivo + Observaciones + "Seleccionar archivo") + **tarjetas de PDF** descargables + buckets ("Archivos", "…con aprobación", "…para aprobación").
- **Cards especiales**: teal "Saldo Cartera", borde-rojo "Producto por definir acabados", "Firma", "Enviar a ofimática", "Fechas del pedido".
- **Grid de catálogo en cards** con imagen (Biblioteca Especiales).
- **Modales**: formulario (importar, nuevo permiso), detalle con tabs, planificación ISO, editor de código **ACE** (JSON en Parámetros).
- **Matriz de permisos** (permiso × rol) con badge por celda.
- **Documento tipo factura** embebido (encabezado + tabla de ítems con thumbnails + totales).
- **Filtros de BI**: Periodo/Asesor/Estado + `Apply`/`Clear All`; **FullCalendar** (mes/semana/día).

### 5.4 Layout e iconografía
- **Layout de 2 zonas:** sidebar fijo (≈230px, teal) + contenido fluido con header superior pegado; fondo gris claro, superficies blancas con sombra suave y bordes redondeados.
- **Iconografía:** **Font Awesome** (confirmado en Parámetros: `fa-phone-alt`, `fa-envelope`, `fa-location-arrow`, `fa-eye`…). Iconos de menú: home, people, line-chart, note, money, pincel (diseño), file, calendar, gear, folder, tag, user.
- **Grid responsive:** KPIs en fila (4–9 según módulo); ficha en 3 columnas; catálogo en 3 columnas de cards.
- **Breadcrumbs** contextuales (Home / cliente / oportunidad / cotización / pedido).

---

## 6. Lista de funcionalidades priorizadas

### 🟢 MVP (Fase 1 — imprescindible para operar el ciclo comercial)
1. **Autenticación + layout** (sidebar teal/header) y **RBAC** (roles + permisos `{modulo}.{accion}` con estado activo/inactivo por rol). Multi-tenant básico (`company_id`).
2. **Clientes/Prospectos** (CRUD + ficha 360°): dependencia P. Natural/Jurídica, contactos internos, embudo prospecto→cliente, importar por documento.
3. **Oportunidades** (pipeline con estados + probabilidad de cierre).
4. **Cotizaciones** ⭐ (CRUD, editor de ítems con imagen/cantidad/descuento/acabados, subtotal/IVA/total, workflow de estados, **PDF**, **firma/aprobación del cliente**).
5. **Pedidos** (generación desde cotización aprobada, estados de producción/facturación, cadena de aprobaciones básica).
6. **Seguimiento/Actividades** (registro manual + timeline auto por evento; enum de acciones configurable) con alerta de "días sin interacción".
7. **Dashboard** (KPIs del mes + tabla de cotizaciones con búsqueda/paginación).
8. **Adjuntos** (subir/descargar archivos por entidad).
9. **Maestros de Configuración:** Usuarios (con cupo por rol), Roles/Permisos, Categorías (parametrizables por entidad), Tags, **Parámetros (enums como config JSON con icon/color)**.

### 🟡 Fase 2 — diferenciadores del sector mobiliario
10. **Backlog Diseño** (proceso ISO PR-DI-01, asignación de diseñador, entregables despiece/armado/planos, estados).
11. **Biblioteca Especiales** (catálogo de piezas a medida con archivos/mensajes/histórico).
12. **Productos con acabados** (Formica/Canto/Herraje "POR DEFINIR") + "Solicitar planos/cambios".
13. **PDF con despiece** (BOM) y ficha comercial.
14. **Calendario de Actividades** (FullCalendar por asesor/tipo).
15. **Reportes BI** (Cotizaciones, Pedidos, Seguimiento) — embebido (Superset/Metabase) o charts propios.

### 🔵 Fase 3 — integraciones y refinamiento
16. **Integración ERP "ofimática"** (envío de pedido + hitos de producción: tapicería/listo/despacho, `codven`, `N° pedido ofimática`).
17. **Módulo de instalación** (toggle requiere instalación + aprobación).
18. **Saldo de cartera** (integración financiera) y control de cartera vencida.
19. **Dashboard personalizable** (widgets arrastrables/cerrables).
20. **Exportaciones masivas** (CSV/Excel), notificaciones, ayuda contextual.

### Notas de arquitectura para reimplementación
- **Estados como catálogo configurable** (no hardcodeados): tabla/param `approved_types`, `action_activities`, etc., con `id/value/icon/color`.
- **Nomenclatura**: la app real usa nombres internos (Oportunidad=`proyecto`/`project_estimate`, Cotización=`proposal`, Pedido=`order`). En la app propia conviene unificar naming de dominio.
- **Multi-tenant** por `company_id` desde el día 1 si se prevé más de una empresa.
- **Auditoría/timeline** transversal a todas las entidades (patrón de eventos).

---

## Anexo — Registro de capturas procesadas
| Fecha | Lote | Pantallas | Notas |
|-------|------|-----------|-------|
| 2026-06-30 | 1 | Sidebar, Header, Dashboard (`/home`) | Sitemap + Dashboard documentados. Datos anonimizados |
| 2026-06-30 | 2 | Clientes: listado, modal importar, form alta/edición, ficha detalle | Módulo Clientes A–G completo. Dependencia P. Natural/Jurídica, embudo prospecto→cliente, timeline, contactos internos. Datos anonimizados |
| 2026-06-30 | 3 | Oportunidades: listado + detalle (3 tabs: cotizaciones, ítems para pedidos, pedidos en proceso) | Nomenclatura interna "proyecto". Flujo cotización→ítems→pedido. Falta form de alta/edición aislado. Datos anonimizados |
| 2026-06-30 | 4 | Cotizaciones: listado (7 filtros estado + antigüedad + plazo), detalle (ítems, totales, acabados, firma, PDF), menú Acciones, tab Pedidos | Nomenclatura interna "proposal". Workflow completo, firma electrónica, despiece, productos con acabados POR DEFINIR. Falta editor de ítems aislado. Datos anonimizados |
| 2026-06-30 | 5 | Pedidos: listado (9 filtros estado), detalle (ítems, aprobaciones, integración ofimática, fechas producción, instalación), tab Código especial | Nomenclatura interna "order". Cadena de aprobaciones (Ingreso/Fabricación/Instalación/Facturación), integración ERP "ofimática" con hitos (tapicería/listo/despacho). Datos anonimizados |
| 2026-06-30 | 6 | Backlog Diseño: listado (9 estados), modal Nuevo producto (PR-DI-01) | Proceso ISO de diseño y desarrollo. Entregables despiece/armado/planos. Datos anonimizados |
| 2026-06-30 | 6 | Biblioteca Especiales: catálogo en cards + modal detalle (info/archivos/mensajes/histórico) | Diseños especiales (CÓDIGO ESPECIAL) trazables a pedido. Datos anonimizados |
| 2026-07-01 | 7 | Reportes: Calendario (/calendar) + BI Cotizaciones, BI Pedidos (sin datos), BI Seguimiento | BI embebido estilo Superset. Confirmado enum de acciones desde el calendario. Datos anonimizados |
| 2026-07-01 | 8 | Configuración: Categorías, Tags, Usuarios (cupos por rol), Parámetros (JSON/ACE), Roles (matriz permisos + modal) | RBAC completo, config store JSON multi-tenant, 8 roles, 54 permisos. **Documento completado 16/16.** Consolidados diseño y MVP. Datos anonimizados |
