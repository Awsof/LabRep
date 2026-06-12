import { requireAuth, handleAuthError } from '../../_lib/auth.js';
import { getDB } from '../../_lib/db.js';
import { sanitize } from '../../_lib/validate.js';

export default async function handler(req, res) {
  try {
    const { repId } = await requireAuth(req);
    const { id } = req.query;
    const db = getDB();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `SELECT c.*,
                     m.razao_social as matriz_nome,
                     g.nome         as grupo_nome,
                     g.tipo         as grupo_tipo,
                     a.nome         as apoio_nome,
                     CAST(julianday('now') - julianday(c.ultima_interacao_em) AS INTEGER) as dias_sem_contato
              FROM clientes c
              LEFT JOIN clientes m ON m.id = c.matriz_id
              LEFT JOIN grupos   g ON g.id = c.grupo_id
              LEFT JOIN apoios   a ON a.id = c.apoio_atual_id
              WHERE c.id = ? AND c.rep_id = ?`,
        args: [id, repId],
      });

      if (!result.rows.length) return res.status(404).json({ error: 'Cliente não encontrado' });
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const row = (await db.execute({
        sql: 'SELECT id FROM clientes WHERE id = ? AND rep_id = ?',
        args: [id, repId],
      })).rows[0];

      if (!row) return res.status(404).json({ error: 'Cliente não encontrado' });

      const b = req.body ?? {};
      await db.execute({
        sql: `UPDATE clientes SET
                razao_social = COALESCE(?, razao_social),
                nome_fantasia = COALESCE(?, nome_fantasia),
                tipo = COALESCE(?, tipo),
                status = COALESCE(?, status),
                municipio = COALESCE(?, municipio),
                uf = COALESCE(?, uf),
                whatsapp = COALESCE(?, whatsapp),
                email = COALESCE(?, email),
                contato_nome = COALESCE(?, contato_nome),
                potencial_mensal = COALESCE(?, potencial_mensal),
                apoio_atual_id = COALESCE(?, apoio_atual_id),
                grupo_id = COALESCE(?, grupo_id)
              WHERE id = ? AND rep_id = ?`,
        args: [
          b.razao_social  ? sanitize(b.razao_social)  : null,
          b.nome_fantasia ? sanitize(b.nome_fantasia) : null,
          b.tipo ?? null, b.status ?? null,
          b.municipio ? sanitize(b.municipio) : null,
          b.uf        ? sanitize(b.uf).toUpperCase() : null,
          b.whatsapp  ? String(b.whatsapp).replace(/\D/g,'') : null,
          b.email ?? null,
          b.contato_nome ? sanitize(b.contato_nome) : null,
          b.potencial_mensal != null ? parseFloat(b.potencial_mensal) : null,
          b.apoio_atual_id ?? null,
          b.grupo_id ?? null,
          id, repId,
        ],
      });

      return res.status(200).json({ id, updated: true });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}
