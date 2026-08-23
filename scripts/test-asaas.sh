#!/bin/bash
# test-asaas.sh
set -e
API="http://127.0.0.1:3012"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).token||'')})")
echo "Token: ${TOKEN:0:30}..."
echo ""
echo "Billing status:"
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/billing/status" | head -c 800
echo ""
echo ""
echo "Checkout Pix:"
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$API/api/billing/checkout/pix" | head -c 800
echo ""
