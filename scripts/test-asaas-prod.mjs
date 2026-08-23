// Testa conexão com Asaas (produção) — HOSTNAME = api.asaas.com
const key = process.env.ASAAS_API_KEY;
const base = 'https://api.asaas.com/v3';

console.log('Base:', base);
console.log('Key prefix:', key ? key.slice(0, 25) + '...' : '(não definida)');

try {
  const r = await fetch(`${base}/customers?limit=1`, {
    headers: { access_token: key },
  });
  const text = await r.text();
  console.log('Status:', r.status);
  console.log('Body (300 chars):', text.slice(0, 300));
} catch (e) {
  console.log('ERR:', e.message);
}
