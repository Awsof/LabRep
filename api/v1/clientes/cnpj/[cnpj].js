import { requireAuth, handleAuthError } from '../../../lib/auth.js';
import { getDB } from '../../../lib/db.js';
import { validateCNPJ } from '../../../lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { repId } = await requireAuth(req);
    const cnpj = String(req.query.cnpj ?? '').replace(/\D/g, '');

    if (!validateCNPJ(cnpj)) return res.status(400).json({ error: 'CNPJ inválido' });

    const db = getDB();
    const dup = await db.execute({
      sql: 'SELECT id FROM clientes WHERE rep_id = ? AND cnpj = ? AND matriz_id IS NULL',
      args: [repId, cnpj],
    });

    if (dup.rows.length) return res.status(200).json({ duplicate: true, clienteId: dup.rows[0].id });

    // Proxy BrasilAPI — fetch nativo (Node.js 20+)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeout);

      if (!r.ok) return res.status(200).json({ brasilapi_error: true });

      const d = await r.json();
      return res.status(200).json({
        cnpj,
        razao_social:  d.razao_social  ?? '',
        nome_fantasia: d.nome_fantasia ?? '',
        cnae_principal: d.cnae_fiscal_principal?.codigo ?? '',
        municipio: d.municipio ?? '',
        uf:        d.uf ?? '',
        cep:       d.cep ?? '',
        logradouro: [d.descricao_tipo_de_logradouro, d.logradouro, d.numero]
                    .filter(Boolean).join(' ') || '',
      });
    } catch {
      clearTimeout(timeout);
      return res.status(200).json({ brasilapi_error: true });
    }
  } catch (err) {
    handleAuthError(res, err);
  }
}
