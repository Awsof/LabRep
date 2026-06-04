import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Credenciais via variáveis de ambiente — nunca hardcoded (RN-02 / Sentinela)
// Execute com: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node scripts/migrate.mjs
// Ou com: npx dotenv-cli -e .env node scripts/migrate.mjs
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('ERRO: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN são obrigatórios.');
  console.error('Use: npx dotenv-cli -e .env node scripts/migrate.mjs');
  process.exit(1);
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const sql = readFileSync(join(__dir, '..', 'migrations', '001_initial.sql'), 'utf8');

// Remove PRAGMAs incompatíveis com libSQL/TursoDB (WAL é gerenciado pelo servidor)
const cleanSql = sql
  .replace(/PRAGMA journal_mode\s*=\s*WAL\s*;/gi, '')
  .replace(/PRAGMA foreign_keys\s*=\s*ON\s*;/gi, '');

console.log(`Iniciando migração em ${process.env.TURSO_DATABASE_URL}...\n`);

try {
  // executeMultiple envia o SQL completo em uma única requisição — lida com multi-line corretamente
  await db.executeMultiple(cleanSql);
  console.log('✓ Migração concluída com sucesso.');
} catch (err) {
  console.error('✗ ERRO na migração:', err.message);
  process.exit(1);
}

// Verifica tabelas criadas
const tables = await db.execute(
  "SELECT name FROM sqlite_master WHERE type IN ('table','view','index') ORDER BY name"
);
console.log(`\nObjetos no banco (${tables.rows.length}):`);
tables.rows.forEach(r => console.log(' -', r.name));
