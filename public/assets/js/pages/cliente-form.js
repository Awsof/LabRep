import { buscarCNPJ, criarCliente } from '../api.js';
import { escHtml } from '../utils.js';
import { go } from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <div style="margin-bottom:8px;"><a href="#/carteira" style="font-size:0.82rem;color:var(--muted);">← Carteira</a></div>
    <h1 style="font-size:clamp(1.4rem,3vw,2rem);margin-bottom:24px;">Novo Cliente</h1>
    <div style="max-width:600px;">
      <div class="stack">
        <div class="field">
          <label>CNPJ *</label>
          <div style="display:flex;gap:8px;">
            <input class="input" id="cnpj" placeholder="00.000.000/0000-00" maxlength="18" style="flex:1;">
            <button class="btn btn-ghost" id="btn-buscar">Buscar</button>
          </div>
          <span class="field-hint" id="cnpj-hint">Digite o CNPJ para preencher automaticamente</span>
        </div>
        <div class="field"><label>Razão Social *</label><input class="input" id="razao_social" placeholder="Nome empresarial completo"></div>
        <div class="field"><label>Nome Fantasia</label><input class="input" id="nome_fantasia" placeholder="Nome comercial (opcional)"></div>
        <div class="field"><label>Tipo *</label>
          <select class="input" id="tipo">
            <option value="clinica">Clínica</option>
            <option value="consultorio">Consultório</option>
            <option value="hospital">Hospital</option>
            <option value="lab_parceiro">Lab Parceiro</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="field"><label>Município</label><input class="input" id="municipio" placeholder="Cidade"></div>
          <div class="field"><label>UF</label><input class="input" id="uf" placeholder="SP" maxlength="2" style="text-transform:uppercase;"></div>
        </div>
        <div class="field"><label>WhatsApp</label><input class="input" id="whatsapp" placeholder="5511999999999" inputmode="tel"></div>
        <div class="field"><label>Email</label><input class="input" id="email" placeholder="contato@clinica.com.br" type="email"></div>
        <div class="field"><label>Contato (responsável)</label><input class="input" id="contato_nome" placeholder="Nome do responsável"></div>
        <div class="field"><label>Potencial mensal (R$)</label><input class="input" id="potencial_mensal" type="number" min="0" placeholder="Ex: 5000"></div>
        <button class="btn btn-primary btn-full" id="btn-salvar">Salvar cliente</button>
        <p id="erro" style="color:var(--accent);display:none;"></p>
      </div>
    </div>`;

  const maskCNPJ = v => v.replace(/\D/g,'').substring(0,14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

  container.querySelector('#cnpj').addEventListener('input', e => {
    e.target.value = maskCNPJ(e.target.value);
  });

  container.querySelector('#btn-buscar').addEventListener('click', async () => {
    const cnpj = container.querySelector('#cnpj').value.replace(/\D/g,'');
    if (cnpj.length !== 14) return;
    const btn = container.querySelector('#btn-buscar');
    const hint = container.querySelector('#cnpj-hint');
    btn.disabled = true; btn.textContent = 'Buscando...';
    try {
      const dados = await buscarCNPJ(cnpj);
      if (dados?.duplicate) {
        hint.textContent = '⚠️ Este CNPJ já está na sua carteira.';
        hint.style.color = 'var(--accent)';
      } else if (dados) {
        container.querySelector('#razao_social').value = dados.razao_social ?? '';
        container.querySelector('#nome_fantasia').value = dados.nome_fantasia ?? '';
        container.querySelector('#municipio').value = dados.municipio ?? '';
        container.querySelector('#uf').value = dados.uf ?? '';
        hint.textContent = '✅ Dados preenchidos automaticamente';
        hint.style.color = 'var(--green)';
      }
    } catch {
      hint.textContent = 'Não foi possível consultar o CNPJ. Preencha manualmente.';
    } finally {
      btn.disabled = false; btn.textContent = 'Buscar';
    }
  });

  container.querySelector('#btn-salvar').addEventListener('click', async () => {
    const razao = container.querySelector('#razao_social').value.trim();
    const cnpj = container.querySelector('#cnpj').value.replace(/\D/g,'');
    const erro = container.querySelector('#erro');
    if (!razao) { erro.textContent = 'Razão Social é obrigatória.'; erro.style.display='block'; return; }
    if (cnpj && cnpj.length !== 14) { erro.textContent = 'CNPJ inválido.'; erro.style.display='block'; return; }
    erro.style.display = 'none';
    const btn = container.querySelector('#btn-salvar');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      const cliente = await criarCliente({
        cnpj: cnpj || null,
        razao_social: razao,
        nome_fantasia: container.querySelector('#nome_fantasia').value.trim() || null,
        tipo: container.querySelector('#tipo').value,
        municipio: container.querySelector('#municipio').value.trim() || null,
        uf: container.querySelector('#uf').value.trim().toUpperCase() || null,
        whatsapp: container.querySelector('#whatsapp').value.replace(/\D/g,'') || null,
        email: container.querySelector('#email').value.trim() || null,
        contato_nome: container.querySelector('#contato_nome').value.trim() || null,
        potencial_mensal: parseFloat(container.querySelector('#potencial_mensal').value) || null,
      });
      go(`#/cliente/${cliente.id}`);
    } catch (err) {
      erro.textContent = 'Erro: ' + err.message;
      erro.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Salvar cliente';
    }
  });
}
