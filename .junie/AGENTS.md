# Directives pour Mistral Vibe

## Chargement des Skills

**Instruction critique** : Au démarrage de chaque session dans ce repository, charger automatiquement tous les skills disponibles dans `.junie/skills/**/SKILL.md`.

Skills actuels à charger :
- `backend-architecture` (from `.junie/skills/backend-architecture/SKILL.md`)

Méthode : Utiliser la commande `skill` pour chaque skill découvert.

## Processus de développement TDD (obligatoire)

### Avant toute implémentation (Phase RED)
1. **Localiser le test** : Identifier ou créer le fichier de test correspondant (`*.test.ts` ou `*.spec.ts`)
2. **Écrire le test en échec** : Le test DOIT échouer avant toute modification du code de production
3. **Exécuter le test** : Vérifier qu'il échoue avec `npm test --workspace=backend`

### Pendant l'implémentation (Phase GREEN)
4. **Code minimal** : Écrire uniquement le code nécessaire pour faire passer le test
5. **Ne pas ajouter** de fonctionnalité non testée

### Après l'implémentation (Phase REFACTOR)
6. **Réexécuter TOUS les tests** : `npm test --workspace=backend`
7. **Valider** que tous les tests passent avant de considérer la tâche terminée
8. **Refactorer** uniquement si les tests restent verts

## Règles immuables
- ❌ **INTERDIT** : Modifier du code de production sans test correspondant qui échoue d'abord
- ✅ **OBLIGATOIRE** : Exécuter les tests AVANT chaque modification de code
- ✅ **OBLIGATOIRE** : Réexécuter les tests APRÈS chaque modification de code
- ✅ **OBLIGATOIRE** : Tous les tests doivent passer pour clore une tâche

## Commandes de test à utiliser
- Tests complets : `npm test --workspace=backend`
- Test spécifique : `npm test --workspace=backend -- <path>`
- Mode watch : `npm test --workspace=backend -- --watch`

