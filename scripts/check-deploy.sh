#!/bin/bash
echo "=== 1. HTTPS via Dokploy Caddy ==="
curl -sS -k -o /dev/null -w "Status: %{http_code} | Server: %{header_server}\n" https://igrejasede.fbautomacao.space/api/health
echo ""
echo "=== 2. Body (primeiros 200 chars) ==="
curl -sS -k https://igrejasede.fbautomacao.space/api/health | head -c 200
echo ""
echo ""
echo "=== 3. Containers dokploy gerenciados ==="
docker ps -a --format 'table {{.Names}}	{{.Image}}	{{.Status}}	{{.Ports}}' | grep -E "uyihlo|kairos-igreja|igrei"
echo ""
echo "=== 4. Tudo do projeto kairosigreja ==="
ls /etc/dokploy/compose/ 2>&1 | grep -i kairosigreja
echo ""
echo "=== 5. Direto porta 3012 (sem Caddy) ==="
curl -sS http://localhost:3012/api/health 2>&1 | head -c 200
echo ""
