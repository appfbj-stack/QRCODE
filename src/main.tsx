import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// PWA desabilitado
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// Helper: mostrar erro na tela
function showError(prefix: string, err: any) {
  const root = document.getElementById('root');
  if (!root) return;
  const msg = (err && (err.message || String(err))) || 'Erro desconhecido';
  const stack = (err && err.stack) || '';
  const pre = document.createElement('pre');
  pre.style.cssText = 'padding:24px;font-family:monospace;color:#dc2626;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;margin:24px;white-space:pre-wrap;overflow:auto;max-width:100%;';
  pre.textContent = '⚠️ ' + prefix + ':\n\n' + msg + '\n\n' + stack;
  root.innerHTML = '';
  root.appendChild(pre);
}

window.addEventListener('error', (e) => {
  showError('Erro JS', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  showError('Promise rejeitada', e.reason);
});

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e: any) {
  showError('Erro ao montar App', e);
}
