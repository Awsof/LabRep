/* LabRep API — fetch wrapper com JWT Clerk inject e retry automático */

import { getAuthToken, requireLogin } from './auth.js';

const BASE = '/api/v1';

async function apiFetch(path, options = {}) {
  const token = await getAuthToken();

  if (!token) {
    await requireLogin();
    return null;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    await requireLogin();
    return null;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    const err = new Error(body.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.code = body.code;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

/* ── Auth ── */
export const getMe = () => apiFetch('/auth/me');

/* ── Clientes ── */
export const listarClientes = (params = {}) =>
  apiFetch('/clientes?' + new URLSearchParams(params));

export const criarCliente = (dados) =>
  apiFetch('/clientes', { method: 'POST', body: JSON.stringify(dados) });

export const getCliente = (id) => apiFetch(`/clientes/${id}`);

export const getClienteCampo = (id) => apiFetch(`/clientes/${id}/campo`);

export const atualizarCliente = (id, dados) =>
  apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) });

export const buscarCNPJ = (cnpj) =>
  apiFetch(`/clientes/cnpj/${cnpj.replace(/\D/g, '')}`);

export const listarPostos = (matrizId) =>
  apiFetch(`/clientes/${matrizId}/postos`);

export const criarPosto = (matrizId, dados) =>
  apiFetch(`/clientes/${matrizId}/postos`, { method: 'POST', body: JSON.stringify(dados) });

/* ── Grupos ── */
export const listarGrupos = () => apiFetch('/grupos');

export const criarGrupo = (dados) =>
  apiFetch('/grupos', { method: 'POST', body: JSON.stringify(dados) });

export const getGrupo = (id) => apiFetch(`/grupos/${id}`);

export const atualizarMembros = (id, { add = [], remove = [] }) =>
  apiFetch(`/grupos/${id}/membros`, { method: 'PUT', body: JSON.stringify({ add, remove }) });

/* ── Interações ── */
export const listarInteracoes = (clienteId, params = {}) =>
  apiFetch(`/interacoes?cliente_id=${clienteId}&` + new URLSearchParams(params));

export const registrarInteracao = (dados) =>
  apiFetch('/interacoes', { method: 'POST', body: JSON.stringify(dados) });

/* ── Alertas ── */
export const listarAlertas = () => apiFetch('/alertas');

export const marcarAlertaLido = (id) =>
  apiFetch(`/alertas/${id}/lido`, { method: 'PATCH' });

/* ── Exportar ── */
export async function exportarCSV() {
  const token = await getAuthToken();
  const res = await fetch('/api/v1/exportar/csv', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Falha ao exportar');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `carteira-labrep-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
