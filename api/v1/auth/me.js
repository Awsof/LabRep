import { createClerkClient } from '@clerk/backend';
import { verifyTokenOnly, handleAuthError } from '../../lib/auth.js';
import { getDB } from '../../lib/db.js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const repId = await verifyTokenOnly(req);
    const db = getDB();

    const q = `SELECT u.id, u.email, u.nome, u.plano, u.plano_expira_em,
                      u.apoio_id, u.alerta_dias_sem_contato, a.nome as apoio_nome
               FROM users u LEFT JOIN apoios a ON a.id = u.apoio_id
               WHERE u.id = ?`;

    let user = (await db.execute({ sql: q, args: [repId] })).rows[0];

    // Primeiro login via Clerk: auto-registro na tabela users
    if (!user) {
      const clerkUser = await clerk.users.getUser(repId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
      const nome = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email;

      await db.execute({
        sql: 'INSERT INTO users (id, email, nome, plano) VALUES (?, ?, ?, ?)',
        args: [repId, email, nome, 'free'],
      });

      user = { id: repId, email, nome, plano: 'free', plano_expira_em: null,
               apoio_id: null, apoio_nome: null, alerta_dias_sem_contato: 30 };
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      nome: user.nome,
      plano: user.plano,
      plano_expira_em: user.plano_expira_em,
      apoio: user.apoio_id ? { id: user.apoio_id, nome: user.apoio_nome } : null,
      alerta_dias_sem_contato: user.alerta_dias_sem_contato,
    });
  } catch (err) {
    handleAuthError(res, err);
  }
}
