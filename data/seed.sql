-- Données de test initiales pour le développement de JdRoll 2.0

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Comptes utilisateurs de test :
-- Mot de passe pour tous les utilisateurs de test : "password"
-- Hash MD5 de "password" : 5f4dcc3b5aa765d61d8327deb882cf99

INSERT INTO `user` (
    `id`, `username`, `password`, `mail`, `avatar`, `description`, `profil`,
    `subscribe_date`, `titre`, `notif_mp`, `notif_inscription`, `notif_perso`,
    `notif_message`, `mail_mp`, `mail_inscription`, `mail_perso`, `mail_message`,
    `notif_dice`, `mail_dice`
) VALUES
(1, 'admin', '5f4dcc3b5aa765d61d8327deb882cf99', 'admin@example.com', '', 'Administrateur et Maître du Jeu de test', 1, NOW(), 'Maître du Donjon', 1, 1, 1, 1, 0, 0, 0, 0, 1, 0),
(2, 'testuser', '5f4dcc3b5aa765d61d8327deb882cf99', 'test@example.com', '', 'Joueur de test pour le développement local', 0, NOW(), 'Aventurier Novice', 1, 1, 1, 1, 0, 0, 0, 0, 1, 0),
(3, 'joueur2', '5f4dcc3b5aa765d61d8327deb882cf99', 'joueur2@example.com', '', 'Deuxième compte joueur de test', 0, NOW(), 'Compagnon de route', 1, 1, 1, 1, 0, 0, 0, 0, 1, 0);

-- Insertion de la version initiale
INSERT INTO `version` (`id`, `install_date`) VALUES (1, NOW());

