#!/bin/bash
docker exec kairos-shared-pg psql -U kairos_igreja_user -d kairos_igreja_db -c "SELECT current_database() AS db, current_user AS user, version() AS pg_version;"
