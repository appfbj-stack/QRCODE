#!/bin/bash
# deploy-vps-asaas.sh
# Deploy com env vars do Asaas (use source para setar ASAAS_API_KEY antes)
set -e
cd /root/kairos-igreja-node

git reset --hard origin/main
git pull origin main

docker build -t kairos-igreja:v2.4.2 .
docker rm -f kairos-igreja-app 2>/dev/null || true
sleep 2

docker run -d \
  --name kairos-igreja-app \
  --network dokploy-network \
  -p 3012:3012 \
  -e DATABASE_URL="postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db_v2" \
  -e JWT_SECRET="kairos-igreja-jwt-secret-2026-rotate-em-prod-X9k2mP4qL8nR" \
  -e PORT=3012 \
  -e NODE_ENV=production \
  -e UPLOAD_DIR=/app/uploads \
  -e ASAAS_API_KEY="$ASAAS_API_KEY" \
  -e ASAAS_ENV="${ASAAS_ENV:-homologation}" \
  -e ASAAS_WEBHOOK_TOKEN="${ASAAS_WEBHOOK_TOKEN:-kairos-webhook-2026-X9k2mP4qL8nR}" \
  --restart unless-stopped \
  kairos-igreja:v2.4.2

sleep 5
echo ""
echo "→ /api/health"
curl -s http://127.0.0.1:3012/api/health
echo ""
echo "→ Asaas test:"
docker exec kairos-igreja-app node /app/scripts/test-asaas-direct.mjs
