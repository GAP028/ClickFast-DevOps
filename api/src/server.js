const { Pool } = require('pg');
const { buildApp } = require('./app');
const required = ['DB_HOST', 'DB_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Variable obligatoire manquante : ${key}`);
}
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  connectionTimeoutMillis: 2000
});
const port = Number(process.env.API_PORT || 3000);
// Création idempotente : fonctionne même avec compose.prod.yml sans fichier SQL local.
async function start() {
  await pool.query(`CREATE TABLE IF NOT EXISTS scores (
    id BIGSERIAL PRIMARY KEY, username VARCHAR(30) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  buildApp(pool).listen(port, '0.0.0.0', () => console.log(`Score API : ${port}`));
}
start().catch((error) => { console.error('Démarrage API impossible :', error.message); process.exit(1); });