-- Campagnes de test
INSERT INTO `campagne` (
    `id`, `mj_id`, `nb_joueurs`, `nb_joueurs_actuel`, `name`, `banniere`,
    `systeme`, `univers`, `description`, `statut`, `is_recrutement_open`, `rythme`, `rp`, `is_admin_open`
) VALUES
(1, 1, 4, 2, 'La Malédiction de Strahd', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', 'D&D 5e', 'Ravenloft (Gothique)', '<p>Une aventure d''épouvante au cœur des brumes de Barovie sous la coupe du seigneur vampire Strahd von Zarovich.</p>', 0, 1, 2, 1, 1),
(2, 1, 5, 4, 'Les Secrets de la Cité Franche', '', 'Chroniques Oubliées', 'Médiéval Fantastique', '<p>Campagne de découverte et d''intrigues politiques dans une grande métropole marchande.</p>', 2, 0, 1, 1, 1),
(3, 2, 4, 3, 'Cyberpunk 2077: Néons Noirs', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80', 'Cyberpunk RED', 'Night City', '<p>Contrats sombres, corpos impitoyables et survie dans les bas-fonds de Night City.</p>', 0, 1, 3, 2, 1),
(4, 3, 3, 2, 'L''Appel de Cthulhu: Ombres sur Arkham', 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80', 'Cthulhu V7', 'Années 1920', '<p>Des disparitions suspectes secouent l''Université Miskatonic et révèlent des cultes impies.</p>', 0, 0, 2, 1, 1),
(5, 2, 3, 2, 'Space Opera: Aux confins de l''Empire', '', 'Stars Without Number', 'Science-Fiction', '<p>Exploration spatiale à bord d''un vieux cargo à la recherche de reliques extraterrestres.</p>', 2, 0, 2, 1, 1);

-- Participants aux campagnes de test
INSERT INTO `campagne_participant` (`campagne_id`, `user_id`, `statut`) VALUES
(1, 2, 1),
(1, 3, 1),
(2, 2, 1),
(3, 1, 1),
(3, 3, 1),
(4, 1, 1),
(4, 2, 1),
(5, 1, 1);

-- Personnages de test associés
INSERT INTO `personnages` (
    `id`, `user_id`, `campagne_id`, `name`, `concept`, `avatar`, `publicDescription`, `privateDescription`, `technical`, `statut`, `widgets`
) VALUES
(1, 2, 1, 'Kaelen l''Erudit', 'Mage de bataille', '', 'Un jeune érudit curieux mais prudent.', '', '', 0, '[]'),
(2, 1, 3, 'Vex Netrunner', 'Spécialiste intrusion matricielle', '', 'Solitaire adepte des connexions neurales.', '', '', 0, '[]'),
(3, 1, 4, 'Professeur Armitage', 'Enquêteur universitaire', '', 'Spécialiste des langues occultes anciennes.', '', '', 0, '[]');

-- Sections de forum de test pour la campagne 1 (La Malédiction de Strahd)
INSERT INTO `sections` (`id`, `campagne_id`, `title`, `ordre`, `default_collapse`, `banniere`) VALUES
(1, 1, 'HRP & Informations de table', 1, 0, ''),
(2, 1, 'Actes de jeu (RP)', 2, 0, ''),
(3, 1, 'Archives du voyage', 3, 1, ''),
(10, NULL, 'Taverne & Annonces', 1, 0, ''),
(11, NULL, 'Discussions Générales & JDR', 2, 0, '');

-- Topics de test
INSERT INTO `topics` (`id`, `section_id`, `last_post_id`, `title`, `stickable`, `is_private`, `ordre`, `is_closed`) VALUES
(1, 1, 2, 'Règles de vie et rythme des réponses', 1, 0, 1, 0),
(2, 1, 3, 'Questions / Réponses HRP et discussions', 0, 0, 2, 0),
(3, 2, 18, 'Chapitre 1 : L''Auberge des Terres Perdues', 1, 0, 1, 0),
(4, 2, 6, 'Chapitre 2 : La Caravane vers les Brumes', 0, 0, 2, 0),
(5, 3, 7, 'Prologue : La lettre du bourgmestre (Terminé)', 0, 0, 1, 1),
(10, 10, 19, 'Bienvenue sur le forum JdRoll 2.0 !', 1, 0, 1, 0),
(11, 10, 21, 'Présentation des rôlistes de la communauté', 0, 0, 2, 0),
(12, 11, 22, 'Vos systèmes et univers de jeu favoris', 0, 0, 1, 0);

-- Messages (posts) de test
INSERT INTO `posts` (`id`, `topic_id`, `user_id`, `perso_id`, `content`, `create_date`, `editor`) VALUES
(1, 1, 1, NULL, '<p>Bienvenue à tous sur la campagne ! Merci de respecter un rythme de 2 à 3 messages par semaine.</p>', '2026-09-10 10:00:00', 0),
(2, 1, 2, NULL, '<p>C''est bien noté, très motivé pour cette aventure !</p>', '2026-09-10 11:30:00', 0),
(3, 2, 3, NULL, '<p>Bonjour tout le monde ! Est-ce qu''on commence directement au niveau 3 ?</p>', '2026-09-11 14:15:00', 0),
(4, 3, 1, NULL, '<p>La pluie frappe les vitres de la vieille auberge alors que la nuit tombe sur le village...</p>', '2026-09-12 09:00:00', 0),
(5, 3, 2, 1, '<p>Kaelen resserre sa cape trempée et s''approche de la cheminée en observant la pièce du coin de l''œil.</p>', '2026-09-12 09:30:00', 0),
(6, 4, 1, NULL, '<p>Au petit matin, les roues des chariots grincent sur le chemin brumeux menant vers la passe montagneuse.</p>', '2026-09-13 15:20:00', 0),
(7, 5, 1, NULL, '<p>Extrait du journal de voyage : lettre scellée aux armoiries de Barovie.</p>', '2026-09-08 08:00:00', 0),
(8, 3, 1, NULL, '<p>L''aubergiste essuie une chope d''un air soucieux en voyant les voyageurs s''installer.</p>', '2026-09-12 10:00:00', 0),
(9, 3, 3, NULL, '<p>Une silhouette drapée de noir entre soudainement dans l''établissement, attirant tous les regards.</p>', '2026-09-12 11:15:00', 0),
(10, 3, 2, 1, '<p>Kaelen pose doucement sa main sur la garde de sa dague sous sa robe de mage.</p>', '2026-09-12 12:00:00', 0),
(11, 3, 1, NULL, '<p>L''homme encapuchonné dépose une bourse lourde sur le comptoir sans dire un mot.</p>', '2026-09-12 14:30:00', 0),
(12, 3, 3, NULL, '<p>Le silence se fait pesant dans toute la salle commune.</p>', '2026-09-12 15:00:00', 0),
(13, 3, 1, NULL, '<p>Un grondement de tonnerre retentit à l''extérieur, faisant vaciller les flammes des chandeliers.</p>', '2026-09-12 16:45:00', 0),
(14, 3, 2, 1, '<p>Kaelen murmure une prière de protection tout en préparant mentalement un sort de lumière.</p>', '2026-09-12 17:20:00', 0),
(15, 3, 1, NULL, '<p>L''inconnu relève la tête, dévoilant un regard perçant et des yeux dorés inhabituels.</p>', '2026-09-12 18:00:00', 0),
(16, 3, 3, NULL, '<p>— Je cherche des aventuriers courageux pour une mission au-delà du défilé, lance-t-il d''une voix rauque.</p>', '2026-09-12 18:30:00', 0),
(17, 3, 1, NULL, '<p>Les quelques villageois présents quittent précipitamment leurs tables pour regagner leurs chambres.</p>', '2026-09-12 19:10:00', 0),
(18, 3, 2, 1, '<p>Kaelen prend la parole : « Tout dépend de la mission, de la récompense et du danger qui nous attend. »</p>', '2026-09-12 20:00:00', 0),
(19, 10, 1, NULL, '<p>Bienvenue à toutes et à tous sur le nouveau forum général de JdRoll ! N''hésitez pas à échanger et poser vos questions.</p>', '2026-09-13 10:00:00', 0),
(20, 11, 2, NULL, '<p>Bonjour la taverne ! Rôliste depuis plus de 10 ans, adepte de D&D, Cthulhu et Cyberpunk.</p>', '2026-09-13 11:00:00', 0),
(21, 11, 3, NULL, '<p>Ravi de rejoindre la communauté ! Prêt pour de nouvelles aventures.</p>', '2026-09-13 11:30:00', 0),
(22, 12, 1, NULL, '<p>Quels sont vos univers favoris pour jouer sur table ou en ligne ?</p>', '2026-09-13 12:00:00', 0);

-- Suivi des lectures de topics (read_post)
INSERT INTO `read_post` (`topic_id`, `user_id`, `post_id`) VALUES
(1, 2, 2),
(3, 2, 8),
(5, 2, 7),
(10, 2, 19);

SET FOREIGN_KEY_CHECKS = 1;
