import { requireAuth, handleAuthError } from '../../../../lib/auth.js';
import { getDB } from '../../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { repId } = await requireAuth(req);
    const { id } = req.query;
    const db = getDB();

    const result = await db.execute({
      sql: 'UPDATE alertas SET lido = 1 WHERE id = ? AND rep_id = ?',
      args: [id, repId],
    });

    if (!result.rowsAffected) return res.status(404).json({ error: 'Alerta não encontrado' });
    return res.status(200).json({ updated: true });
  } catch (err) {
    handleAuthError(res, err);
  }
}
