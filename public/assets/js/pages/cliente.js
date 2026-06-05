import { getCliente, listarInteracoes, registrarInteracao } from '../api.js';
import { escHtml, formatCNPJ, tipoLabel, statusLabel } from '../utils.js';

export async function render(container, { id }) {
  container.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;
  try {
    const [cliente, interData] = await Promise.all([
      getCliente(id),
      listarInteracoes(id, { limit: 10 }),
    ]);
    const inters = interData?.data ?? interData ?? [];
    container.innerHTML = fichaHTML(cliente, inters);
    bindActions(container, cliente, inters);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--accent);">Erro: ${escHtml(err.message)}</p><a href="#/carteira" class="btn btn-ghost btn-sm" style="margin-top:12px;">← Carteira</a>`;
  }
}

function fichaHTML(c, inters) {
  const whatsappUrl = c.whatsapp ? `https://wa.me/${c.whatsapp.replace(/\D/g,'')}` : null;
  return `
    <div style="margin-bottom:8px;"><a href="#/carteira" style="font-size:0.82rem;color:var(--muted);">← Carteira</a></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
      <div>
        <h1 style="font-size:clamp(1.2rem,3vw,2rem);">${escHtml(c.nome_fantasia || c.razao_social)}</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
          <span class="tag ${c.status==='ativo'?'tag-g':c.status==='prospecto'?'tag-b':'tag-a'}">${statusLabel(c.status)}</span>
          <span class="tag tag-b">${tipoLabel(c.tipo)}</span>
          ${c.grupo_nome ? `<span class="tag" style="background:rgba(26,63,111,0.08);color:var(--blue);">◎ ${escHtml(c.grupo_nome)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        ${whatsappUrl ? `<a href="${whatsappUrl}" target="_blank" class="btn btn-ghost btn-sm">💬 WhatsApp</a>` : ''}
        <button class="btn btn-primary btn-sm" id="btn-registrar">+ Interação</button>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;gap:16px;">
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;">
        <h3 style="margin-bottom:12px;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.08em;font-family:var(--font-mono);color:var(--muted);">Dados</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${row('CNPJ', formatCNPJ(c.cnpj))}
          ${row('Razão Social', c.razao_social)}
          ${c.municipio ? row('Localização', `${c.municipio}/${c.uf}`) : ''}
          ${c.contato_nome ? row('Contato', c.contato_nome) : ''}
          ${c.email ? row('Email', c.email) : ''}
          ${c.potencial_mensal ? row('Potencial', `R$${Number(c.potencial_mensal).toLocaleString('pt-BR')}/mês`) : ''}
        </div>
      </div>
      <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;">
        <h3 style="margin-bottom:12px;font-size:0.82rem;text-transform:uppercase;letter-spacing:0.08em;font-family:var(--font-mono);color:var(--muted);">Timeline</h3>
        <div id="timeline">
          ${!inters.length ? '<p style="color:var(--muted);font-size:0.85rem;">Nenhuma interação registrada.</p>' :
            inters.map(i => interItem(i)).join('')}
        </div>
      </div>
    </div>`;
}

function row(label, value) {
  return `<div style="display:flex;gap:8px;font-size:0.85rem;">
    <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted);min-width:80px;padding-top:2px;">${label}</span>
    <span>${escHtml(String(value))}</span>
  </div>`;
}

function interItem(i) {
  const icons = {visita:'🚗',whatsapp:'💬',ligacao:'📞',email:'📧',proposta:'📄',outro:'📝'};
  const data = new Date(i.realizada_em).toLocaleDateString('pt-BR');
  return `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid rgba(26,22,18,0.05);">
    <span style="font-size:1.1rem;">${icons[i.tipo]??'📝'}</span>
    <div style="flex:1;min-width:0;">
      <div style="font-size:0.82rem;font-family:var(--font-mono);color:var(--muted);">${data}</div>
      ${i.descricao ? `<div style="font-size:0.88rem;margin-top:2px;">${escHtml(i.descricao)}</div>` : ''}
    </div>
    ${i.resultado ? `<span class="tag ${i.resultado==='positivo'?'tag-g':i.resultado==='negativo'?'tag-r':'tag-a'}" style="font-size:0.58rem;">${i.resultado}</span>` : ''}
  </div>`;
}

function bindActions(container, cliente, inters) {
  container.querySelector('#btn-registrar')?.addEventListener('click', () =>
    abrirModalInteracao(container, cliente.id));
}

function abrirModalInteracao(container, clienteId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h3>Registrar Interação</h3><button class="modal-close" id="close-m">✕</button></div>
      <div class="stack">
        <div class="field"><label>Tipo *</label>
          <div class="type-group">
            ${['visita','whatsapp','ligacao','email','proposta','outro'].map(t =>
              `<button class="type-btn" data-tipo="${t}">${{visita:'🚗 Visita',whatsapp:'💬 WhatsApp',ligacao:'📞 Ligação',email:'📧 Email',proposta:'📄 Proposta',outro:'📝 Outro'}[t]}</button>`
            ).join('')}
          </div>
          <input type="hidden" id="tipo-sel" value="">
        </div>
        <div class="field"><label>Resultado</label>
          <div class="type-group">
            ${['positivo','neutro','negativo','sem_resposta'].map(r =>
              `<button class="type-btn" data-resultado="${r}">${{positivo:'✅ Positivo',neutro:'➡️ Neutro',negativo:'❌ Negativo',sem_resposta:'📵 Sem resposta'}[r]}</button>`
            ).join('')}
          </div>
          <input type="hidden" id="resultado-sel" value="">
        </div>
        <div class="field"><label>Observação</label><textarea class="input" id="descricao" rows="3" placeholder="O que foi discutido?"></textarea></div>
        <div class="field"><label>Próximo follow-up</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${[7,15,30].map(d => `<button class="type-btn" data-followup="${d}">+${d}d</button>`).join('')}
          </div>
          <input type="hidden" id="followup-sel" value="">
        </div>
        <button class="btn btn-primary btn-full" id="btn-salvar-inter">Salvar interação</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#close-m').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('[data-tipo]').forEach(btn =>
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('[data-tipo]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#tipo-sel').value = btn.dataset.tipo;
    }));

  overlay.querySelectorAll('[data-resultado]').forEach(btn =>
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('[data-resultado]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      overlay.querySelector('#resultado-sel').value = btn.dataset.resultado;
    }));

  overlay.querySelectorAll('[data-followup]').forEach(btn =>
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('[data-followup]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const d = new Date();
      d.setDate(d.getDate() + parseInt(btn.dataset.followup));
      overlay.querySelector('#followup-sel').value = d.toISOString();
    }));

  overlay.querySelector('#btn-salvar-inter').addEventListener('click', async () => {
    const tipo = overlay.querySelector('#tipo-sel').value;
    if (!tipo) return alert('Selecione o tipo de interação');
    const btn = overlay.querySelector('#btn-salvar-inter');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      await registrarInteracao({
        cliente_id: clienteId,
        tipo,
        resultado: overlay.querySelector('#resultado-sel').value || null,
        descricao: overlay.querySelector('#descricao').value.trim() || null,
        proximo_followup: overlay.querySelector('#followup-sel').value || null,
      });
      overlay.remove();
      // Recarrega a página do cliente
      window.location.hash = window.location.hash;
    } catch (err) {
      btn.disabled = false; btn.textContent = 'Salvar interação';
      alert('Erro: ' + err.message);
    }
  });
}
