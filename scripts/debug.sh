#!/bin/bash
echo "=== Logs do container ==="
docker logs kairos-igreja-app 2>&1 | head -60
echo ""
echo "=== DNS check dentro do container ==="
docker exec kairos-igreja-app sh -c "getent hosts kairos-shared-pg 2>&1; echo '---'; cat /etc/resolv.conf; echo '---'; nslookup kairos-shared-pg 2>&1 | head -5"
echo ""
echo "=== Env vars ==="
docker exec kairos-igreja-app sh -c "env | grep -E 'DATABASE_URL|JWT|APP_URL|NODE_ENV|PORT' 2>&1"
echo ""
echo "=== Network do container ==="
docker inspect kairos-igreja-app --format "{{.NetworkSettings.Networks}}"
docker network inspect bridge --format "{{range .Containers}}{{.Name}} {{end}}"
