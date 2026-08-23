#!/bin/bash
set -e

APP_DIR="/opt/kairos-igreja-v2"
cd "$APP_DIR"

echo "==> Subindo container"
# Sobe via docker run direto (mais simples que docker compose pro nosso caso)
docker stop kairos-igreja-app 2>/dev/null || true
docker rm kairos-igreja-app 2>/dev/null || true

docker run -d \
  --name kairos-igreja-app \
  --restart unless-stopped \
  -p 3012:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET="kairos-igreja-jwt-secret-2026-rotate-em-prod-X9k2mP4qL8nR" \
  -e APP_URL="https://kairos-igreja.fbautomacao.space" \
  -e DATABASE_URL="postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db" \
  -v kairos-igreja-backups:/app/backups \
  kairos-igreja:latest

echo "==> Aguardando container inicializar (15s)..."
sleep 15

echo "==> Status do container"
docker ps --filter "name=kairos-igreja-app" --format "table {{.Names}}	{{.Status}}	{{.Ports}}"

echo ""
echo "==> Logs iniciais"
docker logs --tail 20 kairos-igreja-app 2>&1
