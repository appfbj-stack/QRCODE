import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ==========================================
// PWA desabilitado pra evitar cache stale
// ==========================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// ==========================================
// Erro visível em vez de tela em branco
// ==========================================
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#dc2626;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;margin:24px;white-space:pre-wrap;">⚠️ Erro no app:\n\n${e.message || e.error?.message || 'Erro desconhecido'}\n\nArquivo: ${e.filename || '?'}\nLinha: ${e.lineno || '?'}</div>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  const root = document.getElementById('root');
  if (root) {
    const msg = e.reason?.message || String(e.reason || 'Promise rejeitada');
    const stack = e.reason?.stack || '';
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#dc2626;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;margin:24px;white-space:pre-wrap;">⚠️ Erro no app:\n\n${msg}\n\n${stack}</div>`;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
