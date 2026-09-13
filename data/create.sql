-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Hôte : jdrolldb:3306
-- Généré le : dim. 13 sep. 2026 à 18:03
-- Version du serveur : 5.7.38
-- Version de PHP : 8.0.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `jdroll`
--

-- --------------------------------------------------------

--
-- Structure de la table `absences`
--

CREATE TABLE `absences` (
                            `user_id` int(11) NOT NULL,
                            `begin_date` date DEFAULT NULL,
                            `end_date` date DEFAULT NULL,
                            `id` int(11) NOT NULL,
                            `commentaire` varchar(200) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `alert`
--

CREATE TABLE `alert` (
                         `campagne_id` int(11) NOT NULL,
                         `joueur_id` bigint(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `annonce`
--

CREATE TABLE `annonce` (
                           `id` int(10) UNSIGNED NOT NULL,
                           `title` varchar(500) NOT NULL,
                           `content` text NOT NULL,
                           `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                           `end_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `campagne`
--

CREATE TABLE `campagne` (
                            `id` int(10) UNSIGNED NOT NULL,
                            `mj_id` int(10) UNSIGNED NOT NULL,
                            `nb_joueurs` int(10) UNSIGNED NOT NULL,
                            `nb_joueurs_actuel` int(10) UNSIGNED NOT NULL DEFAULT '0',
                            `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
                            `banniere` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                            `systeme` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
                            `univers` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
                            `description` longtext COLLATE utf8_unicode_ci NOT NULL,
                            `statut` int(10) UNSIGNED NOT NULL DEFAULT '0',
                            `is_recrutement_open` int(1) NOT NULL DEFAULT '1',
                            `rythme` int(1) DEFAULT '2',
                            `rp` int(1) DEFAULT '1',
                            `is_admin_open` int(1) DEFAULT '1',
                            `is_multi_character` int(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `campagne_config`
--

CREATE TABLE `campagne_config` (
                                   `campagne_id` int(11) NOT NULL,
                                   `banniere` varchar(500) DEFAULT NULL,
                                   `hr` varchar(500) DEFAULT NULL,
                                   `odd_line_color` varchar(10) DEFAULT NULL,
                                   `even_line_color` varchar(10) DEFAULT NULL,
                                   `sidebar_color` varchar(10) DEFAULT NULL,
                                   `link_color` varchar(10) DEFAULT NULL,
                                   `template` longtext NOT NULL,
                                   `sidebar_text` text NOT NULL,
                                   `link_sidebar_color` varchar(8) NOT NULL,
                                   `template_html` longtext,
                                   `template_img` longtext,
                                   `template_fields` longtext,
                                   `text_color` varchar(10) DEFAULT NULL,
                                   `default_perso_id` bigint(20) DEFAULT NULL,
                                   `dialogue_color` varchar(10) DEFAULT NULL,
                                   `pensee_color` varchar(10) DEFAULT NULL,
                                   `rp1_color` varchar(10) DEFAULT NULL,
                                   `rp2_color` varchar(10) DEFAULT NULL,
                                   `quote_color` varchar(10) DEFAULT NULL,
                                   `width` varchar(8) DEFAULT '800px',
                                   `widgets` mediumtext NOT NULL,
                                   `default_dice` varchar(50) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `campagne_favoris`
--

CREATE TABLE `campagne_favoris` (
                                    `campagne_id` int(10) UNSIGNED NOT NULL,
                                    `user_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `campagne_participant`
--

CREATE TABLE `campagne_participant` (
                                        `campagne_id` int(10) UNSIGNED NOT NULL,
                                        `user_id` int(10) UNSIGNED NOT NULL,
                                        `statut` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `can_read`
--

CREATE TABLE `can_read` (
                            `user_id` int(11) NOT NULL,
                            `topic_id` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `carte`
--

CREATE TABLE `carte` (
                         `id` int(11) NOT NULL,
                         `campagne_id` int(11) DEFAULT NULL,
                         `name` varchar(45) DEFAULT NULL,
                         `description` text,
                         `image` text,
                         `published` tinyint(1) DEFAULT '1',
                         `config` longtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `chat`
--

CREATE TABLE `chat` (
                        `id` int(11) NOT NULL,
                        `username` varchar(200) DEFAULT NULL,
                        `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                        `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci,
                        `to` varchar(200) DEFAULT '',
                        `to_username` varchar(200) DEFAULT ''
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `chat_actions`
--

CREATE TABLE `chat_actions` (
                                `id` int(11) NOT NULL,
                                `actionType` int(11) NOT NULL,
                                `messageId` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `dicer`
--

CREATE TABLE `dicer` (
                         `id` int(10) UNSIGNED NOT NULL,
                         `user_id` int(10) UNSIGNED NOT NULL,
                         `campagne_id` int(10) UNSIGNED NOT NULL,
                         `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         `result` varchar(500) DEFAULT NULL,
                         `description` varchar(900) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `draft`
--

CREATE TABLE `draft` (
                         `id` int(10) UNSIGNED NOT NULL,
                         `topic_id` int(10) UNSIGNED NOT NULL,
                         `user_id` int(10) UNSIGNED DEFAULT NULL,
                         `perso_id` int(10) UNSIGNED DEFAULT NULL,
                         `content` longtext COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `feedback`
--

CREATE TABLE `feedback` (
                            `id` int(10) UNSIGNED NOT NULL,
                            `title` varchar(500) NOT NULL,
                            `content` text NOT NULL,
                            `vote` int(11) DEFAULT '0',
                            `user_id` bigint(20) NOT NULL,
                            `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            `closed` int(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `feedback_comment`
--

CREATE TABLE `feedback_comment` (
                                    `id` int(10) UNSIGNED NOT NULL,
                                    `content` text NOT NULL,
                                    `user_id` bigint(20) NOT NULL,
                                    `feedback_id` int(10) NOT NULL,
                                    `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `feedback_vote`
--

CREATE TABLE `feedback_vote` (
                                 `id` int(10) UNSIGNED NOT NULL,
                                 `user_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `last_action`
--

CREATE TABLE `last_action` (
                               `user_id` int(11) NOT NULL,
                               `time` timestamp NULL DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `messages`
--

CREATE TABLE `messages` (
                            `id` int(11) NOT NULL,
                            `from_id` int(11) NOT NULL,
                            `from_username` varchar(200) NOT NULL,
                            `title` varchar(200) NOT NULL,
                            `content` text NOT NULL,
                            `time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                            `statut` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `messages_to`
--

CREATE TABLE `messages_to` (
                               `id_message` int(11) NOT NULL,
                               `to_id` int(11) NOT NULL,
                               `to_username` varchar(200) NOT NULL,
                               `statut` int(11) DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `note`
--

CREATE TABLE `note` (
                        `id` bigint(20) NOT NULL,
                        `campagne_id` bigint(20) NOT NULL,
                        `user_id` bigint(20) NOT NULL,
                        `content` longtext NOT NULL,
                        `last_update` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `notif`
--

CREATE TABLE `notif` (
                         `user_id` bigint(20) NOT NULL,
                         `title` varchar(500) NOT NULL,
                         `content` text NOT NULL,
                         `id` int(11) NOT NULL,
                         `url` varchar(500) DEFAULT NULL,
                         `type` varchar(10) DEFAULT NULL,
                         `target_id` bigint(20) DEFAULT NULL,
                         `nb` int(10) DEFAULT '1',
                         `last_update` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `personnages`
--

CREATE TABLE `personnages` (
                               `id` int(10) UNSIGNED NOT NULL,
                               `user_id` int(10) UNSIGNED DEFAULT NULL,
                               `campagne_id` int(10) UNSIGNED NOT NULL,
                               `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                               `concept` varchar(200) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                               `avatar` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                               `publicDescription` longtext COLLATE utf8_unicode_ci NOT NULL,
                               `privateDescription` longtext COLLATE utf8_unicode_ci NOT NULL,
                               `technical` longtext COLLATE utf8_unicode_ci NOT NULL,
                               `statut` int(11) NOT NULL DEFAULT '0',
                               `cat_id` int(11) DEFAULT NULL,
                               `perso_fields` longtext COLLATE utf8_unicode_ci,
                               `widgets` mediumtext COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `pnj_category`
--

CREATE TABLE `pnj_category` (
                                `id` int(11) NOT NULL,
                                `campagne_id` int(11) NOT NULL,
                                `name` varchar(200) NOT NULL,
                                `default_collapse` int(1) UNSIGNED NOT NULL DEFAULT '0'
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `posts`
--

CREATE TABLE `posts` (
                         `id` int(10) UNSIGNED NOT NULL,
                         `topic_id` int(10) UNSIGNED NOT NULL,
                         `user_id` int(10) UNSIGNED DEFAULT NULL,
                         `perso_id` int(10) UNSIGNED DEFAULT NULL,
                         `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                         `create_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         `editor` int(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `read_post`
--

CREATE TABLE `read_post` (
                             `topic_id` int(10) UNSIGNED NOT NULL,
                             `user_id` int(10) UNSIGNED NOT NULL,
                             `post_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `sections`
--

CREATE TABLE `sections` (
                            `id` int(10) UNSIGNED NOT NULL,
                            `campagne_id` int(10) UNSIGNED DEFAULT NULL,
                            `title` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                            `ordre` int(10) UNSIGNED NOT NULL,
                            `default_collapse` int(10) UNSIGNED NOT NULL,
                            `banniere` varchar(500) COLLATE utf8_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `session`
--

CREATE TABLE `session` (
                           `session_id` varchar(255) NOT NULL,
                           `session_value` text NOT NULL,
                           `session_time` int(11) NOT NULL,
                           `sess_lifetime` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la table `theme`
--

CREATE TABLE `theme` (
                         `id` int(11) NOT NULL,
                         `title` varchar(50) NOT NULL,
                         `odd_line_color` varchar(10) DEFAULT NULL,
                         `even_line_color` varchar(10) DEFAULT NULL,
                         `sidebar_color` varchar(10) DEFAULT NULL,
                         `link_color` varchar(10) DEFAULT NULL,
                         `link_sidebar_color` varchar(8) NOT NULL,
                         `text_color` varchar(10) DEFAULT NULL,
                         `dialogue_color` varchar(10) DEFAULT NULL,
                         `pensee_color` varchar(10) DEFAULT NULL,
                         `rp1_color` varchar(10) DEFAULT NULL,
                         `rp2_color` varchar(10) DEFAULT NULL,
                         `quote_color` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Structure de la table `topics`
--

CREATE TABLE `topics` (
                          `id` int(10) UNSIGNED NOT NULL,
                          `section_id` int(10) UNSIGNED NOT NULL,
                          `last_post_id` int(10) UNSIGNED DEFAULT NULL,
                          `title` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                          `stickable` int(10) UNSIGNED NOT NULL,
                          `is_private` int(10) NOT NULL DEFAULT '0',
                          `ordre` int(10) UNSIGNED NOT NULL,
                          `is_closed` int(11) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE `user` (
                        `id` int(10) UNSIGNED NOT NULL,
                        `username` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
                        `password` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
                        `mail` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
                        `avatar` varchar(500) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
                        `description` longtext COLLATE utf8_unicode_ci NOT NULL,
                        `profil` int(11) DEFAULT '0',
                        `subscribe_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `birthDate` date DEFAULT NULL,
                        `reinitDate` datetime DEFAULT NULL,
                        `reinitAlea` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
                        `titre` varchar(300) COLLATE utf8_unicode_ci NOT NULL,
                        `notif_mp` int(1) NOT NULL DEFAULT '1',
                        `notif_inscription` int(1) NOT NULL DEFAULT '1',
                        `notif_perso` int(1) NOT NULL DEFAULT '1',
                        `notif_message` int(1) NOT NULL DEFAULT '1',
                        `mail_mp` int(1) NOT NULL DEFAULT '1',
                        `mail_inscription` int(1) NOT NULL DEFAULT '0',
                        `mail_perso` int(1) NOT NULL DEFAULT '0',
                        `mail_message` int(1) NOT NULL DEFAULT '0',
                        `notif_dice` int(1) NOT NULL DEFAULT '1',
                        `mail_dice` int(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `version`
--

CREATE TABLE `version` (
                           `id` int(11) NOT NULL,
                           `install_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `absences`
--
ALTER TABLE `absences`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `alert`
--
ALTER TABLE `alert`
    ADD PRIMARY KEY (`campagne_id`,`joueur_id`);

--
-- Index pour la table `annonce`
--
ALTER TABLE `annonce`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `campagne`
--
ALTER TABLE `campagne`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_539B5D166A1B4FA4` (`mj_id`);

--
-- Index pour la table `campagne_config`
--
ALTER TABLE `campagne_config`
    ADD PRIMARY KEY (`campagne_id`);

--
-- Index pour la table `campagne_favoris`
--
ALTER TABLE `campagne_favoris`
    ADD PRIMARY KEY (`campagne_id`,`user_id`),
  ADD KEY `IDX_FAVORIS_USER` (`user_id`),
  ADD KEY `IDX_FAVORIS_CAMP` (`campagne_id`);

--
-- Index pour la table `campagne_participant`
--
ALTER TABLE `campagne_participant`
    ADD PRIMARY KEY (`campagne_id`,`user_id`),
  ADD KEY `IDX_ABB90F7DA76ED395` (`user_id`),
  ADD KEY `IDX_ABB90F7D16227374` (`campagne_id`);

--
-- Index pour la table `can_read`
--
ALTER TABLE `can_read`
    ADD PRIMARY KEY (`user_id`,`topic_id`);

--
-- Index pour la table `carte`
--
ALTER TABLE `carte`
    ADD PRIMARY KEY (`id`),
  ADD KEY `campagne` (`campagne_id`);

--
-- Index pour la table `chat`
--
ALTER TABLE `chat`
    ADD PRIMARY KEY (`id`),
  ADD KEY `Date` (`time`);

--
-- Index pour la table `chat_actions`
--
ALTER TABLE `chat_actions`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `dicer`
--
ALTER TABLE `dicer`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `draft`
--
ALTER TABLE `draft`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_DRAFT_TOPIC` (`topic_id`),
  ADD KEY `IDX_DRAFT_USER` (`user_id`),
  ADD KEY `IDX_DRAFT_PERSO` (`perso_id`);

--
-- Index pour la table `feedback`
--
ALTER TABLE `feedback`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `feedback_comment`
--
ALTER TABLE `feedback_comment`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `feedback_vote`
--
ALTER TABLE `feedback_vote`
    ADD PRIMARY KEY (`id`,`user_id`);

--
-- Index pour la table `last_action`
--
ALTER TABLE `last_action`
    ADD PRIMARY KEY (`user_id`),
  ADD KEY `IDX_TIME` (`time`);

--
-- Index pour la table `messages`
--
ALTER TABLE `messages`
    ADD PRIMARY KEY (`id`),
  ADD KEY `idx_from` (`from_id`);

--
-- Index pour la table `messages_to`
--
ALTER TABLE `messages_to`
    ADD PRIMARY KEY (`id_message`,`to_id`),
  ADD KEY `idx_message` (`id_message`),
  ADD KEY `idx_to` (`to_id`);

--
-- Index pour la table `note`
--
ALTER TABLE `note`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_NOTES` (`campagne_id`,`user_id`);

--
-- Index pour la table `notif`
--
ALTER TABLE `notif`
    ADD PRIMARY KEY (`id`),
  ADD KEY `FK_NOTIF_01` (`user_id`);

--
-- Index pour la table `personnages`
--
ALTER TABLE `personnages`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_286738A6A76ED395` (`user_id`),
  ADD KEY `IDX_286738A616227374` (`campagne_id`);

--
-- Index pour la table `pnj_category`
--
ALTER TABLE `pnj_category`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `posts`
--
ALTER TABLE `posts`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_885DBAFA1F55203D` (`topic_id`),
  ADD KEY `IDX_885DBAFAA76ED395` (`user_id`),
  ADD KEY `IDX_885DBAFA1221E019` (`perso_id`);

--
-- Index pour la table `read_post`
--
ALTER TABLE `read_post`
    ADD KEY `IDX_DF7EB0B41F55203D` (`topic_id`),
  ADD KEY `IDX_DF7EB0B4A76ED395` (`user_id`),
  ADD KEY `IDX_DF7EB0B44B89032C` (`post_id`);

--
-- Index pour la table `sections`
--
ALTER TABLE `sections`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_2B96439816227374` (`campagne_id`);

--
-- Index pour la table `session`
--
ALTER TABLE `session`
    ADD PRIMARY KEY (`session_id`);

--
-- Index pour la table `theme`
--
ALTER TABLE `theme`
    ADD PRIMARY KEY (`id`);

--
-- Index pour la table `topics`
--
ALTER TABLE `topics`
    ADD PRIMARY KEY (`id`),
  ADD KEY `IDX_91F64639D823E37A` (`section_id`),
  ADD KEY `IDX_91F646392D053F64` (`last_post_id`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
    ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UNIQ_8D93D649F85E0677` (`username`),
  ADD UNIQUE KEY `UNIQ_8D93D6495126AC48` (`mail`);

--
-- Index pour la table `version`
--
ALTER TABLE `version`
    ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `absences`
--
ALTER TABLE `absences`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `annonce`
--
ALTER TABLE `annonce`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `campagne`
--
ALTER TABLE `campagne`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `carte`
--
ALTER TABLE `carte`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `chat`
--
ALTER TABLE `chat`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `chat_actions`
--
ALTER TABLE `chat_actions`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `dicer`
--
ALTER TABLE `dicer`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `draft`
--
ALTER TABLE `draft`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `feedback`
--
ALTER TABLE `feedback`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `feedback_comment`
--
ALTER TABLE `feedback_comment`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `messages`
--
ALTER TABLE `messages`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `note`
--
ALTER TABLE `note`
    MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `notif`
--
ALTER TABLE `notif`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `personnages`
--
ALTER TABLE `personnages`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `pnj_category`
--
ALTER TABLE `pnj_category`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `posts`
--
ALTER TABLE `posts`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `sections`
--
ALTER TABLE `sections`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `theme`
--
ALTER TABLE `theme`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `topics`
--
ALTER TABLE `topics`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
    MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `campagne`
--
ALTER TABLE `campagne`
    ADD CONSTRAINT `FK_539B5D166A1B4FA4` FOREIGN KEY (`mj_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `campagne_favoris`
--
ALTER TABLE `campagne_favoris`
    ADD CONSTRAINT `FK_FAVORIS_CAMP` FOREIGN KEY (`campagne_id`) REFERENCES `campagne` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_FAVORIS_USER` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `campagne_participant`
--
ALTER TABLE `campagne_participant`
    ADD CONSTRAINT `FK_ABB90F7D16227374` FOREIGN KEY (`campagne_id`) REFERENCES `campagne` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_ABB90F7DA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `draft`
--
ALTER TABLE `draft`
    ADD CONSTRAINT `FK_DRAFT_PERSO` FOREIGN KEY (`perso_id`) REFERENCES `personnages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_DRAFT_TOPIC` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_DRAFT_USER` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `personnages`
--
ALTER TABLE `personnages`
    ADD CONSTRAINT `FK_286738A616227374` FOREIGN KEY (`campagne_id`) REFERENCES `campagne` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_286738A6A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `posts`
--
ALTER TABLE `posts`
    ADD CONSTRAINT `FK_885DBAFA1221E019` FOREIGN KEY (`perso_id`) REFERENCES `personnages` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_885DBAFA1F55203D` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_885DBAFAA76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `read_post`
--
ALTER TABLE `read_post`
    ADD CONSTRAINT `FK_DF7EB0B41F55203D` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`),
  ADD CONSTRAINT `FK_DF7EB0B4A76ED395` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Contraintes pour la table `sections`
--
ALTER TABLE `sections`
    ADD CONSTRAINT `FK_2B96439816227374` FOREIGN KEY (`campagne_id`) REFERENCES `campagne` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `topics`
--
ALTER TABLE `topics`
    ADD CONSTRAINT `FK_91F646392D053F64` FOREIGN KEY (`last_post_id`) REFERENCES `posts` (`id`),
  ADD CONSTRAINT `FK_91F64639D823E37A` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;