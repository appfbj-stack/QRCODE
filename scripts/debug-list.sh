#!/bin/bash
set -e
API="http://127.0.0.1:3012"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.token||'')})")
echo "Token: ${TOKEN:0:30}..."
echo ""
echo "Resposta completa do GET /api/events:"
RAW=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/api/events")
echo "$RAW" | head -c 1500
echo ""
echo ""
echo "→ Deletando eventos de teste..."
echo "$RAW" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  const arr = Array.isArray(j) ? j : (j.data||[]);
  const test = arr.filter(e => (e.title||'').includes('Teste API'));
  console.log('Encontrados:', test.length);
  test.forEach(e => console.log(' -', e.id, e.title));
  if(test.length>0) {
    const fs=require('fs');
    fs.writeFileSync('/tmp/ids.txt', test.map(e=>e.id).join('\n'));
  }
})"
if [ -f /tmp/ids.txt ]; then
  for ID in $(cat /tmp/ids.txt); do
    echo "DELETE $ID"
    curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API/api/events/$ID"
    echo
  done
fi
