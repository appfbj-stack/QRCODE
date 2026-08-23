#!/bin/bash
# delete-test-event.sh
# Remove o evento de teste criado pelo test-event-api.sh
set -e
API="${API:-http://127.0.0.1:3012}"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).token||'')})")
echo "Token: ${TOKEN:0:30}..."
if [ -z "$TOKEN" ]; then echo "Login falhou, abortando."; exit 1; fi
LIST=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/api/events")
ID=$(echo "$LIST" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const arr=Array.isArray(j)?j:(j.data||[]);const ev=arr.find(e=>(e.title||'').includes('Teste API'));console.log(ev?ev.id:'')})")
if [ -z "$ID" ]; then
  echo "Nenhum evento de teste encontrado."
  exit 0
fi
echo "Deletando evento $ID..."
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API/api/events/$ID"
echo
echo "✓ Removido"
