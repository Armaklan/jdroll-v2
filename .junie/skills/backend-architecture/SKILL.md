---
name: backend-architecture
description: Guide et conventions d'architecture pour le backend Node.js Fastify de JdRoll 2.0 (Controllers, UseCases, Queries, Repositories).
---

# Architecture Backend JdRoll 2.0

Ce document définit les règles et standards d'architecture pour le développement de l'API Node.js (Fastify + TypeScript) de JdRoll.

## 🏗️ Vue d'ensemble des couches

Le backend est structuré selon une architecture en couches étanches :

```
[ HTTP Request ]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Controller Layer (src/controllers/)                      │
│    - Déclaration des routes Fastify                         │
│    - Validation des entrées (Zod schemas)                   │
│    - Mapping DTOs API <-> Objets de domaine                 │
│    - Gestion des tokens / auth / context Fastify            │
│    - Transformation des erreurs de domaine en codes HTTP    │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Modifications / Actions)    │ (Lectures / Requêtes)
               ▼                              ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│ 2. UseCase Layer             │ │ 3. Query Layer               │
│    (src/usecases/<domain>/)  │ │    (src/queries/)            │
│                              │ │                              │
│ - Un usecase par action      │ │ - Regroupe plusieurs         │
│   métier modifiante          │ │   requêtes de lecture        │
│ - Orchestration & règles     │ │   fonctionnellement proches  │
│ - Hash, vérifications métier │ │ - Pas de modification d'état │
│ - Indépendant du transport   │ │ - Retourne des objets        │
│   HTTP                       │ │   de domaine / lecture       │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Repository / Persistence Layer (src/repositories/)       │
│    - Interfaces (ex: IUserRepository) pour les tests       │
│    - Implémentation SQL MySQL (queryOne, execute, etc.)     │
│    - Persistance et extraction des données brutes           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Règles par couche

### 1. Contrôleurs (`src/controllers/`)
* **Rôle** : Point d'entrée HTTP.
* **Responsabilités** :
  - Définir et enregistrer les routes Fastify via `registerRoutes(app: FastifyInstance)`.
  - Valider le corps, les paramètres et les query params via des schémas **Zod**.
  - Mapper les DTOs d'entrée vers les paramètres du UseCase ou de la Query.
  - Exécuter le UseCase (pour les actions) ou la Query (pour les lectures).
  - Générer les tokens JWT / manipuler la session Fastify si nécessaire.
  - Traduire les exceptions de domaine (`DomainError`, `UserAlreadyExistsError`, `UserNotFoundError`, `InvalidCredentialsError`, etc.) en codes de statut HTTP adéquats (400, 401, 404, 409...).
* **Interdictions** : Ne JAMAIS faire de requêtes SQL directement dans un contrôleur. Ne pas y mettre de logique métier complexe.

### 2. UseCases (`src/usecases/<domaine>/<action>.usecase.ts`)
* **Rôle** : Encapsuler une action métier unitaire qui modifie des données ou applique une règle métier complexe.
* **Règle d'or** : **1 fichier = 1 action / usecase**.
* **Responsabilités** :
  - Accepter un DTO / input métier fortement typé.
  - Vérifier les préconditions métier (ex: unicité, permissions métier, transitions d'état).
  - Appliquer les règles de calcul, hachage, validation métier.
  - Déclencher les modifications via les Repositories.
  - Lever des erreurs de domaine explicites dérivées de `DomainError`.
  - Être testable unitairement sans base de données grâce à l'injection de dépendances (interfaces de Repository).

### 3. Module de Queries (`src/queries/<domaine>.queries.ts`)
* **Rôle** : Fournir des méthodes de consultation en lecture seule, sans effets de bord.
* **Règle** : Regroupe des requêtes de lecture fonctionnellement proches (ex: `UserQueries`, `CampaignQueries`, `ForumQueries`).
* **Responsabilités** :
  - Récupérer les données de lecture (profil, liste de campagnes, messages d'un topic, etc.).
  - Lever une `UserNotFoundError` ou `NotFoundError` si une entité attendue n'est pas trouvée.
  - Effectuer les jointures ou projections optimisées pour l'affichage.

### 4. Repositories (`src/repositories/<domaine>.repository.ts`)
* **Rôle** : Abstraction de la persistance en base de données.
* **Responsabilités** :
  - Définir une interface (ex: `IUserRepository`) pour permettre le mock facile dans les tests unitaires.
  - Fournir l'implémentation concrète MySQL (`MysqlUserRepository`).
  - Isoler toutes les requêtes SQL (SELECT, INSERT, UPDATE, DELETE).
  - Mapper les lignes MySQL vers les types/entités TypeScript.

---

## 🧪 Tests Unitaires
* Chaque UseCase et Query doit avoir son fichier de test unitaire `.test.ts` à côté du code source.
* Utiliser les mocks en mémoire des interfaces de Repository pour des tests instantanés et déterministes.
* Exécuter la suite de tests avec `npm test --workspace=backend`.
