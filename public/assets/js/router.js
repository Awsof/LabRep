/* LabRep Router — Hash Routing com lazy loading de páginas */

import { requireLogin } from './auth.js';

const routes = {
  '#/'              : () => import('./pages/dashboard.js'),
  '#/carteira'      : () => import('./pages/carteira.js'),
  '#/cliente/novo'  : () => import('./pages/cliente-form.js'),
  '#/cliente/:id'   : () => import('./pages/cliente.js'),
  '#/grupos'        : () => import('./pages/grupos.js'),
  '#/grupo/:id'     : () => import('./pages/grupo.js'),
  '#/alertas'       : () => import('./pages/alertas.js'),
  '#/pipeline'      : () => import('./pages/pipeline.js'),
  '#/configuracoes' : () => import('./pages/configuracoes.js'),
};

const app = document.getElementById('app');

function matchRoute(hash) {
  for (const [pattern, loader] of Object.entries(routes)) {
    const params = extractParams(pattern, hash);
    if (params !== null) return { loader, params };
  }
  return null;
}

function extractParams(pattern, hash) {
  const pParts = pattern.split('/');
  const hParts = hash.split('/');
  if (pParts.length !== hParts.length) return null;

  const params = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(hParts[i]);
    } else if (pParts[i] !== hParts[i]) {
      return null;
    }
  }
  return params;
}

async function navigate() {
  const hash = window.location.hash || '#/';

  const loggedIn = await requireLogin();
  if (!loggedIn) return;

  const match = matchRoute(hash);
  if (!match) {
    window.location.hash = '#/';
    return;
  }

  app.innerHTML = `
    <div class="page-loading">
      <div class="spinner"></div>
      <span>Carregando...</span>
    </div>`;

  try {
    const mod = await match.loader();
    await mod.render(app, match.params);
  } catch (err) {
    app.innerHTML = `
      <div class="page-loading">
        <p style="color:var(--accent)">Erro ao carregar a página.</p>
        <a href="#/" class="btn btn-ghost btn-sm">Voltar ao início</a>
      </div>`;
    if (DEV) console.error(err); // eslint-disable-line no-undef
  }

  updateActiveNav(hash);
}

function updateActiveNav(hash) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    const href = el.getAttribute('href') ?? '';
    el.classList.toggle('active', hash.startsWith(href) && href !== '#/');
    if (href === '#/') el.classList.toggle('active', hash === '#/' || hash === '#');
  });
}

export function initRouter() {
  window.addEventListener('hashchange', navigate);
  navigate();
}

export function go(hash) {
  window.location.hash = hash;
}
