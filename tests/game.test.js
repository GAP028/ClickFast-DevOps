const { createGame } = require('../script');
let clock;
let game;
beforeEach(() => {
  document.body.innerHTML = `<strong id="score">0</strong><strong id="timer">5.0</strong>
    <button id="button-clicker"></button><button id="button-reset"></button>
    <p id="message"></p><form id="score-form" hidden><input id="username" /></form>
    <ol id="leaderboard"></ol><p id="api-status"></p>`;
  clock = 0;
  game = createGame(document, {
    now: () => clock, setInterval: () => 1, clearInterval: () => {},
    fetch: async () => ({ ok: true, json: async () => [] })
  });
});
test('un clic ajoute un point', () => {
  document.getElementById('button-clicker').click();
  document.getElementById('button-clicker').click();
  expect(game.getScore()).toBe(2);
});
test('après 5 secondes, les clics ne comptent plus', () => {
  game.click(); clock = 5000; game.tick(); game.click();
  expect(game.getScore()).toBe(1);
  expect(game.isFinished()).toBe(true);
  expect(document.getElementById('button-clicker').disabled).toBe(true);
});
test('rejouer remet les compteurs à zéro', () => {
  game.click(); game.reset();
  expect(game.getScore()).toBe(0);
  expect(document.getElementById('timer').textContent).toBe('5.0');
});
