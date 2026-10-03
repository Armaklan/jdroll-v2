-- 2026-10-03 : rôle de MJ Assistant (feature flip assistant-mj)
-- Un MJ peut promouvoir un joueur comme MJ Assistant via la configuration de la campagne.
-- Le rôle est porté par campagne_participant.statut = 2 (0 = en attente, 1 = joueur validé, 2 = joueur validé + MJ Assistant) :
-- aucune nouvelle table n'est nécessaire.
-- À exécuter sur une base existante (une base créée avec data/create.sql est déjà à jour).

-- Nettoyage d'une éventuelle table résiduelle d'une version antérieure (défaillante) de cette migration
DROP TABLE IF EXISTS `campagne_assistant_mj`;

INSERT INTO `feature_flip` (`name`, `description`, `enabled`)
SELECT 'assistant-mj', 'Rôle de MJ Assistant : le MJ peut promouvoir un joueur qui hérite de tous ses droits sauf l''administration de la campagne', 0
WHERE NOT EXISTS (SELECT 1 FROM `feature_flip` WHERE `name` = 'assistant-mj');
