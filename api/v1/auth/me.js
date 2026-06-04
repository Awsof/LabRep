import { requireAuth, handleAuthError } from '../../lib/auth.js';
import { getDB } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { repId, plano } = await requireAuth(req);

    const db = getDB();
    const result = await db.execute({
      sql: `SELECT u.id, u.email, u.nome, u.plano, u.plano_expira_em,
                   u.apoio_id, u.alerta_dias_sem_contato,
                   a.nome as apoio_nome
            FROM users u
            LEFT JOIN apoios a ON a.id = u.apoio_id
            WHERE u.id = ?`,
      args: [repId],
    });

    const user = result.rows[0];
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
