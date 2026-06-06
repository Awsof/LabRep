/* Dashboard — tela raiz mobile-first: busca + pendências do dia */

import { listarClientes, listarAlertas } from '../api.js';
import { getState } from '../state.js';
import { go } from '../router.js';

export async function render(container) {
  const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 0;

  container.innerHTML = isMobile
    ? renderMobile()
    : renderDesktop();

  // Busca
  const searchInput = container.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSearch({ target: searchInput });
    });
    if (isMobile) searchInput.focus();
  }

  // Carrega pendências
  loadPendencias(container);
  if (!isMobile) loadStats(container);
}

function renderMobile() {
  return `
    <div class="search-hero">
      <div style="position:relative;">
        <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:1.1rem;">🔍</span>
        <input id="search-input" class="input"
          style="padding-left:44px;"
          placeholder="Buscar cliente por nome ou CNPJ..."
          autocomplete="off"
          inputmode="search">
      </div>
    </div>

    <div id="search-results" style="display:none;"></div>

    <div id="pendencias-section">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h3 style="font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-family:var(--font-mono);">
          Pendências hoje
        </h3>
        <a href="#/alertas" style="font-size:0.75rem;color:var(--accent);">Ver todas</a>
      </div>
      <div id="pendencias-list">
        <div class="page-loading" style="min-height:120px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>`;
}

function renderDesktop() {
  return `
    <div style="margin-bottom:32px;">
      <div class="eyebrow" style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;">
        Dashboard
      </div>
      <h1>Bom dia, <span id="user-nome">Representante</span></h1>
    </div>

    <div class="grid-3" id="stats-grid" style="margin-bottom:32px;">
      <div class="card"><div class="card-label">Carregando...</div></div>
      <div class="card"><div class="card-label">Carregando...</div></div>
      <div class="card"><div class="card-label">Carregando...</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:start;">
      <div>
        <div style="position:relative;margin-bottom:24px;">
          <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--muted);">🔍</span>
          <input id="search-input" class="input" style="padding-left:44px;"
            placeholder="Buscar cliente...">
        </div>
        <div id="search-results"></div>
      </div>

      <div>
        <h3 style="margin-bottom:12px;">Pendências hoje</h3>
        <div id="pendencias-list">
          <div class="page-loading" style="min-height:120px;"><div class="spinner"></div></div>
        </div>
      </div>
    </div>`;
}

async function loadPendencias(container) {
  const list = container.querySelector('#pendencias-list');
  if (!list) return;

  try {
    const alertas = await listarAlertas();
    const pendencias = alertas?.filter(a => !a.lido) ?? [];

    if (!pendencias.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--muted);font-size:0.88rem;">
          ✅ Nenhuma pendência hoje
        </div>`;
      return;
    }

    list.innerHTML = pendencias.slice(0, 5).map(a => `
      <a href="#/cliente/${a.cliente_id}" class="pendencia-item" style="display:flex;align-items:center;gap:12px;padding:14px;background:white;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;text-decoration:none;color:inherit;">
        <span style="font-size:1.4rem;">${iconeTipo(a.tipo)}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-family:var(--font-sans);font-weight:600;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escHtml(a.titulo)}
          </div>
          <div class="dias-badge ${classeDias(a)}" style="margin-top:2px;">
            ${diasLabel(a)}
          </div>
        </div>
        <span style="color:var(--muted);font-size:0.9rem;">›</span>
      </a>`).join('');
  } catch {
    list.innerHTML = `<p style="color:var(--muted);font-size:0.85rem;">Não foi possível carregar alertas.</p>`;
  }
}

async function loadStats(container) {
  const grid = container.querySelector('#stats-grid');
  const nomeEl = container.querySelector('#user-nome');
  if (!grid) return;

  const { user } = getState();
  if (nomeEl && user?.nome) nomeEl.textContent = user.nome.split(' ')[0];

  try {
    const data = await listarClientes({ limit: 1, status: 'ativo' });
    grid.innerHTML = `
      <div class="card">
        <div class="card-label">Total de clientes ativos</div>
        <div style="font-family:var(--font-sans);font-weight:900;font-size:2rem;color:var(--accent);">${data?.total ?? '—'}</div>
      </div>
      <div class="card">
        <div class="card-label">Plano atual</div>
        <div style="font-family:var(--font-sans);font-weight:700;font-size:1.2rem;text-transform:capitalize;">${user?.plano ?? 'free'}</div>
      </div>
      <div class="card">
        <div class="card-label">Apoio atual</div>
        <div style="font-family:var(--font-sans);font-weight:700;font-size:1rem;">${user?.apoio?.nome ?? 'Não configurado'}</div>
      </div>`;
  } catch {
    grid.innerHTML = `<div class="card"><div class="card-label">Erro ao carregar estatísticas</div></div>`;
  }
}

async function handleSearch(e) {
  const q = e.target.value.trim();
  const resultsEl = document.querySelector('#search-results');
  if (!resultsEl) return;

  if (q.length < 2) {
    resultsEl.style.display = 'none';
    resultsEl.innerHTML = '';
    return;
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `<div class="page-loading" style="min-height:60px;"><div class="spinner"></div></div>`;

  try {
    const data = await listarClientes({ q, limit: 8 });
    const clientes = data?.data ?? [];

    if (!clientes.length) {
      resultsEl.innerHTML = `<p style="padding:16px;color:var(--muted);font-size:0.88rem;">Nenhum cliente encontrado para "${escHtml(q)}".</p>`;
      return;
    }

    resultsEl.innerHTML = clientes.map(c => `
      <a href="#/cliente/${c.id}" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;">
        <div style="flex:1;min-width:0;">
          <div style="font-family:var(--font-sans);font-weight:600;font-size:0.9rem;">
            ${escHtml(c.nome_fantasia || c.razao_social)}
          </div>
          <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);">
            ${formatCNPJ(c.cnpj)} · ${escHtml(c.municipio ?? '')} ${escHtml(c.uf ?? '')}
          </div>
        </div>
        <span class="dias-badge ${classeDiasNum(c.dias_sem_contato)}">
          ${c.dias_sem_contato != null ? c.dias_sem_contato + 'd' : '—'}
        </span>
      </a>`).join('');
  } catch {
    resultsEl.innerHTML = `<p style="padding:16px;color:var(--accent);font-size:0.85rem;">Erro na busca.</p>`;
  }
}

/* ── helpers ── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function escHtml(str) {
  return String(str ?? '').replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#x27;', '&':'&amp;' })[c]);
}

function formatCNPJ(cnpj) {
  if (!cnpj) return '—';
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function classeDiasNum(dias) {
  if (dias == null) return '';
  if (dias <= 7)  return 'ok';
  if (dias <= 15) return 'alerta';
  return 'critico';
}

function classeDias(alerta) {
  return alerta.tipo === 'sem_contato' ? 'critico' : 'alerta';
}

function diasLabel(a) {
  if (a.tipo === 'sem_contato') return `⚠️ Sem contato`;
  if (a.tipo === 'followup_vencido') return `📅 Follow-up vencido`;
  return `🔔 Agendado`;
}

function iconeTipo(tipo) {
  return { sem_contato: '📭', followup_vencido: '📅', agenda: '🔔' }[tipo] ?? '🔔';
}
