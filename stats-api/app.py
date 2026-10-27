import os
from flask import Flask, jsonify
import psycopg2

app = Flask(__name__)
REQUIRED = ('DB_HOST', 'DB_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD')
for key in REQUIRED:
    if not os.getenv(key):
        raise RuntimeError(f'Variable obligatoire manquante : {key}')


@app.get('/stats')
def stats():
    try:
        with psycopg2.connect(
            host=os.environ['DB_HOST'], port=os.environ['DB_PORT'],
            dbname=os.environ['POSTGRES_DB'], user=os.environ['POSTGRES_USER'],
            password=os.environ['POSTGRES_PASSWORD'], connect_timeout=2
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute('SELECT COALESCE(MAX(score), 0), COUNT(*), COUNT(DISTINCT username) FROM scores')
                best, games, players = cursor.fetchone()
        return jsonify(best_score=best, games_played=games, unique_players=players)
    except psycopg2.Error:
        return jsonify(error='Base de données indisponible'), 503


@app.get('/health')
def health():
    return jsonify(status='ok')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
