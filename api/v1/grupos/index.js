import { requireAuth, handleAuthError } from '../../_lib/auth.js';
import { getDB } from '../../_lib/db.js';
import { sanitize, generateId } from '../../_lib/validate.js';

export default async function handler(req, res) {
  try {
    const { repId } = await requireAuth(req);
    const db = getDB();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: `SELECT g.id, g.nome, g.tipo, g.descricao, g.contato_nome, g.whatsapp,
                     COUNT(c.id) as total_unidades,
                     SUM(c.potencial_mensal) as potencial_total_mensal,
                     MAX(c.ultima_interacao_em) as ultima_interacao_rede
              FROM grupos g
              LEFT JOIN clientes c ON c.grupo_id = g.id AND c.rep_id = g.rep_id
              WHERE g.rep_id = ?
              GROUP BY g.id
              ORDER BY g.nome`,
        args: [repId],
      });
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const { nome, tipo, descricao, contato_nome, whatsapp, email } = req.body ?? {};
      if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' });
      if (!tipo)         return res.status(400).json({ error: 'tipo é obrigatório' });

      const id = generateId();
      await db.execute({
        sql: `INSERT INTO grupos (id, rep_id, nome, tipo, descricao, contato_nome, whatsapp, email)
              VALUES (?,?,?,?,?,?,?,?)`,
        args: [id, repId, sanitize(nome.trim()), tipo,
               descricao ? sanitize(descricao) : null,
               contato_nome ? sanitize(contato_nome) : null,
               whatsapp ? String(whatsapp).replace(/\D/g,'') : null,
               email ?? null],
      });

      return res.status(201).json({ id, nome: nome.trim() });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}
