# Directives pour Mistral Vibe (ce repository)

## Chargement automatique des Skills

**À exécuter au démarrage de chaque session dans ce repo** :
- Lire et appliquer tous les fichiers SKILL.md dans `.junie/skills/**/`
- Skills actuels à appliquer : `backend-architecture` (`.junie/skills/backend-architecture/SKILL.md`)
- Ces fichiers définissent les conventions architecturales à respecter

## Boucle TDD OBLIGATOIRE

### ❌ INTERDIT
- Modifier du code de production sans test correspondant qui échoue AVANT
- Clore une tâche si les tests ne passent pas

### ✅ OBLIGATOIRE avant toute modification de code
1. **Trouver/creer le test** : Localiser le fichier `*.test.ts` correspondant
2. **Écrire le test en échec** : Il doit échouer pour valider le besoin
3. **Exécuter** : `npm test --workspace=backend` pour confirmer l'échec

### ✅ OBLIGATOIRE pendant l'implémentation
4. **Coder le strict minimum** pour faire passer le test
5. **Ne rien ajouter** qui n'est pas couvert par un test

### ✅ OBLIGATOIRE après toute modification de code
6. **Réexécuter TOUS les tests** : `npm test --workspace=backend`
7. **Vérifier** que tous passent avant de continuer
8. **Recommencer** si un test échoue

## Règle absolue
**TDD pur** : RED → GREEN → REFACTOR, avec exécution des tests à chaque étape.

## Git
**Ne pas faire de commits git** : Ne jamais tenter d'exécuter `git commit`, `git push`, ou toute autre commande git de validation, sauf demande explicite de l'utilisateur.
