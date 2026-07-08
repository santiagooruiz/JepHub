# Integración con el ERP "ofimática" (BD SQL Server)

> Contrato definido en julio 2026. Sustituye la incógnita "API/DB/archivos" del
> plan: la integración es **conexión directa a la base de datos** del ERP desde
> el worker/servidor de JEP-Hub — lectura libre (SELECT) y escritura **solo de
> cotizaciones `CV` vía stored procedures** (nunca pedidos `PD`/`PX`).

## Conexión

| Dato | Valor |
|------|-------|
| Motor | Microsoft SQL Server 2017 (RTM) |
| Servidor | `BD1JEP` → `10.10.1.4:1433` (red local) |
| Base de datos | `PROTOTIPO2016` |
| Usuario | `gestion_produccion` (SELECT/INSERT/UPDATE sobre las tablas usadas) |
| TLS | Certificado autofirmado → `encrypt: true` + `trustServerCertificate: true` |

Config por variables `OFIMATICA_DB_HOST/PORT/NAME/USER/PASSWORD` (ver
`.env.example`; la clave contiene `$` → **comillas simples** para que
dotenv-expand no la mutile). Si faltan todas, `getErpClient()` devuelve el
cliente simulado (`MockErpClient`); si faltan solo algunas, `validateEnv()` falla.

Código: `src/server/ofimatica/db.ts` (pool `mssql` singleton) y
`src/server/ofimatica/client.ts` (`OfimaticaDbClient` + `fetchErpMilestones`).

## ⛔ REGLA DURA: solo se inserta `CV`, nunca `PD`/`PX`

Un documento se identifica por la terna **(`ORIGEN`, `TIPODCTO`, `NRODCTO`)**.
JEP-Hub **únicamente** puede crear **cotizaciones** `ORIGEN='FAC'` +
`TIPODCTO='CV'`. Está **prohibido** insertar pedidos (`'PD'`/`'PX'`): esos los
genera el propio ERP a partir de la CV. La inserción se hace **exclusivamente
vía stored procedures del ERP** (nunca `INSERT` directo a `TRADE`/`MVTRADE`, para
respetar consecutivos, triggers contables y de inventario). Esta regla también
está en `CLAUDE.md` y hay un guard en el código.

## Modelo del ERP (lo relevante)

| Tabla | Rol | Notas |
|-------|-----|-------|
| `TRADE` | Cabecera del documento (246 col., todas con default) | Se crea con `sp_gen_trade_generico_distribuidores` |
| `MVTRADE` | Renglones (líneas de producto) | Se crean con `sp_gen_mvTrade_Generico_Distri`; también guardan acabados `ZFORMICA`/`ZCANTO`/`ZHERRAJE` |
| `TRADEMAS` | Extensión de producción: **hitos** (solo lectura) | `ZFTAPI` (Tapicería), `ZFLISTO` (Listo), `ZFDESPA` (Despacho) — `datetime`; `'1900-01-01'` = sin registrar |

Maestros de los que depende la CV (FKs reales verificadas): `NIT` → `MTPROCLI`
(terceros; de ahí se derivan `VENDEDOR`, `CODIGOCTA`, `CIUDADPRV`, `TIPOCAR`,
`TIPOPER`, `CODRETE`), `CODRETE` → `MTTOPRTE` (`PRETE`/`TOPE`), `PRODUCTO` →
`MTMERCIA` (de ahí `TIPOINV` para elegir bodega), `CODVEN` → `VENDEN`,
`CODCC` → `CENTCOS`. `OfimaticaDbClient` valida cliente y productos **antes** de
llamar a los SP y falla con mensaje accionable (visible en `ErpSync.ultimoError`).

### Stored procedures (firmas verificadas en la BD)

