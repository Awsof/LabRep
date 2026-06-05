import { getState } from '../state.js';
import { signOut } from '../auth.js';

export async function render(container) {
  const { user } = getState();
  const planoLabel = { free:'Free', pro:'Pro', pro_plus:'Pro+', b2b:'B2B (Corporativo)' };

  container.innerHTML = `
    <div style="margin-bottom:24px;">
      <div style="font-family:var(--font-mono);font-size:0.68rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);">Conta</div>
      <h1 style="font-size:clamp(1.4rem,3vw,2rem);">Configurações</h1>
    </div>

    <div style="max-width:560px;display:flex;flex-direction:column;gap:16px;">
      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:24px;">
        <h3 style="margin-bottom:16px;">Perfil</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:0.9rem;">
          <div style="display:flex;gap:12px;"><span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);min-width:80px;padding-top:2px;">Nome</span><span>${user?.nome ?? '—'}</span></div>
          <div style="display:flex;gap:12px;"><span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);min-width:80px;padding-top:2px;">Email</span><span>${user?.email ?? '—'}</span></div>
          <div style="display:flex;gap:12px;"><span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted);min-width:80px;padding-top:2px;">Apoio atual</span><span>${user?.apoio?.nome ?? 'Não configurado'}</span></div>
        </div>
      </div>

      <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3>Plano</h3>
          <span class="tag ${user?.plano === 'free' ? 'tag-a' : 'tag-g'}">${planoLabel[user?.plano] ?? 'Free'}</span>
        </div>
        ${user?.plano === 'free' ? `
          <p style="font-size:0.88rem;color:var(--muted);margin-bottom:16px;">Você está no plano gratuito — máximo de 30 clientes. Faça upgrade para desbloquear alertas, pipeline e sem limites.</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;border:2px solid var(--accent);border-radius:10px;padding:16px;text-align:center;">
              <div style="font-family:var(--font-sans);font-weight:800;font-size:1.4rem;color:var(--accent);">R$79<span style="font-size:0.8rem;font-weight:500;">/mês</span></div>
              <div style="font-family:var(--font-mono);font-size:0.7rem;margin:8px 0;color:var(--muted);">PRO</div>
              <p style="font-size:0.8rem;color:var(--ink2);">Ilimitado · Alertas · Pipeline · PWA</p>
              <button class="btn btn-primary btn-full" style="margin-top:12px;" disabled>Em breve</button>
            </div>
          </div>` : '<p style="color:var(--green);font-size:0.88rem;">✅ Plano ativo. Obrigado!</p>'}
      </div>

      <button class="btn btn-ghost" id="btn-sair" style="border-color:var(--accent);color:var(--accent);">↩ Sair da conta</button>
    </div>`;

  container.querySelector('#btn-sair').addEventListener('click', () => {
    if (confirm('Sair do LabRep?')) signOut();
  });
}
