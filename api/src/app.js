const express = require('express');

function buildApp(pool) {
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/scores', async (_req, res) => {
    try {
      const result = await pool.query('SELECT username, score FROM scores ORDER BY score DESC, id ASC LIMIT 10');
      res.json(result.rows);
    } catch (error) {
      console.error('Database unavailable:', error.message);
      res.status(503).json({ error: 'Base de données indisponible' });
    }
  });
  app.post('/api/scores', async (req, res) => {
    const { username, score } = req.body || {};
    if (typeof username !== 'string' || !username.trim() || username.trim().length > 30 ||
        !Number.isInteger(score) || score < 0 || score > 10000) {
      return res.status(400).json({ error: 'Pseudo (1-30 caractères) et score entier (0-10000) requis' });
    }
    try {
      const result = await pool.query(
        'INSERT INTO scores (username, score) VALUES ($1, $2) RETURNING id, username, score',
        [username.trim(), score] // Requête paramétrée contre l'injection SQL.
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Database unavailable:', error.message);
      res.status(503).json({ error: 'Base de données indisponible' });
    }
  });
  return app;
}
module.exports = { buildApp };
