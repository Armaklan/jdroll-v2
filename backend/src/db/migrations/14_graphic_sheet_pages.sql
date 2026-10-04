-- 2026-10-04 : fiche graphique multi-pages (chaque page a son fond et ses champs)
-- À exécuter sur une base existante (une base créée avec data/create.sql est déjà à jour).

ALTER TABLE `campagne_config`
  ADD COLUMN `sheet_pages` longtext AFTER `sheet_definition`;
