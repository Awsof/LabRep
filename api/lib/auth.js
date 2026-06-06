import { createClerkClient, verifyToken } from '@clerk/backend';
import { getDB } from './db.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function _verifyJWT(token) {
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.sub;
  } catch (e) {
    console.error('[auth] verifyToken failed:', e?.message ?? e);
    const err = new Error('Token inválido');
    err.status = 401;
    throw err;
  }
}

export async function requireAuth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    const err = new Error('Token ausente');
    err.status = 401;
    throw err;
  }

  const repId = await _verifyJWT(token);

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
  return _verifyJWT(token);
}

export function handleAuthError(res, err) {
  const status = err.status ?? 500;
  const message = status < 500 ? err.message : 'Erro interno do servidor';
  res.status(status).json({ error: message });
}
