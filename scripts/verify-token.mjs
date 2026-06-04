import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const r = await db.execute("SELECT COUNT(*) as total FROM sqlite_master WHERE type='table'");
console.log('Conexão OK — tabelas no banco:', r.rows[0].total);
