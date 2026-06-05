import { listarClientes } from '../api.js';
import { escHtml, formatCNPJ, diasClass, diasLabel, tipoLabel, statusLabel } from '../utils.js';
import { go } from '../router.js';

let _state = { q: '', status: '', page: 0, loading: false };

export async function render(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);">Carteira</div>
        <h1 style="font-size:clamp(1.4rem,3vw,2rem);">Meus Clientes</h1>
      </div>
      <a href="#/cliente/novo" class="btn btn-primary">+ Novo cliente</a>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;position:relative;">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);">🔍</span>
        <input id="q" class="input" style="padding-left:38px;" placeholder="Nome, fantasia ou CNPJ..." value="">
      </div>
      <select id="filtro-status" class="input" style="width:auto;min-width:150px;">
        <option value="">Todos os status</option>
        <option value="ativo">Ativo</option>
        <option value="prospecto">Prospecto</option>
        <option value="em_negociacao">Em negociação</option>
        <option value="inativo">Inativo</option>
      </select>
      <select id="filtro-tipo" class="input" style="width:auto;min-width:150px;">
        <option value="">Todos os tipos</option>
        <option value="clinica">Clínica</option>
        <option value="consultorio">Consultório</option>
        <option value="hospital">Hospital</option>
        <option value="lab_parceiro">Lab Parceiro</option>
        <option value="posto_coleta">Posto Coleta</option>
      </select>
    </div>

    <div id="lista-clientes">
      <div class="page-loading" style="min-height:200px;"><div class="spinner"></div></div>
    </div>

    <div id="paginacao" style="display:flex;justify-content:center;gap:8px;margin-top:24px;"></div>`;

  container.querySelector('#q').addEventListener('input', debounce(e => {
    _state = { ..._state, q: e.target.value.trim(), page: 0 };
    load(container);
  }, 350));

  container.querySelector('#filtro-status').addEventListener('change', e => {
    _state = { ..._state, status: e.target.value, page: 0 };
    load(container);
  });

  container.querySelector('#filtro-tipo').addEventListener('change', e => {
    _state = { ..._state, tipo: e.target.value, page: 0 };
    load(container);
  });

  await load(container);
}

async function load(container) {
  const list = container.querySelector('#lista-clientes');
  if (!list || _state.loading) return;
  _state.loading = true;

  list.innerHTML = `<div class="page-loading" style="min-height:160px;"><div class="spinner"></div></div>`;

  try {
    const params = { limit: 20, offset: _state.page * 20 };
    if (_state.q)      params.q = _state.q;
    if (_state.status) params.status = _state.status;
    if (_state.tipo)   params.tipo = _state.tipo;

    const data = await listarClientes(params);
    const clientes = data?.data ?? [];
    const total = data?.total ?? 0;

    if (!clientes.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px;color:var(--muted);">
          <div style="font-size:2rem;margin-bottom:12px;">📋</div>
          <p>${_state.q ? `Nenhum cliente encontrado para "${escHtml(_state.q)}"` : 'Nenhum cliente cadastrado ainda.'}</p>
          ${!_state.q ? `<a href="#/cliente/novo" class="btn btn-primary" style="margin-top:16px;">Cadastrar primeiro cliente</a>` : ''}
        </div>`;
      return;
    }

    list.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--muted);margin-bottom:12px;letter-spacing:0.08em;">
        ${total} cliente${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}
      </div>
      <div style="background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;">
        ${clientes.map(c => clienteRow(c)).join('')}
      </div>`;

    renderPaginacao(container, total);
  } catch (err) {
    list.innerHTML = `<p style="color:var(--accent);padding:16px;">Erro ao carregar clientes: ${escHtml(err.message)}</p>`;
  } finally {
    _state.loading = false;
  }
}

function clienteRow(c) {
  const dias = c.dias_sem_contato;
  const nome = escHtml(c.nome_fantasia || c.razao_social);
  return `
    <a href="#/cliente/${c.id}" style="display:grid;grid-template-columns:1fr auto;align-items:center;gap:16px;padding:14px 20px;border-bottom:1px solid rgba(26,22,18,0.05);text-decoration:none;color:inherit;transition:background 0.15s;">
      <div style="min-width:0;">
        <div style="font-family:var(--font-sans);font-weight:600;font-size:0.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nome}</div>
        <div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;">
          <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);">${formatCNPJ(c.cnpj)}</span>
          <span class="tag ${c.status === 'ativo' ? 'tag-g' : c.status === 'prospecto' ? 'tag-b' : 'tag-a'}" style="font-size:0.6rem;">${statusLabel(c.status)}</span>
          ${c.municipio ? `<span style="font-size:0.75rem;color:var(--muted);">${escHtml(c.municipio)}/${escHtml(c.uf ?? '')}</span>` : ''}
          ${c.grupo_nome ? `<span style="font-size:0.75rem;color:var(--blue);">◎ ${escHtml(c.grupo_nome)}</span>` : ''}
        </div>
      </div>
      <div class="dias-badge ${diasClass(dias)}" style="text-align:right;white-space:nowrap;">
        ${dias != null ? diasLabel(dias) + ' sem contato' : 'Sem interação'}
      </div>
    </a>`;
}

function renderPaginacao(container, total) {
  const pag = container.querySelector('#paginacao');
  if (!pag) return;
  const pages = Math.ceil(total / 20);
  if (pages <= 1) { pag.innerHTML = ''; return; }
  pag.innerHTML = Array.from({ length: Math.min(pages, 10) }, (_, i) => `
    <button onclick="window._pagTo(${i})" class="btn btn-ghost btn-sm" ${i === _state.page ? 'style="background:var(--accent);color:white;"' : ''}>${i + 1}</button>
  `).join('');
  window._pagTo = (p) => { _state.page = p; load(container); };
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
