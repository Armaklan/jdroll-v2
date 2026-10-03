# Migration EspritJDR -> JdRoll 2.0

Outil de migration des données du site EspritJDR (base `espritjdr`) vers JdRoll 2.0
(base `jdroll`), sur le même serveur MySQL.

## Périmètre actuel

Pour une campagne espritjdr donnée (argument `--campaign-id`) :

| EspritJDR                       | JdRoll                                        |
| ------------------------------- | --------------------------------------------- |
| `campagne`                       | `campagne` + `campagne_config`                |
| `espace_campagne` (+ `espace_section`) | `sections` (libellés joints par ` > `)  |
| `groupe_campagne` + `theme_groupe` | `topics` (libellés joints par ` > `)       |
| `post_theme`                    | `posts`                                       |
| `hj_post` (+ `hj_post_reponse`) | bloc `[private=...]` ajouté au contenu du post principal |

- Un compte technique jdroll (par défaut `EspritJDR`) est créé s'il n'existe pas :
  il devient MJ de toutes les campagnes migrées et auteur de tous les posts.
- Les statuts sont convertis (préparation -> 3, ouverte -> 0, fermée/bloquée -> 2, pause -> 1).
- Les entités HTML des libellés sont décodées (`R&egrave;gles` -> `Règles`).
- Les espaces sans contenu (aucun groupe) ne génèrent pas de section jdroll.
- Les topics issus de groupes fermés ou archivés sont créés fermés (`is_closed`).

## Idempotence

La table `espritjdr_migration` (créée automatiquement dans la base jdroll) mémorise
la correspondance source -> cible. Une campagne déjà migrée entraîne une erreur,
et une migration interrompue peut être relancée : les éléments déjà migrés sont ignorés.

## Utilisation

```bash
cp .env.example .env   # adapter la connexion MySQL
npm run migrate -- --campaign-id 1356
```

## Tests

```bash
npm test
```
