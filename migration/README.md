# Migration EspritJDR -> JdRoll 2.0

Outil de migration des données du site EspritJDR (base `espritjdr`) vers JdRoll 2.0
(base `jdroll`), sur le même serveur MySQL.

## Périmètre actuel

Pour une campagne espritjdr donnée (argument `--campaign-id`) :

| EspritJDR                       | JdRoll                                        |
| ------------------------------- | --------------------------------------------- |
| `campagne`                       | `campagne` + `campagne_config`                |
| `espace_campagne` (+ `espace_section` + `groupe_campagne`) | `sections` (libellés joints par ` > `)  |
| `theme_groupe`                    | `topics` (libellé du thème seul)             |
| `post_theme`                    | `posts`                                       |
| `hj_post` (+ `hj_post_reponse`) | bloc `[private=...]` ajouté au contenu du post principal |
| `demande_jet`                   | `dicer` + post de jet de dés (carte du site)   |

- Un compte technique jdroll (par défaut `EspritJDR`) est créé s'il n'existe pas :
  il devient MJ de toutes les campagnes migrées et auteur par défaut des posts.
  Un post dont l'intervenant est rattaché à un utilisateur jdroll connu est
  attribué à cet utilisateur.
- **Rattachement aux utilisateurs jdroll existants** (par pseudo de l'utilisateur
  espritjdr lié à l'intervenant) :
  - un CREA (type 1) unique dont le pseudo existe côté jdroll devient MJ de la
    campagne (sinon le compte technique reste MJ) ; un utilisateur lié à la
    fois au CREA et à un MJ (type 2) est considéré simplement MJ : il n'est pas
    ajouté à `campagne_participant` ;
  - les MJ (type 2) dont le pseudo existe côté jdroll sont ajoutés à la campagne
    comme MJ assistants (`campagne_participant.statut = 2`) ;
  - les intervenants importés (PJ type 3, PNJ type 4) dont le pseudo existe côté
    jdroll : le personnage migré lui est associé (`personnages.user_id`) et il est
    ajouté aux participants de la campagne (validé, `statut = 1`) — sauf s'il est
    le MJ identifié de la campagne, qui n'est pas participant (le MJ y est par
    défaut) ; ses personnages et ses posts lui restent néanmoins attribués.
- Les statuts sont convertis (préparation -> 3, ouverte -> 0, fermée/bloquée -> 2, pause -> 1).
- Les entités HTML des libellés sont décodées (`R&egrave;gles` -> `Règles`).
- Les espaces sans contenu (aucun groupe) ne génèrent pas de section jdroll ;
  de même, les groupes sans thème ne génèrent pas de section. Une section
  jdroll correspond donc à un groupe espritjdr : son libellé joint
  `espace > intercalaire > groupe` (intercalaire omis si absent, `Sans espace`
  pour un groupe orphelin), et les topics y reprennent le libellé du thème seul.
- **Jets de dés** (`demande_jet`) : chaque demande rattachée à la campagne devient
  une ligne `dicer` (description = titre du jet, résultat = rendu historique
  nettoyé, les images de dés espritjdr devenant la notation `dN ( V )` rendue en
  dés vectoriels par jdroll ; date de création = celle du post lié, sinon
  l'heure de la migration ; utilisateur = joueur jdroll de l'intervenant
  destinataire, sinon le compte technique). Les demandes liées à un post
  deviennent en plus un post de jet de dés (même carte que sur le site, sans
  auteur), inséré juste après le post lié ; si le post lié était déjà migré, le
  post de jet est ajouté en fin du topic du post lié.
- Les topics issus de groupes fermés ou archivés sont créés fermés (`is_closed`).

## Idempotence

La table `espritjdr_migration` (créée automatiquement dans la base jdroll) mémorise
la correspondance source -> cible. Une campagne déjà migrée entraîne une erreur,
et une migration interrompue peut être relancée : les éléments déjà migrés sont ignorés.

## Utilisation

```bash
cp .env.example .env   # adapter la connexion MySQL
npm run migrate -- --campaign-id 1356 [--force] [--noimg]
```

- `--force` : supprime la campagne jdroll déjà migrée puis la réimporte intégralement.
- `--noimg` : ne télécharge pas les images (avatars et images inline) ; les liens
  d'origine espritjdr sont conservés tels quels.

## Tests

```bash
npm test
```
