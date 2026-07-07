# Integración con el ERP "ofimática" (BD SQL Server)

> Contrato definido en julio 2026. Sustituye la incógnita "API/DB/archivos" del
> plan: la integración es **conexión directa a la base de datos** del ERP,
> bidireccional (SELECT + INSERT), desde el worker/servidor de JEP-Hub.

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

## Modelo del ERP (lo relevante)

Un documento se identifica por la terna **(`ORIGEN`, `TIPODCTO`, `NRODCTO`)**.
Los **pedidos** son `ORIGEN='FAC'` + `TIPODCTO='PD'`; `NRODCTO` es `char(10)`
numérico consecutivo (formato observado `2501760` ≈ año + secuencia).

| Tabla | Rol | Campos que usamos |
|-------|-----|-------------------|
| `TRADE` | Cabecera del documento (246 col., todas con default) | `FECHA`, `HORA`, `NIT`, `CODVEN`, `BRUTO`, `IVABRUTO`, `DIR`, `ORDEN`, `NOTA`, `PASSWORDIN` |
| `MVTRADE` | Renglones (líneas de producto) | `CONSECUT`, `PRODUCTO`, `DETALLE`, `NOMBRE`, `CANTIDAD`, `VALORUNIT`, `VLRVENTA`, `NIT`, `FECHA`, `VENDEDOR` (también existen los acabados `ZFORMICA`/`ZCANTO`/`ZHERRAJE`) |
| `TRADEMAS` | Extensión de producción: **hitos** | `ZFTAPI` (Tapicería), `ZFLISTO` (Listo), `ZFDESPA` (Despacho) — `datetime`; `'1900-01-01'` = sin registrar |

⚠️ `TRADE` y `MVTRADE` tienen **triggers activos** del ERP
(`Tr_Ingresa_Saldos_Costos`, `Tr_Integra_Linea_COMFAC`, …): un INSERT dispara
lógica contable/inventario del ERP. Es el comportamiento deseado, pero no
insertar "de prueba" sin transacción + rollback.

⚠️ **Integridad referencial contra los maestros del ERP** (verificado con FKs
reales): `NIT` → `MTPROCLI` (terceros), `CODVEN` → `VENDEN` (vendedores),
`PRODUCTO` → `MTMERCIA` (productos). `OfimaticaDbClient` los valida antes de
insertar y falla con mensaje accionable (visible en `ErpSync.ultimoError`):
el cliente, el vendedor y las referencias del pedido **deben existir en
ofimática** antes del envío.

## Flujos

### JEP-Hub → ERP (envío de pedido)

`processSend` (worker, job `send`) → `OfimaticaDbClient.sendOrder()`, en una
transacción SERIALIZABLE:

1. Consecutivo: `MAX(NRODCTO numérico)+1` de FAC/PD con `UPDLOCK, HOLDLOCK`.
2. `INSERT INTO TRADE` (cabecera, `PASSWORDIN='JEPHUB'` como marca de origen).
3. `INSERT INTO MVTRADE` por cada renglón del pedido.
4. `INSERT INTO TRADEMAS` (fila donde producción registrará los hitos).

El `NRODCTO` generado queda en `ErpSync.nPedidoOfimatica`.

### ERP → JEP-Hub (hitos de producción)

Job repetitivo `poll` (`ensureMilestonePolling`, cada `OFIMATICA_POLL_MS`,
default 5 min): para cada `ErpSync` enviado y sin despacho, lee
`ZFTAPI/ZFLISTO/ZFDESPA` en `TRADEMAS` y aplica los nuevos hitos con
`applyMilestone` (mismo camino que el webhook `/api/ofimatica/webhook`, que
sigue disponible si algún día el ERP puede notificar por HTTP).

### Consultas ad-hoc

Cualquier lectura adicional (saldos, facturación, etc.) puede usar
`getErpPool()` con queries **parametrizadas** (`request().input(...)`) — nunca
interpolar strings del usuario en el SQL.

## Pendientes conocidos

- `CODVEN` viene de `User.codven` (provisionar en Configuración → Usuarios).
- Campos de acabados (`ZFORMICA`/`ZCANTO`/`ZHERRAJE` en `MVTRADE`) aún no se
  mapean desde `LineItem.acabados` (texto libre hoy).
- Producción (VM Ubuntu) debe alcanzar `10.10.1.4:1433` — validar firewall al
  desplegar.
