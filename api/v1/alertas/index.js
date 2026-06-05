import { requireAuth, handleAuthError } from '../../lib/auth.js';
import { getDB } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    const { repId } = await requireAuth(req);
    const db = getDB();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `SELECT a.*, c.razao_social, c.nome_fantasia
              FROM alertas a
              LEFT JOIN clientes c ON c.id = a.cliente_id
              WHERE a.rep_id = ? AND a.lido = 0
              ORDER BY a.dispara_em ASC
              LIMIT 50`,
        args: [repId],
      });
      return res.status(200).json(result.rows);
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}
