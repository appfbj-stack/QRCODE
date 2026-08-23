#!/bin/bash
# fix-user-congregation.sh
# Diagnostica usuários sem congregationId e mostra JSON
set -e
API="http://127.0.0.1:3012"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).token||'')})")
echo "Token: ${TOKEN:0:30}..."
echo ""
echo "GET /api/users:"
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/users" | head -c 4000
echo ""
echo ""
echo "GET /api/congregations:"
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/congregations" | head -c 1500
echo ""
