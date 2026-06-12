import { requireAuth, handleAuthError } from '../../_lib/auth.js';
import { getDB } from '../../_lib/db.js';

export default async function handler(req, res) {
  try {
    const { repId } = await requireAuth(req);
    const { id } = req.query;
    const db = getDB();

    if (req.method === 'GET') {
      const [grupoRes, membrosRes] = await Promise.all([
        db.execute({
          sql: 'SELECT * FROM grupos WHERE id = ? AND rep_id = ?',
          args: [id, repId],
        }),
        db.execute({
          sql: `SELECT c.id, c.cnpj, c.razao_social, c.nome_fantasia, c.tipo, c.status,
                       c.municipio, c.uf, c.tipo_unidade, c.potencial_mensal,
                       CAST(julianday('now') - julianday(c.ultima_interacao_em) AS INTEGER) as dias_sem_contato
                FROM clientes c
                WHERE c.grupo_id = ? AND c.rep_id = ?
                ORDER BY c.razao_social`,
          args: [id, repId],
        }),
      ]);

      if (!grupoRes.rows.length) return res.status(404).json({ error: 'Grupo não encontrado' });

      return res.status(200).json({ ...grupoRes.rows[0], clientes: membrosRes.rows });
    }

    if (req.method === 'PUT') {
      const row = (await db.execute({
        sql: 'SELECT id FROM grupos WHERE id = ? AND rep_id = ?',
        args: [id, repId],
      })).rows[0];
      if (!row) return res.status(404).json({ error: 'Grupo não encontrado' });

      const { add = [], remove = [] } = req.body ?? {};
      const ops = [
        ...add.map(cId => ({
          sql: 'UPDATE clientes SET grupo_id = ? WHERE id = ? AND rep_id = ?',
          args: [id, cId, repId],
        })),
        ...remove.map(cId => ({
          sql: 'UPDATE clientes SET grupo_id = NULL WHERE id = ? AND rep_id = ? AND grupo_id = ?',
          args: [cId, repId, id],
        })),
      ];
      if (ops.length) await db.batch(ops);
      return res.status(200).json({ updated: ops.length });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}
