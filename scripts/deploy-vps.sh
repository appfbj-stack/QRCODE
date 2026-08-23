#!/bin/bash
# deploy-vps.sh
# Rebuild + redeploy manual do kairos-igreja-app no VPS Dokploy
# Bypass: Dokploy Swarm está quebrado (overlay network), usamos docker run manual
#
# Uso:
#   ./deploy-vps.sh                    # build da tag v2.2.1 (HEAD do main)
#   ./deploy-vps.sh v2.2.0             # build de uma tag específica

set -e

REPO_DIR="${REPO_DIR:-/root/kairos-igreja-node}"
TAG="${1:-$(git -C $REPO_DIR describe --tags --abbrev=0 2>/dev/null || echo latest)}"
IMAGE="kairos-igreja:${TAG}"

echo "═══════════════════════════════════════════════════════"
echo "  Kairos Igreja — Deploy manual VPS"
echo "═══════════════════════════════════════════════════════"
echo "  Repo:    $REPO_DIR"
echo "  Tag:     $TAG"
echo "  Image:   $IMAGE"
echo "═══════════════════════════════════════════════════════"

# 1. Pull latest
echo ""
echo "→ [1/4] git pull origin main"
cd "$REPO_DIR"
git pull origin main

# 2. Docker build
echo ""
echo "→ [2/4] docker build (Dockerfile multi-stage)"
docker build -t "$IMAGE" -f Dockerfile .

# 3. Stop + remove old container
echo ""
echo "→ [3/4] docker rm -f kairos-igreja-app"
docker rm -f kairos-igreja-app 2>/dev/null || true
sleep 2

# 4. Run new container
echo ""
echo "→ [4/4] docker run kairos-igreja-app"
docker run -d \
  --name kairos-igreja-app \
  --network dokploy-network \
  -p 3012:3012 \
  -e DATABASE_URL="postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db_v2" \
  -e JWT_SECRET="kairos-igreja-jwt-secret-2026-rotate-em-prod-X9k2mP4qL8nR" \
  -e PORT=3012 \
  -e NODE_ENV=production \
  -e UPLOAD_DIR=/app/uploads \
  -e ASAAS_API_KEY="${ASAAS_API_KEY:-}" \
  -e ASAAS_ENV="${ASAAS_ENV:-homologation}" \
  -e ASAAS_WEBHOOK_TOKEN="${ASAAS_WEBHOOK_TOKEN:-}" \
  -e ASAAS_INVOICE_BASE="${ASAAS_INVOICE_BASE:-https://www.asaas.com/i}" \
  --restart unless-stopped \
  "$IMAGE"

# 5. Health check
echo ""
echo "→ Health check..."
sleep 5
HEALTH=$(curl -s http://localhost:3012/api/health 2>&1 || echo "FAIL")
echo "  /api/health → $HEALTH"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✓ Deploy concluído: $IMAGE"
echo "  https://igrejasede.fbautomacao.space"
echo "═══════════════════════════════════════════════════════"
