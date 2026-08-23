#!/bin/bash
# Script para dropar o banco antigo (kairos_igreja_db)
# IRREVERSÍVEL. Use com cuidado.

ADMIN_PASS="4yh6vfivT7K92sjngSxj7gkbacvNKF1l"

echo "=== Verificando banco NOVO antes de deletar o antigo ==="
docker exec kairos-shared-pg psql -U kairos_igreja_user -d kairos_igreja_db_v2 -c "SELECT 'Tenant' as t, COUNT(*) FROM \"Tenant\" UNION ALL SELECT 'User', COUNT(*) FROM \"User\" UNION ALL SELECT 'Congregation', COUNT(*) FROM \"Congregation\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Member', COUNT(*) FROM \"Member\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Asset', COUNT(*) FROM \"Asset\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" WHERE \"deletedAt\" IS NULL;"

echo ""
echo "=== Listando bancos antes do drop ==="
docker exec kairos-shared-pg psql -U postgres -l 2>&1 | grep -E "kairos_igreja"

echo ""
echo "=== Desconectando usuarios ativos do banco antigo ==="
# O drop falha se tiver conexoes ativas — terminate primeiro
docker exec kairos-shared-pg psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'kairos_igreja_db' AND pid <> pg_backend_pid();" 2>&1

echo ""
echo "=== DROP DATABASE kairos_igreja_db ==="
docker exec kairos-shared-pg psql -U postgres -c "DROP DATABASE kairos_igreja_db;"

echo ""
echo "=== Listando bancos depois do drop ==="
docker exec kairos-shared-pg psql -U postgres -l 2>&1 | grep -E "kairos_igreja"

echo ""
echo "=== Validando que o app continua funcionando ==="
sleep 2
curl -sS https://igrejasede.fbautomacao.space/api/health -k
echo ""

echo ""
echo "Login de teste..."
curl -sS -X POST https://igrejasede.fbautomacao.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' -k | head -c 150
echo ""
