#!/bin/bash
set -e

echo "==> Removendo container antigo"
docker stop kairos-igreja-app 2>/dev/null || true
docker rm kairos-igreja-app 2>/dev/null || true

echo "==> Subindo conectado à dokploy-network (onde está o kairos-shared-pg)"
docker run -d \
  --name kairos-igreja-app \
  --restart unless-stopped \
  --network dokploy-network \
  -p 3012:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e JWT_SECRET="kairos-igreja-jwt-secret-2026-rotate-em-prod-X9k2mP4qL8nR" \
  -e APP_URL="https://kairos-igreja.fbautomacao.space" \
  -e DATABASE_URL="postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db" \
  -v kairos-igreja-backups:/app/backups \
  kairos-igreja:latest

echo "==> Aguardando 20s para inicializar"
sleep 20

echo "==> Status"
docker ps --filter "name=kairos-igreja-app" --format "table {{.Names}}	{{.Status}}	{{.Ports}}"

echo ""
echo "==> DNS check"
docker exec kairos-igreja-app sh -c "getent hosts kairos-shared-pg 2>&1"

echo ""
echo "==> Logs"
docker logs --tail 25 kairos-igreja-app 2>&1
