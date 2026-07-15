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

### Modo operativo actual (jul-2026): ingreso manual + vínculo de CV

Por decisión del negocio, hoy la CV **no** se inserta automáticamente vía SP. Al
generar el pedido (`generateOrderFromQuote`) se envía un **correo** a
`ORDER_NOTIFY_EMAIL` (auxsistemas@) con los datos para ingresar la cotización en
el ERP a mano. Quien la ingresa obtiene el **N° de CV** (p. ej. `46157`) y lo
**vincula** en la página del pedido (panel *Ofimática*, `linkErpCotizacion` →
guarda el N° en `ErpSync.nPedidoOfimatica`). Con ese número, `refreshErpStatus`
(botón "Consultar estado") y el `poll` resuelven el **PD** generado
(`TIPODCTOPC='CV' AND NROSOLI=<CV>`), lo guardan en `ErpSync.nroPedidoErp` y leen
los hitos. El panel *Seguimiento* (antes "Aprobaciones") es **solo informativo**:
Ingreso Pedido = existe PD; Fabricación = Tapicería/Listo; Instalación = Despacho;
Facturación = estado "Facturado". No hay botones de aprobación (esos procesos
viven en el ERP). El envío automático por SP (`sendOrder`/job `send`) sigue en el
código para reactivarlo cuando los maestros del ERP cubran clientes/referencias.

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
default 5 min):

1. **Resuelve el pedido** (`fetchPedidoNumero`): el ERP genera un `PD` a partir
   de nuestra `CV` y lo enlaza con **`TIPODCTOPC='CV'`** y **`NROSOLI = <NRODCTO
   de la CV>`**. Mientras no exista ese `PD`, no hay hitos y se omite.
2. Lee `ZFTAPI/ZFLISTO/ZFDESPA` del `PD` en `TRADEMAS` y aplica los nuevos hitos
   con `applyMilestone` (mismo camino que el webhook `/api/ofimatica/webhook`,
   que sigue disponible si el ERP puede notificar por HTTP).

> Nota: este flujo CV→PD es nuevo; aún no hay `PD` con `TIPODCTOPC='CV'` en el
> histórico porque las primeras CV se están creando ahora desde JEP-Hub.

### Consultas ad-hoc

Cualquier lectura adicional (saldos, facturación, etc.) puede usar
`getErpPool()` con queries **parametrizadas** (`request().input(...)`) — nunca
interpolar strings del usuario en el SQL.

## Pendientes conocidos

- **Acabados**: `ZACABADOSP` / `ZFORMICA`/`ZCANTO`/`ZHERRAJE` aún no se mapean
  desde `LineItem.acabados` (texto libre hoy); el flujo PHP los inserta con
  código/color/nota estructurados.
- **IVA/tarifa por renglón**: hoy se usa un default global (`TARIVA=0`, `19%`);
  si hay productos con IVA distinto, mapear por producto.
- Producción (VM Ubuntu) debe alcanzar `10.10.1.4:1433` — validar firewall al
  desplegar.
