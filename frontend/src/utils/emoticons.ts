export interface SmileyItem {
  emoji: string;
  name: string;
  keywords: string[];
}

export interface SmileyCategory {
  id: string;
  label: string;
  icon: string;
  items: SmileyItem[];
}

export const SMILEY_CATEGORIES: SmileyCategory[] = [
  {
    id: 'emotions',
    label: 'Smileys & Visages',
    icon: '😊',
    items: [
      { emoji: '😊', name: 'Sourire joyeux', keywords: ['sourire', 'content', 'happy', 'smile', ':)'] },
      { emoji: '😀', name: 'Grand sourire', keywords: ['sourire', 'joie', 'grin', ':D'] },
      { emoji: '😃', name: 'Visage ravi', keywords: ['heureux', 'joyeux', 'haha'] },
      { emoji: '😄', name: 'Sourire éclatant', keywords: ['rire', 'happy'] },
      { emoji: '😁', name: 'Sourire radieux', keywords: ['dent', 'fier'] },
      { emoji: '😆', name: 'Rire aux éclats', keywords: ['rire', 'mdr', 'xd', 'lol'] },
      { emoji: '😅', name: 'Sourire gêné', keywords: ['sueur', 'gêne', 'oups'] },
      { emoji: '😂', name: 'Pleurant de rire', keywords: ['mdr', 'ptdr', 'lmao', 'larmes'] },
      { emoji: '🤣', name: 'Mort de rire', keywords: ['rofl', 'mdr', 'sol'] },
      { emoji: '😉', name: 'Clin d\'œil', keywords: ['clin', 'wink', ';)'] },
      { emoji: '😌', name: 'Soulagé', keywords: ['zen', 'calme', 'repos'] },
      { emoji: '😍', name: 'Yeux en cœur', keywords: ['amour', 'love', 'aime'] },
      { emoji: '🥰', name: 'Amoureux', keywords: ['coeurs', 'affection'] },
      { emoji: '😘', name: 'Bisou', keywords: ['bise', 'kiss', ':*'] },
      { emoji: '😋', name: 'Gourmand', keywords: ['miam', 'langue', 'bon'] },
      { emoji: '😛', name: 'Tire la langue', keywords: ['blague', 'farce', ':p', ':P'] },
      { emoji: '😜', name: 'Clin d\'œil langue', keywords: ['fou', 'blague', ';p', ';P'] },
      { emoji: '🤪', name: 'Complètement fou', keywords: ['dingue', 'zany'] },
      { emoji: '😎', name: 'Lunettes de soleil', keywords: ['cool', 'classe', '8)', 'B)'] },
      { emoji: '🤩', name: 'Étoiles plein les yeux', keywords: ['star', 'fan', 'incroyable'] },
      { emoji: '🥳', name: 'Fête', keywords: ['party', 'anniversaire', 'youpi'] },
      { emoji: '😏', name: 'Sourire en coin', keywords: ['malicieux', 'smirk'] },
      { emoji: '😒', name: 'Blasé', keywords: ['dégoût', 'lassé', 'unimpressed'] },
      { emoji: '🙄', name: 'Lève les yeux', keywords: ['yeux', 'agacé', 'pfff'] },
      { emoji: '🤔', name: 'Pensif', keywords: ['réflexion', 'hmm', 'doute'] },
      { emoji: '🤫', name: 'Chut', keywords: ['secret', 'silence', 'discret'] },
      { emoji: '🤭', name: 'Oups', keywords: ['gêne', 'oups', 'rire'] },
      { emoji: '🤐', name: 'Bouche cousue', keywords: ['secret', 'silence', 'zip'] },
      { emoji: '🤨', name: 'Sourcil levé', keywords: ['suspicieux', 'sceptique'] },
      { emoji: '😐', name: 'Neutre', keywords: ['neutre', 'bof', ':|'] },
      { emoji: '😑', name: 'Sans expression', keywords: ['fatigue', '-_-'] },
      { emoji: '😶', name: 'Sans bouche', keywords: ['muet', 'sans voix'] },
      { emoji: '😴', name: 'Endormi', keywords: ['dort', 'zzz', 'sommeil'] },
      { emoji: '🤤', name: 'Bave', keywords: ['envie', 'faim'] },
      { emoji: '😷', name: 'Masque', keywords: ['malade', 'soin'] },
      { emoji: '🤒', name: 'Fièvre', keywords: ['thermomètre', 'malade'] },
      { emoji: '🤕', name: 'Blessé', keywords: ['bandage', 'blessure', 'aïe'] },
      { emoji: '🤢', name: 'Nausée', keywords: ['degout', 'mal'] },
      { emoji: '🤮', name: 'Vomi', keywords: ['degoutant', 'beurk'] },
      { emoji: '🥵', name: 'Chaud', keywords: ['brûlant', 'canicule'] },
      { emoji: '🥶', name: 'Gelé', keywords: ['froid', 'glace'] },
      { emoji: '🤯', name: 'Tête qui explose', keywords: ['mindblown', 'choc'] },
      { emoji: '🤠', name: 'Cowboy', keywords: ['chapeau', 'aventure'] },
      { emoji: '😇', name: 'Ange', keywords: ['auréole', 'sage', 'innocent'] },
      { emoji: '😈', name: 'Diablotin souriant', keywords: ['diable', 'malin', 'décret'] },
      { emoji: '👿', name: 'Diablotin fâché', keywords: ['démon', 'méchant'] },
      { emoji: '🤡', name: 'Clown', keywords: ['cirque', 'blague'] },
      { emoji: '💩', name: 'Crotte', keywords: ['poop', 'caca'] },
      { emoji: '👻', name: 'Fantôme', keywords: ['fantome', 'spectral', 'boo'] },
      { emoji: '💀', name: 'Crâne', keywords: ['mort', 'skull', 'squelette'] },
      { emoji: '☠️', name: 'Tête de mort', keywords: ['danger', 'pirate', 'poison'] },
      { emoji: '👽', name: 'Alien', keywords: ['extraterrestre', 'ovni'] },
      { emoji: '🤖', name: 'Robot', keywords: ['androide', 'technologie'] },
      { emoji: '🥺', name: 'Regard suppliant', keywords: ['pitié', 'stp', 'triste'] },
      { emoji: '😢', name: 'Larme', keywords: ['triste', 'pleure', ":'("] },
      { emoji: '😭', name: 'Pleurs abondants', keywords: ['larmes', 'sanglots', 'tristesse'] },
      { emoji: '😱', name: 'Hurlement d\'effroi', keywords: ['peur', 'effroi', 'choc', ':o', ':O'] },
      { emoji: '😠', name: 'En colère', keywords: ['fâché', 'enerve', 'grr'] },
      { emoji: '😡', name: 'Rage', keywords: ['furieux', 'colère'] },
      { emoji: '🤬', name: 'Jurons', keywords: ['insulte', 'colère', 'rage'] },
    ],
  },
  {
    id: 'rpg_fantasy',
    label: 'JDR & Fantastique',
    icon: '🎲',
    items: [
      { emoji: '🎲', name: 'Dé à jouer', keywords: ['de', 'dice', 'jdr', 'critique', 'jet'] },
      { emoji: '⚔️', name: 'Épées croisées', keywords: ['epee', 'combat', 'bataille', 'duel'] },
      { emoji: '🗡️', name: 'Dague', keywords: ['couteau', 'assassin', 'larcin'] },
      { emoji: '🛡️', name: 'Bouclier', keywords: ['defense', 'protection', 'garde'] },
      { emoji: '🏹', name: 'Arc et flèche', keywords: ['arc', 'archer', 'tir'] },
      { emoji: '🪄', name: 'Baguette magique', keywords: ['magie', 'sort', 'magicien'] },
      { emoji: '🔮', name: 'Boule de cristal', keywords: ['divination', 'oracle', 'futur'] },
      { emoji: '📜', name: 'Parchemin', keywords: ['parchemin', 'carte', 'quete', 'lettre'] },
      { emoji: '📖', name: 'Livre de sorts', keywords: ['grimoire', 'livre', 'savoir'] },
      { emoji: '🗺️', name: 'Carte du monde', keywords: ['carte', 'map', 'exploration', 'monde'] },
      { emoji: '🕯️', name: 'Bougie', keywords: ['lumiere', 'donjon', 'sombre'] },
      { emoji: '🗝️', name: 'Vieille clé', keywords: ['cle', 'coffre', 'porte', 'secret'] },
      { emoji: '💰', name: 'Sac d\'or', keywords: ['or', 'tresor', 'butin', 'argent'] },
      { emoji: '🪙', name: 'Pièce de monnaie', keywords: ['piece', 'gold', 'monnaie'] },
      { emoji: '💎', name: 'Pierre précieuse', keywords: ['gemme', 'diamant', 'cristal'] },
      { emoji: '👑', name: 'Couronne', keywords: ['roi', 'reine', 'royauté', 'chef'] },
      { emoji: '🏰', name: 'Château fort', keywords: ['chateau', 'forteresse', 'donjon'] },
      { emoji: '⛺', name: 'Campement', keywords: ['bivouac', 'repos', 'tente'] },
      { emoji: '🍺', name: 'Chope de bière', keywords: ['taverne', 'biere', 'auberge', 'boire'] },
      { emoji: '🍗', name: 'Cuisse de poulet', keywords: ['festin', 'nourriture', 'manger'] },
      { emoji: '🥩', name: 'Viande', keywords: ['chasse', 'repas'] },
      { emoji: '🧪', name: 'Potion / Fiole', keywords: ['potion', 'alchimie', 'soin', 'mana'] },
      { emoji: '⚗️', name: 'Alambic', keywords: ['alchimie', 'laboratoire'] },
      { emoji: '🩸', name: 'Goutte de sang', keywords: ['sang', 'degats', 'pv', 'blessure'] },
      { emoji: '🔥', name: 'Flamme / Feu', keywords: ['feu', 'bouledefeu', 'flamme', 'degat'] },
      { emoji: '⚡', name: 'Éclair', keywords: ['foudre', 'magie', 'tonnerre', 'electricite'] },
      { emoji: '❄️', name: 'Flocon / Givre', keywords: ['froid', 'glace', 'gel'] },
      { emoji: '💥', name: 'Explosion', keywords: ['boom', 'critique', 'impact'] },
      { emoji: '✨', name: 'Étincelles / Magie', keywords: ['magique', 'brillance', 'etoiles'] },
      { emoji: '🧙', name: 'Mage', keywords: ['magicien', 'sorcier', 'enchanteur'] },
      { emoji: '🧙‍♂️', name: 'Sorcier', keywords: ['magicien', 'mage'] },
      { emoji: '🧙‍♀️', name: 'Sorcière', keywords: ['magicienne', 'ensorceleuse'] },
      { emoji: '🧝', name: 'Elfe', keywords: ['elfe', 'rodeur', 'archer'] },
      { emoji: '🧝‍♂️', name: 'Elfe mâle', keywords: ['elfe', 'nature'] },
      { emoji: '🧝‍♀️', name: 'Elfe femelle', keywords: ['elfe', 'nature'] },
      { emoji: '🧛', name: 'Vampire', keywords: ['vampire', 'sang', 'nuit'] },
      { emoji: '🧟', name: 'Zombie', keywords: ['mortvivant', 'zombie', 'monstre'] },
      { emoji: '🧞', name: 'Génie', keywords: ['genie', 'voeux'] },
      { emoji: '🧚', name: 'Fée', keywords: ['fee', 'pixie', 'esprit'] },
      { emoji: '🐉', name: 'Dragon', keywords: ['dragon', 'boss', 'monstre', 'wyrm'] },
      { emoji: '🐲', name: 'Tête de dragon', keywords: ['dragon', 'reptile'] },
      { emoji: '🐺', name: 'Loup', keywords: ['loup', 'foret', 'bête'] },
      { emoji: '🦁', name: 'Lion', keywords: ['fauve', 'bête'] },
      { emoji: '🦅', name: 'Aigle', keywords: ['aigle', 'rapace', 'vol'] },
      { emoji: '🦉', name: 'Chouette / Hibou', keywords: ['hibou', 'chouette', 'familier', 'sagesse'] },
      { emoji: '🦇', name: 'Chauve-souris', keywords: ['grotte', 'donjon', 'nuit'] },
      { emoji: '🕷️', name: 'Araignée', keywords: ['araignee', 'venin', 'donjon'] },
      { emoji: '🐍', name: 'Serpent', keywords: ['serpent', 'poison', 'reptile'] },
      { emoji: '🐎', name: 'Cheval / Monture', keywords: ['cheval', 'monture', 'voyage'] },
    ],
  },
  {
    id: 'gestures',
    label: 'Gestes & Mains',
    icon: '👍',
    items: [
      { emoji: '👍', name: 'Pouce levé', keywords: ['pouce', 'ok', 'valide', '+1', 'bien'] },
      { emoji: '👎', name: 'Pouce baissé', keywords: ['pouce', 'non', 'refus', '-1', 'nul'] },
      { emoji: '👏', name: 'Applaudissements', keywords: ['bravo', 'clap', 'felicitations'] },
      { emoji: '🙌', name: 'Mains en l\'air', keywords: ['celebration', 'joie', 'victoire'] },
      { emoji: '🤝', name: 'Poignée de main', keywords: ['accord', 'pacte', 'alliance'] },
      { emoji: '👊', name: 'Coup de poing', keywords: ['punch', 'fist', 'frère'] },
      { emoji: '✊', name: 'Poing levé', keywords: ['force', 'courage'] },
      { emoji: '🤛', name: 'Poing gauche', keywords: ['fistbump'] },
      { emoji: '🤜', name: 'Poing droit', keywords: ['fistbump'] },
      { emoji: '✌️', name: 'Signe de la paix / Victoire', keywords: ['victoire', 'peace', 'v'] },
      { emoji: '🤞', name: 'Doigts croisés', keywords: ['chance', 'espoir', 'croise'] },
      { emoji: '🤟', name: 'Signe d\'amour', keywords: ['rock', 'love'] },
      { emoji: '🤘', name: 'Cornes du rock', keywords: ['rock', 'metal'] },
      { emoji: '🤙', name: 'Signe appel', keywords: ['shaka', 'cool'] },
      { emoji: '👈', name: 'Pointe à gauche', keywords: ['gauche', 'regarde'] },
      { emoji: '👉', name: 'Pointe à droite', keywords: ['droite', 'regarde'] },
      { emoji: '👆', name: 'Pointe en haut', keywords: ['haut', 'regarde'] },
      { emoji: '👇', name: 'Pointe en bas', keywords: ['bas', 'ici'] },
      { emoji: '✋', name: 'Main levée / Stop', keywords: ['stop', 'pause', 'attention'] },
      { emoji: '👋', name: 'Coucou / Au revoir', keywords: ['salut', 'coucou', 'bye', 'bonjour'] },
      { emoji: '🙏', name: 'Mains jointes', keywords: ['priere', 'merci', 'supplication', 'svp'] },
      { emoji: '💪', name: 'Muscle / Force', keywords: ['force', 'puissance', 'fort', 'constitution'] },
    ],
  },
  {
    id: 'symbols',
    label: 'Symboles & Cœurs',
    icon: '❤️',
    items: [
      { emoji: '❤️', name: 'Cœur rouge', keywords: ['coeur', 'amour', 'love', '<3'] },
      { emoji: '🧡', name: 'Cœur orange', keywords: ['coeur'] },
      { emoji: '💛', name: 'Cœur jaune', keywords: ['coeur'] },
      { emoji: '💚', name: 'Cœur vert', keywords: ['coeur'] },
      { emoji: '💙', name: 'Cœur bleu', keywords: ['coeur'] },
      { emoji: '💜', name: 'Cœur violet', keywords: ['coeur'] },
      { emoji: '🖤', name: 'Cœur noir', keywords: ['coeur', 'sombre'] },
      { emoji: '🤍', name: 'Cœur blanc', keywords: ['coeur'] },
      { emoji: '💔', name: 'Cœur brisé', keywords: ['coeur', 'triste', 'rupture'] },
      { emoji: '💖', name: 'Cœur étincelant', keywords: ['coeur', 'magique'] },
      { emoji: '🔥', name: 'Feu', keywords: ['flamme', 'chaud', 'fire'] },
      { emoji: '⭐', name: 'Étoile', keywords: ['star', 'etoile'] },
      { emoji: '🌟', name: 'Étoile brillante', keywords: ['etoile', 'succes'] },
      { emoji: '💯', name: 'Cent pour cent', keywords: ['100', 'parfait', 'total'] },
      { emoji: '⚠️', name: 'Avertissement', keywords: ['danger', 'warning', 'attention'] },
      { emoji: '⛔', name: 'Interdit', keywords: ['stop', 'bloque'] },
      { emoji: '❓', name: 'Point d\'interrogation', keywords: ['question', 'aide', '?'] },
      { emoji: '❗', name: 'Point d\'exclamation', keywords: ['exclamation', 'urgent', '!'] },
      { emoji: '💬', name: 'Bulle de parole', keywords: ['discussion', 'chat', 'message'] },
      { emoji: '💭', name: 'Bulle de pensée', keywords: ['pensee', 'reve'] },
      { emoji: '🏆', name: 'Trophée', keywords: ['victoire', 'gagne', 'succes'] },
      { emoji: '🎯', name: 'Cible', keywords: ['reussite', 'critique', 'vise'] },
    ],
  },
];

