# Arquitectura de Despliegue — JEP-Hub

> Objetivo: correr el CRM (Next.js + PostgreSQL + Redis + worker + PDF) en el **Windows Server 2019 on-prem**, con la **app accesible por internet** (para el link de firma del cliente) y la **BD siempre privada**.

## Decisión base
- **Host:** Windows Server 2019 (licenciado, ≥8 GB RAM, SSD, con ingress público).
- **Capa de ejecución:** una **VM Linux (Ubuntu Server LTS) sobre Hyper-V** dentro del Windows Server, y ahí **Docker + docker-compose**.
  - *¿Por qué VM Linux y no nativo?* Postgres, Redis, Node y **Chromium (Puppeteer para PDF)** rinden y se operan mejor en Linux. En Windows Server 2019, Hyper-V es más estable para producción que WSL2.
- **BD:** PostgreSQL en contenedor, **sin puertos publicados** (solo red interna de Docker).

## Topología de red
```
                 Internet (clientes, asesores remotos)
                              │  HTTPS 443 / 80→443
                              ▼
        ┌─────────────────────────────────────────────┐
        │  Router / Firewall corporativo               │
        │  Port-forward 80,443 → IP del Windows Server │
        └─────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────────┐
        │  WINDOWS SERVER 2019 (Hyper-V)               │
        │  ┌───────────────────────────────────────┐   │
        │  │  VM Ubuntu Server LTS  (Docker)        │   │
        │  │                                        │   │
        │  │  [caddy]  :80/:443  ← ÚNICO público    │   │
        │  │     │  reverse proxy + TLS auto        │   │
        │  │     ▼                                  │   │
        │  │  [web] Next.js :3000 (interno)         │   │
        │  │     │            │                     │   │
        │  │     ▼            ▼                     │   │
        │  │  [worker]     [postgres] :5432 ─┐      │   │
        │  │  BullMQ jobs  (solo red docker) │      │   │
        │  │     │            [redis] :6379 ─┘      │   │
        │  │     ▼                                  │   │
        │  │  → ERP "ofimática" (LAN interna)       │   │
        │  └───────────────────────────────────────┘   │
        └─────────────────────────────────────────────┘
```
- **Único punto público:** Caddy (80/443). Todo lo demás vive en la red interna de Docker.
- **Postgres y Redis NO publican puertos** al host ni a internet.
- El **worker** habla con el **ERP "ofimática"** por la LAN interna.

