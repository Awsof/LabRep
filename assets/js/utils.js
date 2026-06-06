/* Utilitários compartilhados entre páginas */

export function escHtml(str) {
  return String(str ?? '').replace(/[<>"'&]/g, c =>
    ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#x27;', '&':'&amp;' })[c]);
}

export function formatCNPJ(cnpj) {
  if (!cnpj) return '—';
  const d = String(cnpj).replace(/\D/g, '');
  return d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : cnpj;
}

export function diasClass(dias) {
  if (dias == null) return '';
  if (dias <= 7)  return 'ok';
  if (dias <= 15) return 'alerta';
  return 'critico';
}

export function diasLabel(dias) {
  if (dias == null) return '—';
  if (dias === 0) return 'hoje';
  return `${dias}d`;
}

export function tipoLabel(tipo) {
  return {
    clinica: 'Clínica', consultorio: 'Consultório', hospital: 'Hospital',
    lab_parceiro: 'Lab Parceiro', posto_coleta: 'Posto Coleta', outros: 'Outros'
  }[tipo] ?? tipo;
}

export function statusLabel(status) {
  return {
    ativo: 'Ativo', inativo: 'Inativo',
    prospecto: 'Prospecto', em_negociacao: 'Em negociação'
  }[status] ?? status;
}
