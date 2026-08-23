#!/bin/bash
# Smoke test: health, login, list members, list congregations
echo "=== 1. Health (via Caddy) ==="
curl -sS https://kairos-igreja.fbautomacao.space/api/health -k
echo ""
echo ""
echo "=== 2. Login admin ==="
LOGIN=$(curl -sS -X POST https://kairos-igreja.fbautomacao.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' -k)
echo "$LOGIN" | head -c 200
echo ""
echo ""
TOKEN=$(echo "$LOGIN" | grep -oP '"token":"\K[^"]+' | head -1)
echo "TOKEN length: ${#TOKEN}"
echo ""
echo "=== 3. List members ==="
curl -sS https://kairos-igreja.fbautomacao.space/api/members \
  -H "Authorization: Bearer $TOKEN" -k | head -c 500
echo ""
echo ""
echo "=== 4. List congregations ==="
curl -sS https://kairos-igreja.fbautomacao.space/api/congregations \
  -H "Authorization: Bearer $TOKEN" -k | head -c 300
