#!/bin/bash
docker cp /tmp/migrate-from-old.js kairos-igreja-app:/app/migrate-from-old.mjs
docker exec kairos-igreja-app sh -c "cd /app && OLD_DATABASE_URL=postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db DATABASE_URL=postgresql://kairos_igreja_user:tMDDYehRWOkhaojneP662TI6KIoSvoCQ@kairos-shared-pg:5432/kairos_igreja_db_v2 npx tsx migrate-from-old.mjs"
