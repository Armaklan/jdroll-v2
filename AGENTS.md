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
6. **Réexécuter le test correspondant** : `npm test --workspace=backend -- <chemin du test>` pour le fichier de test lié au code modifié (pas besoin de relancer toute la suite à chaque itération)
7. **Vérifier** que tous les tests correspondants passent avant de continuer
8. **Recommencer** si un test échoue
9. **Avant de clore la tâche** : exécuter la suite complète `npm test --workspace=backend` une dernière fois pour vérifier l'absence de régression

## Tests E2E pour les nouvelles fonctionnalités

**OBLIGATOIRE** :
1. **Mettre à jour les tests e2e** : Modifier ou créer le test e2e correspondant à la nouvelle fonctionnalité
2. **Exécuter les tests e2e** : Vérifier qu'ils tombent en échec (KO) pour confirmer le besoin
3. **Faire le développement** : Implémenter la fonctionnalité
4. **Vérifier que les tests e2e sont maintenant OK** : Réexécuter les tests e2e pour confirmer qu'ils passent

## Règle absolue
**TDD pur** : RED → GREEN → REFACTOR, avec exécution des tests à chaque étape.

## Git
**Ne pas faire de commits git** : Ne jamais tenter d'exécuter `git commit`, `git push`, ou toute autre commande git de validation, sauf demande explicite de l'utilisateur.
