import { requireAuth, handleAuthError } from '../../_lib/auth.js';
import { getDB } from '../../_lib/db.js';
import { sanitize, generateId } from '../../_lib/validate.js';

export default async function handler(req, res) {
  try {
    const { repId } = await requireAuth(req);
    const db = getDB();

    if (req.method === 'GET') {
      const { cliente_id, limit = '20', offset = '0' } = req.query ?? {};
      if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });

      const result = await db.execute({
        sql: `SELECT * FROM interacoes
              WHERE cliente_id = ? AND rep_id = ? AND arquivada = 0
              ORDER BY realizada_em DESC
              LIMIT ? OFFSET ?`,
        args: [cliente_id, repId, parseInt(limit), parseInt(offset)],
      });
      return res.status(200).json({ data: result.rows });
    }

    if (req.method === 'POST') {
      const { cliente_id, tipo, descricao, resultado, proximo_followup, realizada_em } = req.body ?? {};
      if (!cliente_id || !tipo) return res.status(400).json({ error: 'cliente_id e tipo são obrigatórios' });

      const id = generateId();
      const agora = realizada_em ?? new Date().toISOString();

      await db.batch([
        {
          sql: `INSERT INTO interacoes (id, rep_id, cliente_id, tipo, descricao, resultado, proximo_followup, realizada_em)
                VALUES (?,?,?,?,?,?,?,?)`,
          args: [id, repId, cliente_id, tipo,
                 descricao ? sanitize(descricao) : null,
                 resultado ?? null, proximo_followup ?? null, agora],
        },
        {
          sql: `UPDATE clientes SET ultima_interacao_em = ? WHERE id = ? AND rep_id = ?`,
          args: [agora, cliente_id, repId],
        },
      ]);

      return res.status(201).json({ id });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}
