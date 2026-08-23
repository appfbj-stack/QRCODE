#!/bin/bash
# test-event-api.sh
# Cria um evento de teste via API pra validar o schema

set -e

API="${API:-http://127.0.0.1:3012}"
EMAIL="${EMAIL:-admin@kairos.com}"
PASS="${PASS:-admin123}"

echo "→ Login..."
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$LOGIN" | grep -oP '"token":"\K[^"]+')
echo "  token: ${TOKEN:0:30}..."

echo ""
echo "→ Criar evento..."
RESP=$(curl -s -X POST "$API/api/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Culto da Família — Teste API",
    "description": "Evento criado via script pra validar o schema do Event.",
    "date": "2026-09-15T19:00:00.000Z",
    "time": "19:00",
    "location": "Templo Sede",
    "type": "Culto",
    "capacity": 50,
    "speaker": "Pr. Fernando Borges"
  }')
echo "  response: $RESP"

echo ""
echo "→ Listar eventos..."
LIST=$(curl -s -X GET "$API/api/events" -H "Authorization: Bearer $TOKEN")
echo "$LIST" | head -c 1000
echo "..."
