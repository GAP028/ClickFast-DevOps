# ClickFast — explication pas à pas du travail demandé

Ce guide accompagne le code. Il suit `partie_1_projet.pdf`, puis le **premier livrable** de la page 107 du PDF de la partie 2 (pipeline verte). Les paliers avancés de sécurité et de publication automatique ne font pas partie de cette première pipeline.

## Étape 1 — Terminer le jeu

**But :** avoir un jeu fonctionnel avant de parler de Docker.

- `index.html` définit les boutons, le chrono, le score, le champ pseudo et le classement.
- `style.css` donne la mise en forme, sans modifier les règles du jeu.
- `script.js` contient `createGame`, qui relie boutons et affichage avec `addEventListener`.
- Au **premier clic**, `startedAt` mémorise l'heure et lance un intervalle qui actualise le temps.
- `tick` calcule la durée restante à partir du temps réel, pas en soustrayant naïvement 50 ms : cela résiste mieux aux ralentissements du navigateur.
- Lorsque les 5 secondes sont écoulées, on désactive le bouton et on propose l'enregistrement.
- `reset` remet tout à zéro pour une nouvelle partie.

**À faire :** ouvrir `index.html`, cliquer et vérifier que le compteur ne progresse plus après 5 s. Avant l'API, le classement peut signaler une indisponibilité : ce n'est pas un échec du jeu.

## Étape 2 — Servir le jeu avec Nginx dans Docker

**Pourquoi :** ouvrir un fichier HTML sur son PC n'est pas la même chose que fournir un vrai site par un serveur HTTP.

Le `Dockerfile` part de `nginxinc/nginx-unprivileged:1.27.5-alpine` : version fixe, image légère et utilisateur non-root. Le `COPY` ne place dans `/usr/share/nginx/html` que les trois fichiers du jeu. `nginx.conf` écoute sur le port 8080 interne ; un utilisateur non-root ne peut pas toujours ouvrir directement le port 80.

```bash
docker build -t clickfast-web:1.0 .
docker run -d --name clickfast-seul -p 8080:8080 clickfast-web:1.0
docker run --rm clickfast-web:1.0 whoami
docker run --rm clickfast-web:1.0 ls -a /usr/share/nginx/html
docker images
docker logs clickfast-seul
docker rm -f clickfast-seul
```

Le jeu s'affiche sur http://localhost:8080. Le classement ne fonctionne pas encore sans API. **Pourquoi `-p 8080:8080` et pas `-p 8080:80` ?** Parce que notre Nginx non-root écoute sur 8080 *dans* le conteneur. `EXPOSE` documente le port mais ne publie rien tout seul : `-p` effectue cette publication.

## Étape 3 — Scores : Express et PostgreSQL

**Pourquoi :** une variable JavaScript dans le navigateur disparaît à la fermeture de l'onglet. Il faut stocker les scores durablement.

- `api/src/app.js` définit les routes `GET /api/scores` et `POST /api/scores`.
- `POST` vérifie que le pseudo est non vide et que le score est un entier positif raisonnable.
- `INSERT ... VALUES ($1, $2)` utilise des paramètres plutôt que d'assembler une requête SQL dangereuse.
- `db/init.sql` crée la table `scores` ; le serveur Node peut également créer la table au démarrage pour le redéploiement sans sources.
- PostgreSQL utilise le volume nommé `pgdata` : supprimer le conteneur ne supprime pas le volume.
- En cas de panne de la base, Express renvoie HTTP 503 au lieu de planter.

```bash
docker compose up -d --build
curl http://localhost:8080/api/scores
curl -X POST http://localhost:8080/api/scores -H 'Content-Type: application/json' -d '{"username":"Axel","score":22}'
curl http://localhost:8080/api/scores
```

**Test de persistance :** jouer une partie, faire `docker compose stop db` puis `docker compose start db`, et recharger le classement. Les données doivent rester. Un volume survit aussi à une recréation normale du conteneur. Ne surtout pas faire `down -v` pour ce test de conservation.

## Étape 4 — Réseau Docker privé

**Pourquoi :** une adresse IP de conteneur peut changer. Sur le réseau `private` de Compose, l'API utilise directement `DB_HOST=db` pour joindre PostgreSQL.

```bash
docker network ls
docker compose ps
docker compose exec api getent hosts db
nc -zv localhost 5432
```

Le `getent` doit résoudre le nom `db`. Le `nc` depuis ton PC doit échouer, car `compose.yml` ne contient pas de `ports:` pour PostgreSQL. Cela réduit la surface exposée à l'extérieur.

## Étape 5 — Configuration hors du code

**Pourquoi :** un mot de passe dans le dépôt public serait accessible à tout le monde.

