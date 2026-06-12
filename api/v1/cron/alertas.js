import { getDB } from '../../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const db = getDB();
    const result = await db.execute(`
      SELECT u.id as rep_id, u.alerta_dias_sem_contato,
             c.id as cliente_id, c.razao_social, c.ultima_interacao_em
      FROM users u
      JOIN clientes c ON c.rep_id = u.id AND c.status = 'ativo'
      WHERE CAST(julianday('now') - julianday(c.ultima_interacao_em) AS INTEGER)
            >= u.alerta_dias_sem_contato
        AND NOT EXISTS (
          SELECT 1 FROM alertas a
          WHERE a.cliente_id = c.id AND a.rep_id = u.id
            AND a.lido = 0 AND a.tipo = 'sem_contato'
        )`);
    let inserted = 0;
    for (const row of result.rows) {
      const dias = Math.round((Date.now() - new Date(row.ultima_interacao_em)) / 86400000);
      await db.execute({
        sql: `INSERT OR IGNORE INTO alertas (id, rep_id, cliente_id, tipo, mensagem, dispara_em)
              VALUES (?, ?, ?, 'sem_contato', ?, datetime('now'))`,
        args: [
          `${row.rep_id}-${row.cliente_id}-sc`,
          row.rep_id,
          row.cliente_id,
          `${row.razao_social} — ${dias} dias sem contato`,
        ],
      });
      inserted++;
    }
    res.status(200).json({ ok: true, alertas_gerados: inserted });
  } catch (err) {
    console.error('[cron/alertas]', err?.message);
    res.status(500).json({ error: 'Erro no cron' });
  }
}
