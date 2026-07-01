# Sistema de Diseño — JEP-Hub (objetivo)

> Identidad elegida: **Neutro pro + acento teal** (estilo Linear/Vercel) · **Claro + Oscuro** · **Densidad compacta** por defecto con toggle a cómoda.
> Implementación: **Tailwind CSS + shadcn/ui**. Estos tokens se mapean a variables CSS y a `tailwind.config`.
>
> Nota: este es el diseño **objetivo** de la app propia. El diseño *observado* del CRM original está en [ESPEC-FUNCIONAL.md](ESPEC-FUNCIONAL.md#5-sistema-de-diseño).

## 1. Principios
- **Estructura en neutros (grafito/slate)**, **teal solo como acento** (marca JEP) — no saturar de color.
- **Bordes hairline (1px)** como separador principal; sombras muy sutiles (estilo Linear).
- **Sidebar oscuro (grafito) en ambos modos** (claro y oscuro) para anclar la marca.
- **Densidad informativa**: por defecto compacta (más filas visibles), toggle a "cómoda".
- **Accesible (WCAG AA)**, foco visible teal, navegación por teclado, `prefers-reduced-motion`.

## 2. Paleta

### Acento de marca (Teal JEP)
| Token | Hex | Uso |
|-------|-----|-----|
| `teal-50` | `#ECFDFF` | fondos sutiles |
| `teal-400` | `#22C7DD` | acento en oscuro |
| **`teal-500` (primary)** | **`#12A2BC`** | botones primarios, links, foco, activo |
| `teal-600` | `#0E8BA3` | hover primario |
| `teal-700` | `#0B6E82` | pressed |

### Neutros (slate/grafito)
`#F8FAFC` `#F1F5F9` `#E2E8F0` `#CBD5E1` `#94A3B8` `#64748B` `#475569` `#334155` `#1E293B` `#0F172A` `#0B0F19`

### Semánticos de estado (armonizados)
| Estado | Light | Dark | Uso |
|--------|-------|------|-----|
| Éxito / activo | `#059669` | `#34D399` | ACTIVO, ENVIADO, Aprobado, Finalizado |
| Alerta / vencido | `#DC2626` | `#F87171` | días vencidos, Vencida, Rechazado, No aprobada |
| Advertencia | `#D97706` | `#FBBF24` | Detenido/Aplazado, antigüedad media |
| Info | `#2563EB` | `#60A5FA` | estados neutros, avisos |
| Neutro | `#64748B` | `#94A3B8` | Estándar, borrador, inactivo |

### KPIs (íconos, versión armonizada del original)
Rosa `#F43F5E` · Ámbar `#F59E0B` · Esmeralda `#10B981` · Índigo `#6366F1` — sobre chip con fondo tenue del mismo tono.

## 3. Tokens CSS (shadcn-style)

```css
:root { /* CLARO */
  --background:      #F8FAFC;  --foreground:      #0F172A;
  --card:           #FFFFFF;   --card-foreground: #0F172A;
  --muted:          #F1F5F9;   --muted-foreground:#64748B;
  --border:         #E2E8F0;   --input:           #E2E8F0;
  --primary:        #12A2BC;   --primary-foreground:#FFFFFF;
  --ring:           #12A2BC;
  --sidebar:        #0F1729;   --sidebar-foreground:#CBD5E1;   /* oscuro siempre */
  --sidebar-active: #12A2BC;   --sidebar-active-foreground:#FFFFFF;
  --success:#059669; --warning:#D97706; --danger:#DC2626; --info:#2563EB;
}
.dark { /* OSCURO */
  --background:      #0B0F19;  --foreground:      #E2E8F0;
  --card:           #111827;   --card-foreground: #F1F5F9;
  --muted:          #1E293B;   --muted-foreground:#94A3B8;
  --border:         #1F2937;   --input:           #1F2937;
  --primary:        #17B0CB;   --primary-foreground:#04141A;
  --ring:           #22C7DD;
  --sidebar:        #0A0E17;   --sidebar-foreground:#94A3B8;
  --sidebar-active: #17B0CB;   --sidebar-active-foreground:#04141A;
  --success:#34D399; --warning:#FBBF24; --danger:#F87171; --info:#60A5FA;
}
```

## 4. Tipografía
- **UI:** `Inter` (o `Geist`). **Números/moneda:** cifras tabulares (`font-feature-settings: "tnum"`) o `Geist Mono` en tablas para alinear montos.
- **Escala (base 14 en compacto):** `12` (xs, meta) · `14` (base, tablas/formularios) · `16` (lg) · `18–20` (títulos de sección) · `24–30` (KPI big-number, semibold) · pesos 400/500/600.

## 5. Densidad (compacta ↔ cómoda)
| Elemento | Compacta (default) | Cómoda (toggle) |
|----------|-------------------|-----------------|
| Fila de tabla | 36 px | 48 px |
| Padding celda | 6–8 px | 10–12 px |
| Alto de input/botón | 32–36 px | 40 px |
| Font base | 14 px | 14–15 px |
| Gap de cards | 12 px | 16–20 px |
- Se controla con un atributo global (`data-density="compact|comfortable"`) + clases utilitarias.

## 6. Forma, elevación y motion
- **Radio:** cards/menus `8px`, inputs/botones `6px`, badges `full`.
- **Elevación:** separación por **borde 1px**; sombras solo en overlays (dropdown/modal/drawer) muy suaves.
- **Motion:** 150–200 ms `ease-out`; respetar `prefers-reduced-motion`.

## 7. Componentes (base shadcn/ui, tematizados)
- **AppShell:** sidebar grafito colapsable + topbar con **⌘K (command palette)**, notificaciones, toggle tema, toggle densidad, avatar.
- **DataTable** (TanStack Table): orden, filtro por columna, búsqueda global, paginación, **selección masiva**, **fila expandible**, densidad, export CSV/Excel, columnas configurables, **estados skeleton/empty/error**.
- **Vistas Kanban** (Oportunidades/Cotizaciones/Backlog): columnas por estado, tarjetas arrastrables (respetando transiciones permitidas).
- **KPI card / tarjeta-filtro / big-number con sparkline / KPI de cupo.**
- **Badges de estado** semánticos; **badge de días** con color por antigüedad.
- **Ficha 3 columnas** con **drawer** lateral opcional para detalle sin perder la tabla.
- **Tabs**, **Timeline** (avatares, agrupación por fecha, filtros), **Slider** (probabilidad), **Switch**.
- **Uploader** (dropzone) + tarjetas de archivo/PDF + buckets.
- **Formularios** (React Hook Form + Zod) con campos condicionales (P. Natural/Jurídica), autosave/optimista donde aplique.
- **Editor de Parámetros amigable** (formulario por tipo) con *fallback* a editor JSON.
- **Matriz de permisos** con búsqueda y "activar todo por rol".
- **Command palette (⌘K)**, **toasts**, **empty states** ilustrados.
- **Página pública de firma del cliente** (branded, fuera del shell).

## 8. Iconografía
- **Lucide** (icon set de shadcn) — homogéneo y moderno. (El original usaba Font Awesome; Lucide es el equivalente limpio para este stack.)

## 9. Accesibilidad
- Contraste AA mínimo; foco visible (ring teal); targets táctiles ≥ 32–40 px; navegación por teclado en tablas, menús y modales; `aria-*` en componentes interactivos; soporte lector de pantalla en estados/badefges.
