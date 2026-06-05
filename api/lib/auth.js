import { createClerkClient } from '@clerk/backend';
import { getDB } from './db.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function requireAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    const err = new Error('Token ausente');
    err.status = 401;
    throw err;
  }

  let repId;
  try {
    const payload = await clerk.verifyToken(token);
    repId = payload.sub;
  } catch {
    const err = new Error('Token inválido');
    err.status = 401;
    throw err;
  }

  const db = getDB();
  const result = await db.execute({
    sql: 'SELECT id, plano, plano_expira_em FROM users WHERE id = ?',
    args: [repId],
  });

  if (!result.rows.length) {
    const err = new Error('Usuário não encontrado');
    err.status = 403;
    throw err;
  }

  return { repId, plano: result.rows[0].plano };
}

export async function verifyTokenOnly(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    const err = new Error('Token ausente');
    err.status = 401;
    throw err;
  }
  try {
    const payload = await clerk.verifyToken(token);
    return payload.sub;
  } catch {
    const err = new Error('Token inválido');
    err.status = 401;
    throw err;
  }
}

export function handleAuthError(res, err) {
  const status = err.status ?? 500;
  const message = status < 500 ? err.message : 'Erro interno do servidor';
  res.status(status).json({ error: message });
}
