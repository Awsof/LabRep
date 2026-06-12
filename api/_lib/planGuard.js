import { getDB } from './db.js';

const PLAN_LIMITS = {
  free: { maxMatrizes: 30, alertas: false, pipeline: false, relatorios: false },
  pro: { maxMatrizes: Infinity, alertas: true, pipeline: true, relatorios: false },
  pro_plus: { maxMatrizes: Infinity, alertas: true, pipeline: true, relatorios: true },
  b2b: { maxMatrizes: Infinity, alertas: true, pipeline: true, relatorios: true },
};

export async function checkClienteLimit(repId, plano) {
  if (plano !== 'free') return;

  const db = getDB();
  const result = await db.execute({
    sql: "SELECT COUNT(*) as total FROM clientes WHERE rep_id = ? AND tipo_unidade = 'matriz'",
    args: [repId],
  });

  if (result.rows[0].total >= PLAN_LIMITS.free.maxMatrizes) {
    const err = new Error('Limite de 30 clientes atingido no plano Free. Faça upgrade para Pro.');
    err.status = 403;
    err.code = 'PLAN_LIMIT';
    throw err;
  }
}

export function requireFeature(plano, feature) {
  const limits = PLAN_LIMITS[plano] ?? PLAN_LIMITS.free;
  if (!limits[feature]) {
    const err = new Error(`Funcionalidade "${feature}" não disponível no plano ${plano}.`);
    err.status = 403;
    err.code = 'PLAN_FEATURE';
    throw err;
  }
}
