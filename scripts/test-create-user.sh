#!/bin/bash
# test-create-user.sh
# Testa criação de usuário via API com congregação
set -e
API="http://127.0.0.1:3012"
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kairos.com","password":"admin123"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).token||'')})")
echo "Token: ${TOKEN:0:30}..."

# Pega ID da congregação OBPC MINEIRÃO
CONG_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/api/congregations" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  const c=(j.data||[]).find(x=>x.name.includes('MINEIRÃO'));
  console.log(c?c.id:'');
})")
echo "Congregação OBPC MINEIRÃO: $CONG_ID"

echo ""
echo "→ Criando usuário de teste..."
EMAIL="teste.mineirao@$(date +%s).com"
RESP=$(curl -s -X POST "$API/api/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Teste Mineirão\",
    \"email\": \"$EMAIL\",
    \"password\": \"Teste123\",
    \"role\": \"GERENTE\",
    \"congregationId\": \"$CONG_ID\"
  }")
echo "$RESP" | head -c 500
echo ""

# Pega o id do user criado pra deletar depois
USER_ID=$(echo "$RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log((j.data||{}).id||'')})")
echo "User criado: $USER_ID ($EMAIL)"

# Confirma buscando
echo ""
echo "→ Confirmando via GET..."
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/users" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  const u=(j.data||[]).find(x=>x.email==='$EMAIL');
  if(u) console.log('✓ Encontrado:', u.name, '·', u.role, '·', u.congregationName || 'GLOBAL');
  else console.log('✗ Não encontrado');
})"

# Limpa
echo ""
echo "→ Removendo usuário de teste..."
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API/api/users/$USER_ID"
echo
