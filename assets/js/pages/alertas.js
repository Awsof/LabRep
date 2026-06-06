import { listarAlertas, marcarAlertaLido } from '../api.js';
import { escHtml } from '../utils.js';

export async function render(container) {
  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);">Alertas</div>
      <h1 style="font-size:clamp(1.4rem,3vw,2rem);">Pendências</h1>
    </div>
    <div id="alertas-list">
      <div class="page-loading" style="min-height:200px;"><div class="spinner"></div></div>
    </div>`;

  await load(container);
}

async function load(container) {
  const list = container.querySelector('#alertas-list');
  try {
    const alertas = await listarAlertas();
    const pendentes = (alertas ?? []).filter(a => !a.lido);

    if (!pendentes.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:64px;color:var(--muted);">
          <div style="font-size:2.5rem;margin-bottom:12px;">✅</div>
          <p style="font-family:var(--font-sans);font-weight:600;">Nenhuma pendência!</p>
          <p style="font-size:0.88rem;margin-top:6px;">Todos os seus clientes estão em dia.</p>
        </div>`;
      return;
    }

    list.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.68rem;color:var(--muted);margin-bottom:12px;letter-spacing:0.08em;">
        ${pendentes.length} pendência${pendentes.length !== 1 ? 's' : ''}
      </div>
      ${pendentes.map(a => alertaCard(a)).join('')}`;

    list.querySelectorAll('[data-marcar-lido]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.dataset.marcarLido;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await marcarAlertaLido(id);
          btn.closest('.alerta-card').remove();
        } catch {
          btn.disabled = false;
          btn.textContent = 'Marcar como lido';
        }
      });
    });
  } catch (err) {
    list.innerHTML = `<p style="color:var(--accent);padding:16px;">Erro ao carregar alertas: ${escHtml(err.message)}</p>`;
  }
}

function alertaCard(a) {
  const icones = { sem_contato: '📭', followup_vencido: '📅', agenda: '🔔' };
  const icone = icones[a.tipo] ?? '🔔';
  return `
    <div class="alerta-card" style="display:flex;align-items:center;gap:16px;padding:16px;background:white;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;">
      <span style="font-size:1.6rem;">${icone}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--font-sans);font-weight:600;font-size:0.92rem;">${escHtml(a.titulo)}</div>
        ${a.razao_social ? `<a href="#/cliente/${a.cliente_id}" style="font-size:0.8rem;color:var(--accent);">${escHtml(a.nome_fantasia || a.razao_social)}</a>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" data-marcar-lido="${a.id}">Marcar como lido</button>
    </div>`;
}
