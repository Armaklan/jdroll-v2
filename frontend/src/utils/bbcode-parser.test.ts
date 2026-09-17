import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseBbcode, parseMessageContent, canViewPrivateZone } from './bbcode-parser.js';

describe('Frontend BBCode & Message Parser', () => {
  describe('[hide] / [hide=Titre]', () => {
    it('doit parser un [hide] sans titre avec le titre par défaut', () => {
      const input = '<p>Avant [hide]Contenu secret[/hide] Après</p>';
      const result = parseBbcode(input);
      assert.ok(result.includes('<details class="hide-box'));
      assert.ok(result.includes('Texte masqué'));
      assert.ok(result.includes('Contenu secret'));
    });

    it('doit parser un [hide=Titre spécifique]', () => {
      const input = '<p>[hide=Indice secret]Regardez sous la table[/hide]</p>';
      const result = parseBbcode(input);
      assert.ok(result.includes('Indice secret'));
      assert.ok(result.includes('Regardez sous la table'));
    });

    it('doit gérer les balises [hide] imbriquées', () => {
      const input = '[hide=Niveau 1]Texte 1 [hide=Niveau 2]Texte 2[/hide][/hide]';
      const result = parseBbcode(input);
      assert.ok(result.includes('Niveau 1'));
      assert.ok(result.includes('Niveau 2'));
      assert.ok(result.includes('Texte 2'));
    });
  });

  describe('[pnj=...]', () => {
    it('doit générer un lien vers le PNJ avec data-pnj', () => {
      const input = 'Rencontrez [pnj=Eminence]Eminence[/pnj] au château.';
      const result = parseBbcode(input);
      assert.ok(result.includes('data-pnj="Eminence"'));
      assert.ok(result.includes('pnj-link'));
      assert.ok(result.includes('Eminence'));
    });

    it('doit supporter un libellé différent du nom du PNJ', () => {
      const input = 'Voir [pnj=123]Le vieux sage[/pnj].';
      const result = parseBbcode(input);
      assert.ok(result.includes('data-pnj="123"'));
      assert.ok(result.includes('Le vieux sage'));
    });
  });

  describe('[carte=...]', () => {
    it('doit générer un lien vers la carte avec son identifiant', () => {
      const input = 'Explorez [carte=1451]Carte de test[/carte] !';
      const result = parseBbcode(input, { campaignId: 42 });
      assert.ok(result.includes('carte-link'));
      assert.ok(result.includes('/campaigns/42/cartes/1451'));
      assert.ok(result.includes('Carte de test'));
    });

    it('génère un lien direct si campaignId absent', () => {
      const input = 'Voir [carte=999]La taverne[/carte]';
      const result = parseBbcode(input);
      assert.ok(result.includes('/cartes/999'));
      assert.ok(result.includes('La taverne'));
    });
  });

  describe('[private=...]', () => {
    it('permet la vue si l utilisateur est Admin', () => {
      const options = {
        currentUser: { id: 1, username: 'User1', isAdmin: true, profil: 1 },
      };
      assert.strictEqual(canViewPrivateZone('Gandalf', options), true);

      const input = '[private=Gandalf]Message secret pour Gandalf[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('private-box'));
      assert.ok(result.includes('Message secret pour Gandalf'));
    });

    it('permet la vue si l utilisateur est le MJ de la campagne', () => {
      const options = {
        currentUser: { id: 2, username: 'GameMaster' },
        isMj: true,
      };
      assert.strictEqual(canViewPrivateZone('Elfe', options), true);

      const input = '[private=Elfe]Secret elfique[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('Secret elfique'));
    });

    it('permet la vue si l utilisateur est l auteur du message', () => {
      const options = {
        currentUser: { id: 5, username: 'Auteur' },
        authorUserId: 5,
      };
      assert.strictEqual(canViewPrivateZone('Nain', options), true);

      const input = '[private=Nain]Secret nain[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('Secret nain'));
    });

    it('permet la vue si le nom de personnage correspond à l un des personnages de l utilisateur', () => {
      const options = {
        currentUser: { id: 10, username: 'Player1' },
        userCharacterNames: ['Aragorn', 'Strider'],
      };
      assert.strictEqual(canViewPrivateZone('Aragorn', options), true);
      assert.strictEqual(canViewPrivateZone('strider', options), true);
      assert.strictEqual(canViewPrivateZone('Legolas', options), false);

      const input = '[private=Aragorn]Message pour toi rôdeur[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('Message pour toi rôdeur'));
    });

    it('masque le contenu si l utilisateur n est pas autorisé', () => {
      const options = {
        currentUser: { id: 10, username: 'Player1' },
        userCharacterNames: ['Aragorn'],
      };
      const input = '[private=Legolas]Secret des elfes[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('private-box-hidden'));
      assert.ok(!result.includes('Secret des elfes'));
      assert.ok(result.includes('Legolas'));
    });

    it('gère les cibles multiples séparées par des virgules pour personnages et noms de joueurs', () => {
      const optionsPerso = {
        currentUser: { id: 10, username: 'Player1' },
        userCharacterNames: ['Gimli'],
      };
      assert.strictEqual(canViewPrivateZone('Legolas, Gimli, Boromir', optionsPerso), true);
      assert.strictEqual(canViewPrivateZone('Legolas, Boromir', optionsPerso), false);

      const optionsUsername = {
        currentUser: { id: 20, username: 'JeanValjean' },
        userCharacterNames: ['Cosette'],
      };
      assert.strictEqual(canViewPrivateZone('Legolas, JeanValjean', optionsUsername), true);
      assert.strictEqual(canViewPrivateZone('  legolas ,  jeanvaljean  ', optionsUsername), true);
      assert.strictEqual(canViewPrivateZone('Cosette, Javert', optionsUsername), true);
      assert.strictEqual(canViewPrivateZone('Marius, Javert', optionsUsername), false);
    });

    it('affiche le rendu avec toutes les cibles listées', () => {
      const options = {
        currentUser: { id: 10, username: 'Player1' },
        userCharacterNames: ['Gimli'],
      };
      const input = '[private=Legolas, Gimli, Jean]Plan d attaque secret[/private]';
      const result = parseBbcode(input, options);
      assert.ok(result.includes('private-box'));
      assert.ok(result.includes('Legolas, Gimli, Jean'));
      assert.ok(result.includes('Plan d attaque secret'));
    });
  });

  describe('parseMessageContent integration (BBCode + Dice)', () => {
    it('doit combiner les tags BBCode et les dés SVG', () => {
      const input = '<p>[hide=Jets]Voici mon jet : d20 ( 20 )[/hide] et [pnj=Eminence]Eminence[/pnj]</p>';
      const result = parseMessageContent(input);
      assert.ok(result.includes('hide-box'));
      assert.ok(result.includes('pnj-link'));
      assert.ok(result.includes('<svg'));
      assert.ok(result.includes('20'));
    });
  });
});
