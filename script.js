// Jeu indépendant de l'API : même si PostgreSQL est arrêté, on peut cliquer.
const DURATION = 5000;
function createGame(doc, deps = {}) {
  const scoreBox = doc.getElementById('score');
  const timerBox = doc.getElementById('timer');
  const clickButton = doc.getElementById('button-clicker');
  const resetButton = doc.getElementById('button-reset');
  const form = doc.getElementById('score-form');
  const message = doc.getElementById('message');
  const leaderboard = doc.getElementById('leaderboard');
  const apiStatus = doc.getElementById('api-status');
  const now = deps.now || Date.now;
  const timerStart = deps.setInterval || setInterval;
  const timerStop = deps.clearInterval || clearInterval;
  const request = deps.fetch || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  let score = 0, startedAt = null, interval = null, ended = false;

  function tick() {
    if (startedAt === null || ended) return;
    const left = Math.max(0, DURATION - (now() - startedAt));
    timerBox.textContent = (left / 1000).toFixed(1);
    if (left === 0) {
      ended = true;
      timerStop(interval);
      interval = null;
      clickButton.disabled = true;
      message.textContent = `Partie terminée ! Score : ${score}`;
      form.hidden = false;
    }
  }
  function click() {
    if (ended) return;
    if (startedAt === null) {
      startedAt = now();
      interval = timerStart(tick, 50);
      message.textContent = 'Clique vite !';
    }
    tick(); // Vérifier le temps AVANT d'ajouter un point.
    if (!ended) scoreBox.textContent = String(++score);
  }
  function reset() {
    if (interval !== null) timerStop(interval);
    score = 0; startedAt = null; interval = null; ended = false;
    scoreBox.textContent = '0'; timerBox.textContent = '5.0';
    clickButton.disabled = false; form.hidden = true;
    message.textContent = 'Prêt pour le défi ?';
  }
  async function loadScores() {
    if (!request) return;
    try {
      const response = await request('/api/scores');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const scores = await response.json();
      leaderboard.replaceChildren();
      for (const entry of scores) {
        const li = doc.createElement('li');
        li.textContent = `${entry.username} : ${entry.score}`; // Empêche l'injection HTML.
        leaderboard.appendChild(li);
      }
      apiStatus.textContent = '';
    } catch (_) { apiStatus.textContent = 'Classement indisponible, le jeu reste jouable.'; }
  }
  async function submitScore(event) {
    event.preventDefault();
    if (!ended || !request) return;
    const username = doc.getElementById('username').value.trim();
    try {
      const response = await request('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, score })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      form.hidden = true;
      await loadScores();
    } catch (_) { apiStatus.textContent = 'Enregistrement impossible. Réessaie plus tard.'; }
  }
  clickButton.addEventListener('click', click);
  resetButton.addEventListener('click', reset);
  form.addEventListener('submit', submitScore);
  void loadScores();
  return { click, tick, reset, getScore: () => score, isFinished: () => ended };
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => createGame(document));
if (typeof module !== 'undefined') module.exports = { createGame };
