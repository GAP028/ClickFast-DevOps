const request = require('supertest');
const { buildApp } = require('../src/app');
test('GET /health fonctionne sans base', async () => {
  await request(buildApp({ query: jest.fn() })).get('/health').expect(200, { status: 'ok' });
});
test('POST refuse un score malformé', async () => {
  await request(buildApp({ query: jest.fn() })).post('/api/scores').send({ username: '', score: -10 }).expect(400);
});
test('POST insère correctement un score', async () => {
  const pool = { query: jest.fn().mockResolvedValue({ rows: [{ id: 1, username: 'Axel', score: 9 }] }) };
  await request(buildApp(pool)).post('/api/scores').send({ username: 'Axel', score: 9 }).expect(201);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), ['Axel', 9]);
});
test('panne PostgreSQL produit une erreur HTTP 503', async () => {
  const pool = { query: jest.fn().mockRejectedValue(new Error('offline')) };
  await request(buildApp(pool)).get('/api/scores').expect(503);
});