Copier `.env.example` en `.env` puis choisir un vrai `POSTGRES_PASSWORD`. Le `.gitignore` exclut `.env`. Compose exige les valeurs via `${POSTGRES_PASSWORD:?required}` ; l'API vérifie aussi les variables obligatoires au démarrage. Le navigateur fait ses requêtes sur `/api` : Nginx les transmet au service `api`, évitant d'inscrire une adresse de serveur interne dans le JavaScript.

```bash
git status --short
docker compose config
```

Vérifie avant tout commit que `.env` ne figure pas dans `git status`. Ne partage jamais sa valeur.

## Étape 6 — Une seule commande pour toute la stack

**Pourquoi :** lancer cinq conteneurs avec cinq longues commandes `docker run` devient difficile à maintenir.

`compose.yml` décrit `db`, `api`, `web`, `adminer` et `stats-api`. `depends_on: condition: service_healthy` attend que PostgreSQL soit prêt avant l'API. `pgdata` est nommé. `adminer` est accessible sur le port 8081 pour consulter les données.

```bash
docker compose up --build -d
docker compose ps
docker compose logs db
docker compose logs api
```

Dans Adminer, choisir PostgreSQL ; serveur `db`, puis les identifiants du `.env`. Le jeu : http://localhost:8080 ; Adminer : http://localhost:8081.

## Étape 7 — Ajouter les statistiques Python

**Pourquoi :** un deuxième service peut interroger la même base sans dupliquer son stockage.

`stats-api/app.py` est un service Flask qui lit PostgreSQL avec `psycopg2` et retourne : meilleur score, nombre total de parties, nombre de joueurs distincts. Si la table est vide, `COALESCE(MAX(score), 0)` renvoie 0. Si la base est arrêtée, `/stats` retourne HTTP 503.

```bash
curl http://localhost:8000/stats
```

Comparer le nombre de parties affiché avec `SELECT COUNT(*) FROM scores;` dans Adminer. Remarque : le sujet annonce un code Python fourni, mais ce code n'était pas dans le dépôt public consulté ; cette implémentation respecte l'interface demandée sans prétendre être le fichier original du professeur.

## Étape 8 — Publier des images sur un registry

**Pourquoi :** déployer ailleurs sans installer ton code source. Construire trois images avec `docker build` (commandes dans README), les taguer `MON_COMPTE/...:1.0`, se connecter avec `docker login` puis `docker push`. `compose.prod.yml` référence seulement les images publiées, pas des instructions `build:`.

La publication réelle doit être faite avec **ton propre compte Docker Hub**. Aucune image n'a été publiée automatiquement ici.

## Étape 9 — Mesurer avant d'optimiser

**Pourquoi :** dire « mon image est légère » n'a aucun sens sans chiffre avant/après.

```bash
time docker build --no-cache -t clickfast-web:mesure .
time docker build -t clickfast-web:mesure .
docker image ls
docker history clickfast-web:mesure
curl -w 'Temps : %{time_total}s\n' -o /dev/null -s http://localhost:8080/
```

Faire la même mesure pour l'API et les stats. Remplir le tableau du README avec les résultats réels. Ne jamais inventer des secondes ou des mégaoctets. Les choix d'optimisation déjà intégrés sont l'image Alpine Nginx, les images non-root, les fichiers minimaux et le multi-stage pour l'API.

## Étape 10 — Tester la stack et les pannes

1. Jouer et enregistrer un score ; vérifier le classement.
2. Soumettre un POST avec score négatif ; constater HTTP 400.
3. Vérifier que `localhost:5432` ne répond pas.
4. Comparer `/stats` au contenu d'Adminer.
5. Arrêter PostgreSQL, recharger le classement : erreur de service, mais le jeu continue à fonctionner.
6. Redémarrer PostgreSQL, puis vérifier que les scores reviennent.

## Page 107 — Première pipeline verte

**But :** un `git push` lance automatiquement les tests et les builds, sans retaper les commandes.

1. `package.json` décrit le script `npm test`; Jest et jsdom simulent les clics dans un faux DOM.
2. `tests/game.test.js` vérifie le compteur, la limite des 5 secondes et la remise à zéro.
3. `api/tests/api.test.js` vérifie l'API, la validation des scores et le HTTP 503.
4. `.github/workflows/ci.yml` déclenche les jobs `test` puis `build` à chaque push/PR.
5. La dépendance `needs: test` empêche le build si les tests échouent : c'est le principe *fail fast*.
6. Dans ton propre dépôt GitHub, ouvrir l'onglet **Actions**, regarder l'exécution, puis mettre l'URL correcte du badge dans le README.

```bash
npm ci && npm test
cd api
npm ci && npm test
```

**Attention :** le code et les tests ont été préparés, mais un badge vert GitHub ne peut être garanti qu'après avoir créé ton dépôt et observé une exécution réelle.
