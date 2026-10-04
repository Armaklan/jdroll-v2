# Fonctionnalités du générateur de fiches espritjdr sans équivalent fiche codée jdroll

Analyse des fiches réelles de `generateur_fiche` du dump espritjdr (Shaan, Savage
Worlds, DeadLands, L'école des jeux vidéo, Tutoriel, Fiche générique, FATE) et
du format de la fiche codée jdroll (`campagne_config.template_fields` /
`template_img` / `text_color`, valeurs par personnage dans
`personnages.perso_fields`).

Chaque clé du compteur `unsupported` affiché par la migration correspond à une
ligne du tableau ci-dessous (clé entre parenthèses).

## Lien entre la campagne et la fiche côté espritjdr

Il n'existe **pas de clé étrangère directe** entre `campagne` et la fiche :

- `campagne.jeu_ID` → `jeu` (système de jeu) → `jeu.ficheXML` : nom du fichier
  XML de la fiche par défaut du système de jeu (ex. `vampire.xml`, `cthulhu.xml`).
  C'est le lien affiché : une campagne utilise la fiche de son système de jeu.
- `generateur_fiche` ne référence que `utilisateur_ID` : c'est la bibliothèque
  de fiches personnalisées d'un utilisateur (celles du dump appartiennent toutes
  à l'utilisateur 52, créées via le module « générateur de fiche » du site).
  Le rattachement d'une fiche à un personnage se fait côté application, pas en
  base.
- `jeu.systeme_des` et l'élément `<system_jet id="N"/>` du XML pointent le
  système de jets lié à la fiche (table non présente dans ce dump).
- Les lignes de jet de `demande_jet` référencent les champs de la fiche :
  format pipe `<id fiche>|<secret>|<type de dé>|<compétence>|<valeur>|...`
  (le premier champ est l'id du champ de la fiche, `0` pour un jet générique).

Conséquence pour la migration : la fiche codée est **une configuration de la
campagne jdroll** (`campagne_config`), pas des personnages. La migration
convertit une fiche `generateur_fiche` choisie (`--fiche-id`) et l'applique à
la campagne migrée ; les valeurs par personnage (`perso_fields`) restent vides,
le dump ne contient pas les valeurs saisies par personnage.

## Fonctionnalités espritjdr non reprises par la fiche codée jdroll

| Fonctionnalité espritjdr | Élément XML | Traitement migration | État côté jdroll |
| --- | --- | --- | --- |
| Système de jets de la fiche | `<system_jet id="N"/>` (`system_jet`) | Ignoré | Jets via le dicer de campagne (`campagne_config.default_dice`) |
| Jet de dés déclenché depuis un champ | `<balise_jet des="0D10" titre="..." balise_jet_code ...>` (`balise_jet`) | Ignoré (le champ englobé est migré) | Aucune liaison champ → jet de dés |
| Slots/historique de jets de la fiche | `<jet_des id="1..10"/>` (`jet_des`) | Ignoré | Historique migré à part : `demande_jet` → `dicer` + posts de jet |
| Bandeau de titre de fiche | `<titre_fiche titre image bgcouleur txtcouleur/>` (`titre_fiche`) | Ignoré | Pas de titre de fiche |
| Label statique | `<titre titre="Points de vie" pasgras italique souligne .../>` (`titre_label`) | Converti en champ texte éditable portant le libellé (dégradation : modifiable par le joueur) | Pas de composant label non éditable en fiche codée |
| Fiche multipage à onglets | `<section onglet titre_onglet>` (`onglet`) | Toutes les pages aplaties sur un seul canvas | Fiche codée monopage |
| Fond de section / image de section | `<section image="...">`, `<section_absolu image="...">` (`section_image`) | Ignoré | Une seule image de fond par campagne (`template_img`, reprise de l'image racine de la fiche) |
| Image positionnée dans la fiche | `<image url="...">` (`image`) | Ignorée | Pas d'image inline dans les champs |
| Cases à cocher | `<groupe_check groupe_nb><item num><selected/></groupe_check>` (`groupe_check`) | Ignorées | Pas de type checkbox en fiche codée |
| Boutons radio | `<groupe_radio groupe_nb><selected>0</selected>...</groupe_radio>` (`groupe_radio`) | Ignorés | Pas de type radio en fiche codée |
| Mise en forme par champ : taille de police, couleurs, bordures, arrondi, marges, alignement, gras/italique/souligné | `fontsize`, `txtcouleur`, `bgcouleur`, `bordure*`, `arrondi`, `marge*`, `aligner`, `center`, `pasgras`, `italique`, `souligne` | Ignorés | Une seule couleur de texte au niveau campagne (`text_color`, reprise de `txtcouleur` racine) ; pas de style par champ |
| Longueur maximale de saisie | `size` (text/total) | Ignorée | Pas de limite de saisie |
| Dimensions implicites de zone de texte | `nbrows`, `nbcols` (area) | Ignorées | La zone garde `largeur`/`hauteur` |
| Totaux calculés / renvois entre champs | `total`, `ref`, `ref2`, `attribut` | Les `total` deviennent de simples champs texte | Pas de champ calculé en fiche codée |
| Dimensions de la fiche | `largeur`/`hauteur` racine | Non appliquées | Canvas jdroll fixé par campagne (`campagne_config.width`, défaut 800px vs fiche espritjdr souvent 850px) |
| Fond de couleur de la fiche / des sections | `bgcouleur` racine et des sections | Ignoré | Fond = image (`template_img`) uniquement |
| Répétition du fond | `norepeat` | Ignoré | Non applicable |

## Éléments bien repris

- `text` et `total` → champ texte ; `area` → zone de texte ; positions et
  tailles absolues conservées (offsets des `section`/`section_absolu`
  imbriqués additionnés).
- Image de fond racine (`fiche@image`) → `campagne_config.template_img`
  (téléchargée dans `files/` comme les autres images, sauf `--noimg`).
- `fiche@txtcouleur` → `campagne_config.text_color`.
- `valeur` d'un champ → valeur par défaut du champ jdroll.

À noter : les fiches codées jdroll n'ont que trois types de champ (texte, zone
de texte, liste déroulante) et pas de gestion d'onglets ; le module « fiche
programmée » jdroll (`campagne_config.sheet_mode = programmed`, feature flip
`programmed-sheet`) couvre en revanche labels, radios, scorings et pages —
piste possible si une fidélité plus fine est souhaitée ultérieurement.
