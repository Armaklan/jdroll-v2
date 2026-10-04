import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapFicheToSheetTemplate,
  serializeSheetFields,
} from './sheet.mapper.js';

const FICHE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<fiche id="fiche_generateur" generateur="1" image="http://www.espritjdr.net/Upload/generateur/8/fond.png" norepeat="1" center="" bgcouleur="transparent" txtcouleur="#ffa93d" margeinterieur="0px" marge="0px" largeur="850" hauteur="762" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche=""><system_jet id="70"/>
<titre_fiche id="titre_fiche" titre="" image="" bgcouleur="" txtcouleur="" margeinterieur=""/>
<section_absolu id="partie_gauche" position_haut="100" position_gauche="50" image="" norepeat="" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="400" hauteur="600" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche="" arrondi="">
<text id="nom_perso" position_haut="14" position_gauche="122" valeur="Nom du personnage" center="" aligner="gauche" size="35" fontsize="10px" txtcouleur="black" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="195" hauteur="10" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche="" balise_jet="" balise_jet_code="" balise_jet_param=""/>
<area id="notes" position_haut="40" position_gauche="17" nbrows="10" nbcols="10" center="" aligner="gauche" fontsize="10px" txtcouleur="black" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="62" hauteur="62" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche=""/>
<titre id="lbl_pv" titre="Points de vie" position_haut="80" position_gauche="10" pasgras="" italique="" souligne="" aligner="" center="1" fontsize="" txtcouleur="black" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="119" hauteur="15" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche=""/>
</section_absolu>
<balise_jet des="0D10" titre="Initiative" balise_jet="balise_jet" balise_jet_code="0D10" balise_jet_param="titre=Initiative"><total id="initiative" position_haut="20" position_gauche="300" valeur="" center="1" aligner="" size="3" fontsize="16px" txtcouleur="black" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="33" hauteur="31" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche="" balise_jet="balise_jet" balise_jet_code="0D10" balise_jet_param="titre=Initiative"/></balise_jet>
<groupe_check id="check_1" position_haut="500" position_gauche="749" groupe_nb="5" center="" aligner="" bgcouleur="" margeinterieur="" marge="" balise_jet="" balise_jet_code="" balise_jet_param=""><selected/><item num="1"/><item num="2"/></groupe_check>
<groupe_radio id="radio_1" position_haut="560" position_gauche="25" groupe_nb="1" bgcouleur="" margeinterieur="" marge="" balise_jet="" balise_jet_code="" balise_jet_param=""><selected>0</selected><item num="1"/></groupe_radio>
<image id="logo" url="http://www.espritjdr.net/Upload/generateur/8/logo.png" position_haut="10" position_gauche="10" center="" aligner="" bgcouleur="transparent" margeinterieur="0px" marge="0px" largeur="300" hauteur="164" nobordure="1" bordure="" bordure_haut="" bordure_bas="" bordure_droit="" bordure_gauche="" sequence="" balise_jet="" balise_jet_code="" balise_jet_param=""/>
<jet_des id="1"/><jet_des id="2"/></fiche>`;

test('mapFicheToSheetTemplate expose le fond, la taille et la couleur de texte de la fiche', () => {
  const plan = mapFicheToSheetTemplate(FICHE_XML);

  assert.equal(plan.backgroundImage, 'http://www.espritjdr.net/Upload/generateur/8/fond.png');
  assert.equal(plan.width, 850);
  assert.equal(plan.height, 762);
  assert.equal(plan.textColor, '#ffa93d');
});

test('mapFicheToSheetTemplate convertit text/total en champs texte et area en textarea', () => {
  const plan = mapFicheToSheetTemplate(FICHE_XML);

  assert.equal(plan.fields.length, 4);

  // text : position relative à la section_absolu (100, 50)
  const nom = plan.fields[0];
  assert.equal(nom.sourceId, 'nom_perso');
  assert.equal(nom.type, 'text');
  assert.equal(nom.top, 114);
  assert.equal(nom.left, 172);
  assert.equal(nom.width, 195);
  assert.equal(nom.height, 10);
  assert.equal(nom.defaultValue, 'Nom du personnage');

  // area : textarea
  const notes = plan.fields[1];
  assert.equal(notes.sourceId, 'notes');
  assert.equal(notes.type, 'textarea');
  assert.equal(notes.top, 140);
  assert.equal(notes.left, 67);

  // titre : label converti en champ texte portant le libellé
  const label = plan.fields[2];
  assert.equal(label.sourceId, 'lbl_pv');
  assert.equal(label.type, 'text');
  assert.equal(label.defaultValue, 'Points de vie');

  // total dans un balise_jet : position absolue, sans décalage
  const initiative = plan.fields[3];
  assert.equal(initiative.sourceId, 'initiative');
  assert.equal(initiative.type, 'text');
  assert.equal(initiative.top, 20);
  assert.equal(initiative.left, 300);
  assert.equal(initiative.defaultValue, '');
});

test('mapFicheToSheetTemplate recense les fonctionnalités sans équivalent jdroll', () => {
  const plan = mapFicheToSheetTemplate(FICHE_XML);

  assert.equal(plan.unsupported['system_jet'], 1);
  assert.equal(plan.unsupported['balise_jet'], 1);
  assert.equal(plan.unsupported['groupe_check'], 1);
  assert.equal(plan.unsupported['groupe_radio'], 1);
  assert.equal(plan.unsupported['image'], 1);
  assert.equal(plan.unsupported['jet_des'], 2);
  assert.equal(plan.unsupported['titre_fiche'], 1);
  assert.equal(plan.unsupported['titre_label'], 1);
});

test('serializeSheetFields produit le HTML fiche codée jdroll', () => {
  const plan = mapFicheToSheetTemplate(FICHE_XML);
  const html = serializeSheetFields(plan.fields);

  assert.match(html, /<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="4"><\/div>/);
  assert.match(html, /id="JDRollUserControl_1"[^>]*style="position: absolute; top: 114px; left: 172px; width: 195px; right: auto; height: 10px; bottom: auto;"/);
  assert.match(html, /<a id="JDRollUserControlLink1_child" data-type="text" data-pk="1" class="editable editable-click editable-unsaved" data-original-title="" title="" style="background-color: rgba\(0, 0, 0, 0\);">Nom du personnage<\/a>/);
  assert.match(html, /<a id="JDRollUserControlLink2_child" data-type="textarea" data-pk="1" class="editable editable-pre-wrapped editable-click editable-unsaved editable-empty"/);
  // champ vide : contenu "Empty" et classe editable-empty
  assert.match(html, /background-color: rgba\(0, 0, 0, 0\);">Empty<\/a>/);
});

test('mapFicheToSheetTemplate gére une fiche avec section à onglets (multipage)', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fiche id="fiche_generateur" generateur="1" image="" largeur="850" hauteur="1202" txtcouleur="black">
<section id="page_1" onglet="1" titre_onglet="Perso" image="http://www.espritjdr.net/x/p1.jpg" largeur="850" hauteur="600">
<text id="nom" position_haut="10" position_gauche="10" valeur="" largeur="100" hauteur="12"/>
</section>
<section id="page_2" onglet="2" titre_onglet="Stuff" image="" largeur="850" hauteur="600">
<text id="sac" position_haut="20" position_gauche="20" valeur="bidon" largeur="100" hauteur="12"/>
</section>
</fiche>`;

  const plan = mapFicheToSheetTemplate(xml);

  assert.equal(plan.fields.length, 2);
  assert.equal(plan.fields[0].sourceId, 'nom');
  assert.equal(plan.fields[0].top, 10);
  assert.equal(plan.fields[0].left, 10);
  assert.equal(plan.fields[1].sourceId, 'sac');
  assert.equal(plan.fields[1].top, 20);
  assert.equal(plan.fields[1].left, 20);
  // les onglets sont recensés comme non gérés
  assert.equal(plan.unsupported['onglet'], 2);
  assert.equal(plan.unsupported['section_image'], 1);
});

test('mapFicheToSheetTemplate échappe les valeurs par défaut', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<fiche id="fiche_generateur" image="" txtcouleur=""><text id="t1" position_haut="0" position_gauche="0" valeur="A &amp; B &lt;carte&gt;" largeur="10" hauteur="10"/></fiche>`;

  const plan = mapFicheToSheetTemplate(xml);
  const html = serializeSheetFields(plan.fields);

  assert.equal(plan.fields[0].defaultValue, 'A & B <carte>');
  assert.match(html, />A &amp; B &lt;carte&gt;<\/a>/);
});

test('serializeSheetFields gére une liste vide de champs', () => {
  const html = serializeSheetFields([]);
  assert.equal(html, '<div id="JDRollUserControl_0"><input type="hidden" id="hiddenFieldsCount" value="0"></div>');
});
