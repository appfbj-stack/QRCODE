#!/bin/bash
# list-congs.sh
API="http://127.0.0.1:3012"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).token||'')})")
echo "Lista de congregações:"
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/congregations" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  (j.data||[]).forEach(c=>console.log(' -', c.name));
})"
echo ""
echo "Lista de usuários com congregação:"
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/users" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  (j.data||[]).forEach(u=>console.log(' -', u.email, '·', u.role, '·', u.congregationName || 'GLOBAL'));
})"
