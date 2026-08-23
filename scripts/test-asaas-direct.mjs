// test-asaas-direct.mjs
// Testa conexão com Asaas direto (sem passar pelo nosso backend)
const key = process.env.ASAAS_API_KEY;
const env = process.env.ASAAS_ENV || 'homologation';
const base = env === 'production' ? 'https://api.asaas.com/v3' : 'https://api-hml.asaas.com/v3';

console.log('Base:', base);
console.log('Key:', key ? key.slice(0, 20) + '...' : '(não definida)');

try {
  const r = await fetch(`${base}/customers?limit=1`, {
    headers: { access_token: key },
  });
  const text = await r.text();
  console.log('Status:', r.status);
  console.log('Body (200 chars):', text.slice(0, 200));
} catch (e) {
  console.log('ERR:', e.message);
}
