#!/bin/bash
DB="kairos_igreja_db"
echo "=== TABLES ==="
docker exec kairos-shared-pg psql -U kairos_igreja_user -d "$DB" -c "\dt"
echo ""
for t in congregations members users patrimonio agenda; do
  echo "=== $t schema ==="
  docker exec kairos-shared-pg psql -U kairos_igreja_user -d "$DB" -c "\d $t"
  echo ""
  echo "=== $t sample (3 rows) ==="
  docker exec kairos-shared-pg psql -U kairos_igreja_user -d "$DB" -c "SELECT * FROM $t LIMIT 3;"
  echo ""
done
echo "=== COUNTS ==="
for t in congregations members users patrimonio agenda; do
  c=$(docker exec kairos-shared-pg psql -U kairos_igreja_user -d "$DB" -tAc "SELECT count(*) FROM $t")
  echo "  $t: $c"
done
