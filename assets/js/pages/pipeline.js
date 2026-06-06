import { isPro } from '../state.js';
import { go } from '../router.js';

export async function render(container) {
  if (!isPro()) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px 24px;max-width:480px;margin:0 auto;">
        <div style="font-size:2.5rem;margin-bottom:16px;">⇢</div>
        <h2 style="margin-bottom:8px;">Pipeline de Vendas</h2>
        <p style="color:var(--muted);margin-bottom:24px;">O kanban de pipeline está disponível no plano <strong>Pro</strong>. Acompanhe suas negociações do prospecto ao fechamento.</p>
        <a href="#/configuracoes" class="btn btn-primary">Ver planos</a>
      </div>`;
    return;
  }
  container.innerHTML = `
    <h1 style="font-size:clamp(1.4rem,3vw,2rem);margin-bottom:24px;">Pipeline</h1>
    <p style="color:var(--muted);">Módulo em construção. Disponível em breve.</p>`;
}
