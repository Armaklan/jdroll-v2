# JdRoll 2.0

Squelette technique moderne pour la refonte de l'application **JdRoll** :
- **Backend** : Node.js avec **Fastify** (TypeScript), requêtes **MySQL** (table `user` avec vérification des mots de passe en MD5) et authentification **JWT**.
- **Frontend** : **Vite + React SPA** (TypeScript) avec **Tailwind CSS**.

---

## 📁 Structure du projet

```text
jdRoll2/
├── data/
│   └── create.sql             # Schéma de base de données MySQL existant
├── backend/
│   ├── src/
│   │   ├── config/env.ts              # Configuration (port, MySQL, JWT secret)
│   │   ├── controllers/
│   │   │   └── auth.controller.ts     # Déclaration des routes & mapping DTO <-> Métier
│   │   ├── db/mysql.ts                # Pool de connexion mysql2/promise
│   │   ├── errors/
│   │   │   └── domain.errors.ts       # Erreurs métier de domaine
│   │   ├── plugins/
│   │   │   └── auth.plugin.ts         # Plugin JWT Fastify (fastify.authenticate)
│   │   ├── queries/
│   │   │   └── user.queries.ts        # Module de requêtes en lecture seule
│   │   ├── repositories/
│   │   │   └── user.repository.ts     # Couche de persistance et accès SQL
│   │   ├── types/index.ts             # Types TypeScript (User, CreateUserData, JWTPayload)
│   │   ├── usecases/
│   │   │   └── auth/
│   │   │       ├── register-user.usecase.ts # Action métier d'inscription
│   │   │       └── login-user.usecase.ts    # Action métier de connexion
│   │   ├── utils/auth.ts              # Fonctions de hachage et vérification MD5
│   │   ├── app.ts                     # Instance Fastify
│   │   └── server.ts                  # Point d'entrée serveur
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/auth.ts        # Client API pour l'authentification
│   │   ├── components/
│   │   │   └── Navbar.tsx     # Barre de navigation et état de connexion
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx# Contexte React d'authentification
│   │   ├── pages/
│   │   │   ├── HomePage.tsx   # Tableau de bord et statut système
│   │   │   ├── LoginPage.tsx  # Formulaire de connexion
│   │   │   └── RegisterPage.tsx # Formulaire d'inscription
│   │   ├── types/auth.ts      # Types frontend
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── package.json               # Monorepo NPM Workspaces
└── README.md
```

---

## 🚀 Démarrage rapide

### 1. Lancer la base de données MySQL
Un fichier `docker-compose.yml` est fourni pour instancier la base MySQL avec le schéma initial (`data/create.sql`) et des utilisateurs de test pré-créés (`data/seed.sql`) :
```bash
docker compose up -d
```

> **Comptes de test disponibles** :
> - `admin` (MDP: `password`, profil MJ/admin)
> - `testuser` (MDP: `password`, profil joueur)
> - `joueur2` (MDP: `password`, profil joueur)

### 2. Installation des dépendances
```bash
npm install
```

### 3. Configuration de l'environnement (Backend)
Créez un fichier `backend/.env` (ou copiez `backend/.env.example`) :
```env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=super-secret-jwt-key-change-it-in-production

DB_HOST=localhost
DB_PORT=3306
DB_USER=jdroll
DB_PASSWORD=jdroll
DB_NAME=jdroll
```

### 4. Lancer l'application en développement
Pour lancer le frontend et le backend en parallèle :
```bash
npm run dev
```

Ou séparément :
- **Backend** : `npm run dev:backend` (accessible sur `http://localhost:3001`)
- **Frontend** : `npm run dev:frontend` (accessible sur `http://localhost:3000`)

---

## 🔒 Authentification & Base de données

- **Table ciblée** : `user` (définie dans `data/create.sql`).
- **Encodage du mot de passe** : MD5 (`md5(password)`).
- **Format du token** : JWT (JSON Web Token) retourné à la connexion et à l'inscription, transmis via le header `Authorization: Bearer <token>`.
- **Endpoints API** :
  - `POST /api/auth/register` : Inscription d'un nouvel utilisateur (identifiant, email, mot de passe).
  - `POST /api/auth/login` : Connexion (identifiant ou email + mot de passe).
  - `GET /api/auth/me` : Récupération du profil utilisateur connecté.
  - `GET /api/campaigns/mine?role=master|player&includeArchived=true|false` : Liste des campagnes de l'utilisateur (maîtrisées ou joueur, avec filtre d'archivage).
  - `GET /api/health` : Diagnostic et statut du service backend.
