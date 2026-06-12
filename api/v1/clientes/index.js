import { requireAuth, handleAuthError } from '../../_lib/auth.js';
import { getDB } from '../../_lib/db.js';
import { validateCNPJ, sanitize, generateId } from '../../_lib/validate.js';
import { checkClienteLimit } from '../../_lib/planGuard.js';

export default async function handler(req, res) {
  try {
    const { repId, plano } = await requireAuth(req);
    const db = getDB();

    if (req.method === 'GET') return await listar(req, res, db, repId);
    if (req.method === 'POST') return await criar(req, res, db, repId, plano);
    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    handleAuthError(res, err);
  }
}

async function listar(req, res, db, repId) {
  const { q, status, tipo, grupo_id, limit = '20', offset = '0' } = req.query ?? {};
  const lim = Math.min(parseInt(limit) || 20, 100);
  const off = parseInt(offset) || 0;

  let where = 'c.rep_id = ?';
  const args = [repId];

  if (status) { where += ' AND c.status = ?'; args.push(status); }
  if (tipo)   { where += ' AND c.tipo = ?';   args.push(tipo); }
  if (grupo_id) { where += ' AND c.grupo_id = ?'; args.push(grupo_id); }

  if (q) {
    const term = `%${q}%`;
    where += ' AND (c.razao_social LIKE ? OR c.nome_fantasia LIKE ? OR c.cnpj LIKE ?)';
    args.push(term, term, term);
  }

  const sql = `
    SELECT c.id, c.cnpj, c.razao_social, c.nome_fantasia, c.tipo, c.status,
           c.municipio, c.uf, c.whatsapp, c.ultima_interacao_em,
           c.tipo_unidade, c.matriz_id, c.potencial_mensal,
           g.nome as grupo_nome,
           CAST(julianday('now') - julianday(c.ultima_interacao_em) AS INTEGER) as dias_sem_contato
    FROM clientes c
    LEFT JOIN grupos g ON g.id = c.grupo_id
    WHERE ${where}
    ORDER BY c.ultima_interacao_em ASC NULLS LAST
    LIMIT ? OFFSET ?`;

  const [rows, countRow] = await Promise.all([
    db.execute({ sql, args: [...args, lim, off] }),
    db.execute({ sql: `SELECT COUNT(*) as total FROM clientes c WHERE ${where}`, args }),
  ]);

  res.status(200).json({ data: rows.rows, total: countRow.rows[0].total, limit: lim, offset: off });
}

async function criar(req, res, db, repId, plano) {
  const body = req.body ?? {};
  const { cnpj, razao_social, nome_fantasia, tipo, status = 'ativo',
          municipio, uf, cep, logradouro, whatsapp, email, contato_nome,
          potencial_mensal, apoio_atual_id, grupo_id, matriz_id,
          tipo_unidade = 'matriz', cnpj_proprio = 1, tags } = body;

  if (!razao_social?.trim()) return res.status(400).json({ error: 'razao_social é obrigatória' });

  if (cnpj && cnpj_proprio) {
    const digits = String(cnpj).replace(/\D/g, '');
    if (!validateCNPJ(digits)) return res.status(400).json({ error: 'CNPJ inválido' });
  }

  if (tipo_unidade === 'matriz') await checkClienteLimit(repId, plano);

  const id = generateId();
  const cnpjClean = cnpj ? String(cnpj).replace(/\D/g, '') : null;

  await db.execute({
    sql: `INSERT INTO clientes
          (id, rep_id, tipo_unidade, matriz_id, grupo_id, cnpj, cnpj_proprio,
           razao_social, nome_fantasia, tipo, status, municipio, uf, cep, logradouro,
           whatsapp, email, contato_nome, potencial_mensal, apoio_atual_id, tags)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, repId, tipo_unidade, matriz_id ?? null, grupo_id ?? null,
           cnpjClean, cnpj_proprio ? 1 : 0,
           sanitize(razao_social.trim()), nome_fantasia ? sanitize(nome_fantasia.trim()) : null,
           tipo ?? 'outros', status,
           municipio ? sanitize(municipio) : null, uf ? sanitize(uf).toUpperCase() : null,
           cep ?? null, logradouro ? sanitize(logradouro) : null,
           whatsapp ? String(whatsapp).replace(/\D/g,'') : null,
           email ?? null, contato_nome ? sanitize(contato_nome) : null,
           potencial_mensal ? parseFloat(potencial_mensal) : null,
           apoio_atual_id ?? null, JSON.stringify(tags ?? [])],
  });

  res.status(201).json({ id, razao_social: razao_social.trim() });
}
