#!/bin/bash
# Cria um banco NOVO (kairos_igreja_db_v2) preservando o antigo (kairos_igreja_db)
# A senha do admin do Postgres está em /root/kairos-shared-pg-secrets.txt

ADMIN_PASS="4yh6vfivT7K92sjngSxj7gkbacvNKF1l"
NEW_DB="kairos_igreja_db_v2"
NEW_USER="kairos_igreja_user"   # mesmo user do banco antigo
NEW_PASS="tMDDYehRWOkhaojneP662TI6KIoSvoCQ"  # mesma senha

echo "==> Verificando se o banco novo já existe"
EXISTS=$(docker exec kairos-shared-pg psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$NEW_DB'")
if [ "$EXISTS" = "1" ]; then
  echo "    Banco '$NEW_DB' já existe — pulando criação"
else
  echo "==> Criando banco $NEW_DB"
  docker exec kairos-shared-pg psql -U postgres -c "CREATE DATABASE \"$NEW_DB\" OWNER \"$NEW_USER\";"
  echo "    OK"
fi

echo ""
echo "==> Granting privileges"
docker exec kairos-shared-pg psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$NEW_DB\" TO \"$NEW_USER\";"

echo ""
echo "==> Listando bancos"
docker exec kairos-shared-pg psql -U postgres -c "\\l" | grep -E "kairos|Name"