## Componentes (contenedores)
| Servicio | Imagen base | Puerto | Exposición |
|----------|-------------|--------|------------|
| `caddy` | caddy:2 | 80, 443 | **Público** (reverse proxy + TLS Let's Encrypt) |
| `web` | node:20 (Next standalone) + Chromium | 3000 | Interno (solo Caddy) |
| `worker` | node:20 | — | Interno (colas BullMQ, sync ERP, PDFs, notificaciones) |
| `postgres` | postgres:16 | 5432 | **Solo red docker** |
| `redis` | redis:7 | 6379 | **Solo red docker** |

> **PDF:** Puppeteer/Chromium puede ir dentro de `web` o como servicio `pdf` aparte. Recomendado empezar dentro de `worker` (los PDFs de cotización/pedido se generan como job → no bloquean la request).

## docker-compose (esqueleto indicativo)

> **Nota (Sprint 10):** la versión real y ejecutable vive en la raíz del repo:
> [`Dockerfile`](../Dockerfile) (targets `runner` y `worker`),
> [`docker-compose.prod.yml`](../docker-compose.prod.yml),
> [`Caddyfile`](../Caddyfile) y [`.env.production.example`](../.env.production.example).
> El esqueleto de abajo es solo ilustrativo.

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile", "caddy_data:/data"]
    depends_on: [web]

  web:
    build: .            # Dockerfile con output: 'standalone' + deps de Chromium
    environment:
      DATABASE_URL: postgres://jep:***@postgres:5432/jephub
      REDIS_URL: redis://redis:6379
      AUTH_SECRET: ***
      APP_URL: https://crm.jepmobiliari.com
    depends_on: [postgres, redis]
    # NO ports: — solo accesible vía caddy

  worker:
    build: .
    command: node worker.js
    environment: { DATABASE_URL: ..., REDIS_URL: redis://redis:6379 }
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    environment: { POSTGRES_USER: jep, POSTGRES_PASSWORD: ***, POSTGRES_DB: jephub }
    volumes: ["pgdata:/var/lib/postgresql/data"]
    # NO ports: — privado

  redis:
    image: redis:7
    volumes: ["redisdata:/data"]
    # NO ports: — privado

volumes: { pgdata: {}, redisdata: {}, caddy_data: {} }
```
`Caddyfile`:
```
crm.jepmobiliari.com {
    reverse_proxy web:3000
}
```

## Puesta en marcha (runbook)

En la VM Ubuntu, con el repo clonado y Docker instalado:

```bash
# 1) Configurar secretos de producción
cp .env.production.example .env.production
#   editar valores; generar secretos con: openssl rand -base64 48

# 2) Construir y levantar (caddy provisiona TLS solo)
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
#   el servicio `migrate` aplica `prisma migrate deploy` antes de web/worker

# 3) Sembrar datos base (SOLO la primera vez): roles, 54 permisos, empresa y
#    usuario admin. Nota: el seed actual también inserta datos demo.
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm migrate pnpm prisma db seed

# 4) Verificar salud y logs
curl -fsS https://crm.jepmobiliari.com/api/health   # {"status":"ok","db":"up"}
docker compose -f docker-compose.prod.yml logs -f web worker
```

Operación:
- **Actualizar versión:** `git pull && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build` (migrate corre solo).
- **Backup manual:** `./scripts/backup.sh` (el servicio `backup` ya hace uno diario con rotación 7/4/6 en `./backups`; copiar offsite).
- **Restaurar:** `gunzip -c backups/jephub-XXXX.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U jep -d jephub`.
- **Salud:** `GET /api/health` (usado por el healthcheck del contenedor `web`).

## Endurecimiento aplicado (Sprint 10)
- Contenedores como **usuario no-root** (`node`); Postgres/Redis **sin puertos publicados**.
- **Cabeceras de seguridad** en la app (`next.config.mjs`) + **HSTS** en Caddy; `x-powered-by` desactivado.
- **Validación de entorno** al arranque (`src/instrumentation.ts` → `lib/env.ts`): en producción exige `AUTH_SECRET` fuerte y los secretos definidos.
- **Rate-limit** de login (10 intentos/5 min por IP).
- **Webhook ofimática** autenticado por secreto compartido.

## Dominio + TLS
- Crear registro DNS **`crm.jepmobiliari.com` → IP pública** del server.
- **Port-forward 80 y 443** del firewall a la IP del Windows Server → a la VM.
- Caddy provisiona y renueva el certificado **Let's Encrypt** automáticamente. (Puerto 80 debe estar abierto para el challenge HTTP.)

## Backups (crítico)
1. **Lógico:** `pg_dump` **nocturno** (cron en la VM o contenedor sidecar) → volcado comprimido a un volumen.
2. **Offsite:** copiar el dump a **otro disco / recurso de red / almacenamiento externo** (que no sea el mismo server).
3. **Retención:** ej. 7 diarios + 4 semanales.
4. **Snapshots Hyper-V** de la VM periódicos (recuperación rápida de todo el stack).
5. **Probar restauración** cada cierto tiempo (un backup no verificado no es un backup).

## Seguridad
- Firewall: **solo 80/443 entrantes** desde internet. Nada más.
- **RDP** al Windows Server: restringido por VPN / IP allowlist, nunca abierto a internet.
- Postgres/Redis: **jamás** con puertos publicados.
- Secretos en `.env` fuera del repo (o gestor de secretos). Contraseñas fuertes para `postgres`, `AUTH_SECRET`, etc.
- Actualizaciones: base de imágenes y OS de la VM parcheados periódicamente.

## Notas de recursos
- **8 GB RAM = piso.** Reparto orientativo: Postgres ~2 GB, web ~1–2 GB, Chromium con picos al generar PDF, Redis ~0.5 GB, + overhead OS/VM.
- **Recomendado 16 GB** si crece el volumen de datos o hay generación concurrente de PDFs.
- SSD imprescindible (ya se cumple).

## Checklist de preparación del servidor
- [ ] Habilitar rol **Hyper-V** en Windows Server 2019.
- [ ] Crear **VM Ubuntu Server LTS** (vCPU 4+, RAM 6–12 GB, disco SSD 60 GB+).
- [ ] Instalar **Docker + docker-compose** en la VM.
- [ ] Configurar red de la VM (bridge/NAT) y **port-forward 80/443** hasta ella.
- [ ] DNS `crm.jepmobiliari.com` → IP pública.
- [ ] Definir estrategia y destino de **backups** (offsite).
- [ ] Endurecer firewall + RDP.
