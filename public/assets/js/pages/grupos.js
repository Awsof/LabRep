import { listarGrupos, criarGrupo } from '../api.js';
import { escHtml } from '../utils.js';

export async function render(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);">Grupos</div>
        <h1 style="font-size:clamp(1.4rem,3vw,2rem);">Redes e Grupos</h1>
      </div>
      <button class="btn btn-primary" id="btn-novo-grupo">+ Novo grupo</button>
    </div>
    <div id="grupos-list">
      <div class="page-loading" style="min-height:200px;"><div class="spinner"></div></div>
    </div>`;

  container.querySelector('#btn-novo-grupo').addEventListener('click', () => abrirModalNovoGrupo(container));
  await loadGrupos(container);
}

async function loadGrupos(container) {
  const list = container.querySelector('#grupos-list');
  try {
    const grupos = await listarGrupos();
    if (!grupos?.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:64px;color:var(--muted);">
          <div style="font-size:2rem;margin-bottom:12px;">◎</div>
          <p>Nenhum grupo cadastrado.</p>
          <p style="font-size:0.85rem;margin-top:6px;">Grupos permitem agrupar clientes de uma mesma rede (ex: Rede LabForte).</p>
        </div>`;
      return;
    }
    list.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${grupos.map(g => grupoCard(g)).join('')}
    </div>`;
  } catch (err) {
    list.innerHTML = `<p style="color:var(--accent);padding:16px;">Erro: ${escHtml(err.message)}</p>`;
  }
}

function grupoCard(g) {
  const tipoIcons = { rede_laboratorial:'🔬', rede_hospitalar:'🏥', grupo_economico:'🏢', associacao:'🤝', outros:'◎' };
  return `
    <a href="#/grupo/${g.id}" style="display:block;text-decoration:none;">
      <div class="card" style="cursor:pointer;">
        <div style="font-size:1.4rem;margin-bottom:8px;">${tipoIcons[g.tipo] ?? '◎'}</div>
        <h3>${escHtml(g.nome)}</h3>
        <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">${g.tipo?.replace('_',' ') ?? ''}</div>
        ${g.total_unidades != null ? `<div style="margin-top:12px;font-family:var(--font-mono);font-size:0.78rem;"><strong style="color:var(--accent);">${g.total_unidades}</strong> unidades · <strong style="color:var(--green);">R$${Number(g.potencial_total_mensal ?? 0).toLocaleString('pt-BR')}</strong>/mês</div>` : ''}
      </div>
    </a>`;
}

function abrirModalNovoGrupo(container) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Novo Grupo / Rede</h3>
        <button class="modal-close" id="close-modal">✕</button>
      </div>
      <div class="stack">
        <div class="field"><label>Nome do grupo *</label><input class="input" id="g-nome" placeholder="Ex: Rede LabForte"></div>
        <div class="field"><label>Tipo</label>
          <select class="input" id="g-tipo">
            <option value="rede_laboratorial">Rede Laboratorial</option>
            <option value="rede_hospitalar">Rede Hospitalar</option>
            <option value="grupo_economico">Grupo Econômico</option>
            <option value="associacao">Associação</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div class="field"><label>Contato (decisor)</label><input class="input" id="g-contato" placeholder="Nome do responsável"></div>
        <div class="field"><label>WhatsApp</label><input class="input" id="g-whatsapp" placeholder="5511999999999"></div>
        <button class="btn btn-primary btn-full" id="btn-salvar-grupo">Salvar grupo</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#close-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#btn-salvar-grupo').addEventListener('click', async () => {
    const nome = overlay.querySelector('#g-nome').value.trim();
    if (!nome) return;
    const btn = overlay.querySelector('#btn-salvar-grupo');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await criarGrupo({
        nome,
        tipo: overlay.querySelector('#g-tipo').value,
        contato_nome: overlay.querySelector('#g-contato').value.trim() || null,
        whatsapp: overlay.querySelector('#g-whatsapp').value.trim() || null,
      });
      overlay.remove();
      await loadGrupos(container);
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar grupo';
      alert('Erro: ' + err.message);
    }
  });
}