/**
 * Text shortcuts that can be auto-converted to emojis
 */
export const EMOTICON_MAP: Record<string, string> = {
  ':)': '😊',
  ':-)': '😊',
  ':-]': '😊',
  '=)': '😊',
  ':D': '😃',
  ':-D': '😃',
  ':d': '😃',
  ':-d': '😃',
  ';)': '😉',
  ';-)': '😉',
  ':P': '😛',
  ':-P': '😛',
  ':p': '😛',
  ':-p': '😛',
  ':(': '🙁',
  ':-(': '🙁',
  ':[': '🙁',
  ':-[': '🙁',
  ":'(": '😢',
  ":'-(": '😢',
  ':O': '😮',
  ':-O': '😮',
  ':o': '😮',
  ':-o': '😮',
  ':0': '😮',
  '<3': '❤️',
  '</3': '💔',
  'xD': '😆',
  'XD': '😆',
  'xd': '😆',
  ':*': '😘',
  ':-*': '😘',
  '8)': '😎',
  '8-)': '😎',
  'B)': '😎',
  'B-)': '😎',
  ':|': '😐',
  ':-|': '😐',
  '-_-': '😑',
  '^^': '😊',
  '^_^': '😊',
  '(y)': '👍',
  '(Y)': '👍',
  '(n)': '👎',
  '(N)': '👎',
  ':+1:': '👍',
  ':-1:': '👎',
  ':poop:': '💩',
  ':fire:': '🔥',
  ':dice:': '🎲',
  ':de:': '🎲',
  ':dé:': '🎲',
  ':sword:': '⚔️',
  ':shield:': '🛡️',
  ':skull:': '💀',
  ':clap:': '👏',
  ':pray:': '🙏',
  ':heart:': '❤️',
  ':star:': '⭐',
  ':beer:': '🍺',
  ':magic:': '✨',
  ':dragon:': '🐉',
  ':wizard:': '🧙',
};

// Sort triggers by length descending to match longest first (e.g., ":-D" before ":D")
const SORTED_EMOTICONS = Object.entries(EMOTICON_MAP).sort(
  (a, b) => b[0].length - a[0].length
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace text smileys with Unicode emojis.
 * Matches shortcuts at word boundaries or delimited by whitespace / start / end of string.
 */
export function replaceEmoticons(text: string): string {
  if (!text) return text;
  let result = text;

  for (const [shortcut, emoji] of SORTED_EMOTICONS) {
    const escaped = escapeRegex(shortcut);
    // Shortcut should be surrounded by start/end of string, whitespace, or punctuation
    const regex = new RegExp(`(^|\\s)${escaped}($|\\s|[.,!?;:])`, 'g');
    result = result.replace(regex, (_match, before, after) => `${before}${emoji}${after}`);
  }

  return result;
}

/**
 * Live replacement for when typing: converts shortcuts when followed by a space, punctuation, or trigger
 */
export function convertEmoticonsOnType(text: string): { text: string; hasChanged: boolean } {
  const converted = replaceEmoticons(text);
  return {
    text: converted,
    hasChanged: converted !== text,
  };
}
