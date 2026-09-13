-- Données de test initiales pour le développement de JdRoll 2.0

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
    `id`, `user_id`, `campagne_id`, `name`, `concept`, `avatar`, `publicDescription`, `privateDescription`, `technical`, `statut`
) VALUES
(1, 2, 1, 'Kaelen l''Erudit', 'Mage de bataille', '', 'Un jeune érudit curieux mais prudent.', '', '', 0),
(2, 1, 3, 'Vex Netrunner', 'Spécialiste intrusion matricielle', '', 'Solitaire adepte des connexions neurales.', '', '', 0),
(3, 1, 4, 'Professeur Armitage', 'Enquêteur universitaire', '', 'Spécialiste des langues occultes anciennes.', '', '', 0);
