# ClickFast — Application web et chaîne DevOps

Jeu web : réaliser un maximum de clics en cinq secondes, enregistrer
son score et consulter le classement.

Projet pédagogique réalisé à partir de [OnyJ/ClickFast](https://github.com/OnyJ/ClickFast).
Mon travail porte sur la conteneurisation, l’intégration des services
et l’automatisation de la livraison.

## Fonctionnalités

- Compteur de clics et chronomètre.
- Enregistrement des scores et classement.
- Service de statistiques.
- Persistance des données dans PostgreSQL.

## Technologies

HTML, CSS, JavaScript, Nginx, Node.js, Express, PostgreSQL,
Python, Flask, Docker Compose, Jest et GitHub Actions.

## Mon travail

- Configuration des services et de leur réseau avec Docker Compose.
- Utilisation d’un volume pour conserver les données PostgreSQL.
- Configuration du serveur web Nginx avec un utilisateur non-root.
- Mise en place du pipeline de tests et de construction des images.
- Ajout de la publication automatique des images sur Docker Hub.
- Préparation d’un environnement de déploiement simulé avec SSH.
- Résolution d’un problème d’authentification SSH lié aux permissions.

## Architecture

- **Web** : interface du jeu servie par Nginx.
- **API** : serveur Express pour les scores.
- **Base de données** : PostgreSQL.
- **Statistiques** : service Python/Flask.
- **Administration locale** : Adminer.

Nginx transmet les requêtes `/api` au service Express.
Les services communiquent sur le réseau Docker ; PostgreSQL
n’expose pas de port sur la machine hôte.

## Démarrage local

### Prérequis

- Docker avec Docker Compose.

### Installation

```bash
git clone https://github.com/GAP028/ClickFast-DevOps.git
cd ClickFast-DevOps
```

Copier `.env.example` vers `.env` :

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Linux / macOS
cp .env.example .env
```

Configurer les variables du fichier `.env`, notamment
`POSTGRES_PASSWORD`, puis démarrer les services :

```bash
docker compose -f compose.yml up --build -d
docker compose -f compose.yml ps
```

### Accès

| Service | Adresse |
|---|---|
| Jeu | http://localhost:8080 |
| Scores | http://localhost:8080/api/scores |
| Statistiques | http://localhost:8000/stats |
| Adminer | http://localhost:8081 |

Dans Adminer, utiliser PostgreSQL, le serveur `db`
et les identifiants configurés dans `.env`.

### Arrêt

```bash
docker compose -f compose.yml down
```

Les données restent conservées dans le volume.
L’option `down -v` supprime également les données du volume.

## Tests

À la racine du dépôt :

```bash
npm ci
npm test
```

Pour l’API :

```bash
cd api
npm ci
npm test
```

## Intégration continue

Le workflow GitHub Actions se trouve dans `.github/workflows/ci.yml`.

Il organise les vérifications et la construction des images Docker.
La construction dépend de la réussite des tests.

La publication sur Docker Hub nécessite les secrets configurés
dans GitHub Actions. Aucun identifiant ne doit être inscrit dans le code.

## État du projet

Application et configuration DevOps réalisées dans un cadre pédagogique.

Les tests et la construction ont été exécutés avec succès lors
de la dernière vérification rapportée. L’environnement SSH simulé
a également été testé.

Le déploiement automatique complet reste à finaliser.
Ce dépôt ne constitue pas un service exploité en production.
