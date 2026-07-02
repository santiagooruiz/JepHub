#!/usr/bin/env bash
# Backup manual de la BD (además del servicio `backup` automático del compose).
# Vuelca un dump comprimido con rotación local. Ejecutar en la VM del despliegue.
#
#   ./scripts/backup.sh
#
# Recuerda copiar los dumps a un destino OFFSITE (otro disco/recurso de red).
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
DEST="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-14}"

# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

POSTGRES_USER="${POSTGRES_USER:-jep}"
POSTGRES_DB="${POSTGRES_DB:-jephub}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/jephub-$STAMP.sql.gz"

mkdir -p "$DEST"
echo "→ Volcando $POSTGRES_DB a $OUT"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
	pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip >"$OUT"

# Rotación: conserva los $KEEP más recientes.
ls -1t "$DEST"/jephub-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f

echo "✓ Backup creado: $OUT"
echo "  Recuerda copiarlo a un destino offsite."
