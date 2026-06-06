import { getGrupo } from '../api.js';
import { escHtml, formatCNPJ, diasClass, diasLabel } from '../utils.js';

export async function render(container, { id }) {
  container.innerHTML = `<div class="page-loading" style="min-height:200px;"><div class="spinner"></div></div>`;
  try {
    const grupo = await getGrupo(id);
    container.innerHTML = `
      <div style="margin-bottom:8px;">
        <a href="#/grupos" style="font-size:0.82rem;color:var(--muted);">← Grupos</a>
      </div>
      <div style="margin-bottom:24px;">
        <h1 style="font-size:clamp(1.4rem,3vw,2rem);">${escHtml(grupo.nome)}</h1>
        <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);text-transform:uppercase;">${grupo.tipo?.replace(/_/g,' ')}</span>
      </div>
      ${grupo.clientes?.length ? `
        <h3 style="margin-bottom:12px;">Membros (${grupo.clientes.length})</h3>
        <div style="background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;">
          ${grupo.clientes.map(c => `
            <a href="#/cliente/${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid rgba(26,22,18,0.05);text-decoration:none;color:inherit;">
              <div>
                <div style="font-family:var(--font-sans);font-weight:600;font-size:0.9rem;">${escHtml(c.nome_fantasia || c.razao_social)}</div>
                <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);">${formatCNPJ(c.cnpj)}</div>
              </div>
              <span class="dias-badge ${diasClass(c.dias_sem_contato)}">${diasLabel(c.dias_sem_contato)}</span>
            </a>`).join('')}
        </div>` : '<p style="color:var(--muted);">Nenhum membro associado ainda.</p>'}`;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--accent);">Erro: ${escHtml(err.message)}</p><a href="#/grupos" class="btn btn-ghost btn-sm" style="margin-top:12px;">← Voltar</a>`;
  }
}
