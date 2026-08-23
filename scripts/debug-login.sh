#!/bin/bash
set -e
API="http://127.0.0.1:3012"
echo "→ Login..."
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}')
echo "Resposta login:"
echo "$LOGIN"
echo ""
echo "→ Tentando pegar token..."
TOKEN=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.token||'VAZIO:'+JSON.stringify(j))})")
echo "Token: $TOKEN"
