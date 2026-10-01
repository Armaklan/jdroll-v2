-- Réglages de notification dédiés aux messages privés du tchat,
-- distincts de ceux des messages privés (MP) :
-- notification sur le site activée par défaut, email désactivé par défaut.
ALTER TABLE `user`
  ADD COLUMN `notif_chat` int(1) NOT NULL DEFAULT '1',
  ADD COLUMN `mail_chat` int(1) NOT NULL DEFAULT '0';
