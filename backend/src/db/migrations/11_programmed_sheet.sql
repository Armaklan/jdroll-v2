-- 2026-09-28 : module de fiche de personnage programmée
-- À exécuter sur une base existante (une base créée avec data/create.sql est déjà à jour).

ALTER TABLE `campagne_config`
  ADD COLUMN `sheet_mode` varchar(20) DEFAULT NULL AFTER `default_dice`,
  ADD COLUMN `sheet_definition` longtext AFTER `sheet_mode`;

ALTER TABLE `personnages`
  ADD COLUMN `sheet_values` longtext COLLATE utf8_unicode_ci AFTER `widgets`;

-- Compatibilité : crée la table feature_flip si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS `feature_flip` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(100) NOT NULL,
    `description` varchar(500) DEFAULT NULL,
    `enabled` tinyint(1) NOT NULL DEFAULT '0',
    PRIMARY KEY (`id`),
    UNIQUE KEY `UNIQ_FEATURE_FLIP_NAME` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `feature_flip` (`name`, `description`, `enabled`)
SELECT 'programmed-sheet', 'Module de fiche de personnage programmée (construction de fiche par pages, sections et composants)', 0
WHERE NOT EXISTS (SELECT 1 FROM `feature_flip` WHERE `name` = 'programmed-sheet');
