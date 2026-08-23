#!/bin/bash
DB="kairos_igreja_db_v2"
PSQL="docker exec kairos-shared-pg psql -U kairos_igreja_user -d $DB"

echo "=== Duplicatas em Congregation ==="
$PSQL -c "SELECT name, COUNT(*) FROM \"Congregation\" GROUP BY name HAVING COUNT(*) > 1;"

echo ""
echo "=== Duplicatas em Member ==="
$PSQL -c "SELECT name, COUNT(*) FROM \"Member\" GROUP BY name HAVING COUNT(*) > 1;"

echo ""
echo "=== Limpando duplicatas (mantém o mais antigo de cada) ==="

# Remove duplicatas de Congregation mantendo o MIN(id)
$PSQL -c "DELETE FROM \"Congregation\" c1 USING \"Congregation\" c2 WHERE c1.\"name\" = c2.\"name\" AND c1.\"createdAt\" > c2.\"createdAt\";"

# Remove duplicatas de Member mantendo o MIN(id)
$PSQL -c "DELETE FROM \"Member\" m1 USING \"Member\" m2 WHERE m1.\"name\" = m2.\"name\" AND m1.\"createdAt\" > m2.\"createdAt\";"

echo ""
echo "=== Contagem final ==="
$PSQL -c "SELECT 'Tenant' as t, COUNT(*) FROM \"Tenant\" UNION ALL SELECT 'User', COUNT(*) FROM \"User\" UNION ALL SELECT 'Congregation', COUNT(*) FROM \"Congregation\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Member', COUNT(*) FROM \"Member\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Asset', COUNT(*) FROM \"Asset\" WHERE \"deletedAt\" IS NULL UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" WHERE \"deletedAt\" IS NULL;"
