# ClickFast ⚡ — DevOps Jour 1

Projet pédagogique de rattrapage d'Alain-Patrick Gomas, basé sur [OnyJ/ClickFast](https://github.com/OnyJ/ClickFast). **Ce travail est une copie locale, non publiée.**

Jeu : cliquer le plus de fois en 5 secondes, enregistrer son score et afficher un classement. Stack : HTML/CSS/JS + Nginx non-root, Node.js/Express, PostgreSQL, Python/Flask, Docker Compose, Jest, GitHub Actions.

![CI](https://github.com/REMPLACER_UTILISATEUR/REMPLACER_DEPOT/actions/workflows/ci.yml/badge.svg)

## Démarrer

Installer Docker et Docker Compose puis, à la racine du dépôt :

```bash
cp .env.example .env
# Modifier POSTGRES_PASSWORD dans .env : choisir un mot de passe fort.
docker compose -f compose.yml up --build -d
docker compose ps
```

- Jeu : http://localhost:8080 ; classement : http://localhost:8080/api/scores
- Adminer : http://localhost:8081 ; système PostgreSQL ; serveur `db` ; identifiants de `.env`
- Statistiques : http://localhost:8000/stats

```bash
docker compose logs -f api
docker compose stop db          # Simuler une panne : le jeu reste jouable
docker compose start db         # Retrouver les scores
docker compose down             # Arrêt sans supprimer les données
```

Attention : `docker compose down -v` efface les données stockées dans le volume.

## Tester et automatiser (page 107 du cours)

```bash
npm ci
npm test
cd api
npm ci
npm test
```

Le workflow `.github/workflows/ci.yml` lance les tests puis construit les trois images sur chaque `push` ou `pull_request`. Grâce à `needs: test`, un test rouge empêche la construction. Publier ce travail dans **son propre dépôt** puis modifier l'URL du badge en remplaçant `REMPLACER_UTILISATEUR/REMPLACER_DEPOT` ; ne pas pousser sur le dépôt du professeur.

## Docker et publication

```bash
docker build -t clickfast-web:1.0 .
docker build -t clickfast-api:1.0 ./api
docker build -t clickfast-stats:1.0 ./stats-api
docker images
docker run --rm clickfast-web:1.0 whoami
docker run --rm clickfast-web:1.0 ls -a /usr/share/nginx/html
```

Le `whoami` doit indiquer un utilisateur autre que root. Pour publier sur Docker Hub, après `docker login` :

```bash
docker tag clickfast-web:1.0 MON_COMPTE/clickfast-web:1.0
docker tag clickfast-api:1.0 MON_COMPTE/clickfast-api:1.0
docker tag clickfast-stats:1.0 MON_COMPTE/clickfast-stats:1.0
docker push MON_COMPTE/clickfast-web:1.0
docker push MON_COMPTE/clickfast-api:1.0
docker push MON_COMPTE/clickfast-stats:1.0
```

Avec uniquement `compose.prod.yml` et un `.env` où `DOCKERHUB_USER=MON_COMPTE` et `IMAGE_TAG=1.0`, lancer `docker compose -f compose.prod.yml up -d` pour télécharger les images et redéployer sans le code.

## Architecture

```text
Navigateur -> Nginx web:8080 -> /api -> Express api:3000 -> PostgreSQL db:5432
                                           Python stats-api:8000 -> db:5432
                                           Adminer:8081 -> db:5432
```

PostgreSQL n'expose aucun port vers l'hôte. Le réseau Docker privé permet d'y accéder par le nom `db`. Le volume `pgdata` conserve les scores. Le `.env` n'est pas versionné. L'API emploie des requêtes SQL paramétrées et renvoie HTTP 503 si PostgreSQL tombe.

## Journal de bord (mesures à faire sur ta machine)

| Étape | Vérification | Résultat |
|---|---|---|
| 1 : jeu | 2 clics donnent 2 points ; compteur bloqué après 5 s | Code créé, validation navigateur à faire |
| 2 : image Nginx | `whoami`, fichiers servis, taille de l'image | Docker non disponible ici, à mesurer |
| 3 : scores | POST/GET, arrêt et recréation PostgreSQL en conservant volume | À tester |
| 4 : réseau | `docker compose exec api getent hosts db` ; port 5432 inaccessible de l'hôte | À tester |
| 5 : config | Retirer une variable `.env`, constater l'erreur | À tester |
| 6 : Compose | `docker compose ps`, état Healthy de Postgres | À tester |
| 7 : Python | `/stats` comparé au `COUNT(*)` SQL | À tester |
| 8 : registry | Push Docker Hub, redéploiement sans sources | Nécessite le compte de l'étudiant |
| 9 : mesures | Build froid/chaud, couches, tailles, réponse HTTP | À mesurer réellement |
| 10 : panne | Couper DB, observer HTTP 503 et jeu jouable | À tester |
| CI | Tests puis build dans GitHub Actions, badge | À vérifier après push |

| Image | Taille | Couche max | Build froid | Build chaud | 1re réponse HTTP |
|---|---|---|---|---|---|
| Jeu | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |
| API | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |
| Stats | à mesurer | à mesurer | à mesurer | à mesurer | à mesurer |

Commandes de diagnostic : `docker compose logs api`, `docker compose logs db`, `docker compose ps`, `docker stats --no-stream`, `docker network ls`, `docker volume ls`. Ne pas inventer d'observations : remplir le journal après les manipulations effectives.