1. **`sp_gen_trade_generico_distribuidores`** (26 params) → crea la cabecera y
   **devuelve un recordset con `NRODCTO`**. Deriva del cliente: `codven`,
   `codigocta`, `ciudadcli`, `tipocar`, `tipoper`. Constantes usadas: `tipovta=1`,
   `codcc`, `activa=0`, `autoret=0`, `calrete=0`, `calretica=0`, `ctrlcorig=1`,
   `ctrtopes=1`, `decimales=2`, `factorsus=83.3334`, `prioridad=0`, `numcuotas=0`.
2. **`sp_gen_mvTrade_Generico_Distri`** (17 params) → un renglón. Bodega según
   `MTMERCIA.TIPOINV`: `01`→`MPACO`, `03`→`PTCAL`, `07`/`08`→`NOFABRI`, resto →
   `OFIMATICA_BODEGA`. Lleva `tariva`/`iva`, `codrete`/`prete`/`tope`, `planped=1`.
3. **`Calculos_Trade`** (`origen`, `tipodcto`, `nrodcto`) → recalcula totales.

## Flujos

### JEP-Hub → ERP (crear cotización CV)

`processSend` (worker, job `send`) → `OfimaticaDbClient.sendOrder()`:

1. Deriva datos del cliente (`MTPROCLI`) y retención (`MTTOPRTE`); valida productos.
2. `EXEC sp_gen_trade_generico_distribuidores` → obtiene `NRODCTO` de la CV.
3. Por cada renglón: `EXEC sp_gen_mvTrade_Generico_Distri` (bodega por `TIPOINV`).
4. `EXEC Calculos_Trade` → totales.

El `NRODCTO` de la CV queda en `ErpSync.nPedidoOfimatica`. El vendedor **no** se
envía desde JEP-Hub: lo pone el SP desde `MTPROCLI.VENDEDOR` por NIT.

Parámetros de negocio configurables (`.env`, con defaults observados en CV
reales): `OFIMATICA_PASSWORDIN`, `OFIMATICA_CODCC` (`051501`), `OFIMATICA_BODEGA`
(`PTCAL`), `OFIMATICA_TARIVA` (`0`), `OFIMATICA_PORIVA` (`19`).

### ERP → JEP-Hub (hitos de producción)

Job repetitivo `poll` (`ensureMilestonePolling`, cada `OFIMATICA_POLL_MS`,
default 5 min): lee `ZFTAPI/ZFLISTO/ZFDESPA` en `TRADEMAS` y aplica los nuevos
hitos con `applyMilestone` (mismo camino que el webhook
`/api/ofimatica/webhook`, que sigue disponible si el ERP puede notificar por HTTP).

> ⚠️ **PENDIENTE — enlace CV→PD.** Los hitos los registra el ERP sobre el
> **pedido `PD`** que genera desde la CV, con **otro `NRODCTO`**. Hasta confirmar
> cómo se relaciona ese `PD` con nuestra `CV` (¿`NRODCTOAN`/`TIPODCTOAN`? ¿otra
> columna?), el polling lee la fila `TRADEMAS` de la propia CV (sin riesgo de
> cruce). Definir el mapeo para leer los hitos del `PD` correcto.

### Consultas ad-hoc

Cualquier lectura adicional (saldos, facturación, etc.) puede usar
`getErpPool()` con queries **parametrizadas** (`request().input(...)`) — nunca
interpolar strings del usuario en el SQL.

## Pendientes conocidos

- **Enlace CV→PD** para el polling de hitos (ver arriba).
- **Acabados**: `ZACABADOSP` / `ZFORMICA`/`ZCANTO`/`ZHERRAJE` aún no se mapean
  desde `LineItem.acabados` (texto libre hoy); el flujo PHP los inserta con
  código/color/nota estructurados.
- **IVA/tarifa por renglón**: hoy se usa un default global (`TARIVA=0`, `19%`);
  si hay productos con IVA distinto, mapear por producto.
- Producción (VM Ubuntu) debe alcanzar `10.10.1.4:1433` — validar firewall al
  desplegar.
