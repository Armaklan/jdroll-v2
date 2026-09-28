import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderEmailTemplate } from './email-template.js';

describe('renderEmailTemplate', () => {
  it('produit un document HTML complet avec encodage et styles inline', () => {
    const html = renderEmailTemplate({
      title: 'Notification JdRoll',
      bodyHtml: '<p>Un nouveau message vous attend.</p>',
    });

    assert.ok(html.startsWith('<!DOCTYPE html>'), 'Le mail doit être un document HTML complet');
    assert.ok(html.includes('<meta charset="UTF-8"'), 'Le mail doit déclarer son encodage');
    assert.ok(html.includes('viewport'), 'Le mail doit inclure un viewport pour mobile');
    assert.ok(!html.includes('<link'), "Aucune feuille de style externe : les clients mail ignorent les <link>");
    assert.ok(html.includes('style='), 'Les styles doivent être inline pour la compatibilité clients mail');
  });

  it('inclut le titre, le corps HTML et un bandeau JdRoll', () => {
    const html = renderEmailTemplate({
      title: 'Nouveau message dans un sujet',
      bodyHtml: '<p>Bob a répondu à votre sujet.</p>',
    });

    assert.ok(html.includes('JdRoll'), 'Le bandeau doit mentionner le site');
    assert.ok(html.includes('Nouveau message dans un sujet'));
    assert.ok(html.includes('<p>Bob a répondu à votre sujet.</p>'));
  });

  it('échappe le titre en HTML', () => {
    const html = renderEmailTemplate({
      title: 'Alerte <b>importante</b> & urgente',
      bodyHtml: '<p>Corps</p>',
    });

    assert.ok(!html.includes('Alerte <b>'), 'Le titre brut ne doit pas être injecté tel quel');
    assert.ok(html.includes('Alerte &lt;b&gt;importante&lt;/b&gt; &amp; urgente'));
  });

  it('affiche un bouton cliquable quand une action est fournie', () => {
    const html = renderEmailTemplate({
      title: 'Réinitialisation',
      bodyHtml: '<p>Corps</p>',
      ctaUrl: 'https://www.jdroll.fr/reset-password?user=1&alea=abc',
      ctaLabel: 'Renouveler mon mot de passe',
    });

    assert.ok(html.includes('href="https://www.jdroll.fr/reset-password?user=1&amp;alea=abc"'), "L'URL du CTA doit être échappée");
    assert.ok(html.includes('Renouveler mon mot de passe'));
    assert.ok(html.includes('background-color:#8844CC'), 'Le bouton doit reprendre la couleur signature du site');
  });

  it('affiche le lien en clair sous le bouton quand une action est fournie', () => {
    const html = renderEmailTemplate({
      title: 'Réinitialisation',
      bodyHtml: '<p>Corps</p>',
      ctaUrl: 'https://www.jdroll.fr/reset-password?user=1&alea=abc',
      ctaLabel: 'Renouveler mon mot de passe',
    });

    assert.ok(
      html.includes('https://www.jdroll.fr/reset-password?user=1&amp;alea=abc'),
      'Le lien doit aussi apparaître en texte de secours pour les clients qui bloquent le bouton'
    );
  });

  it('ne contient aucun bouton quand aucune action est fournie', () => {
    const html = renderEmailTemplate({
      title: 'Notification',
      bodyHtml: '<p>Corps</p>',
    });

    assert.ok(!html.includes('<a href'), 'Aucun bouton ni lien sans action');
  });

  it('inclut le texte de pied de page fourni', () => {
    const html = renderEmailTemplate({
      title: 'Notification',
      bodyHtml: '<p>Corps</p>',
      footerText: 'Ceci est un message automatique, merci de ne pas y répondre.',
    });

    assert.ok(html.includes('Ceci est un message automatique, merci de ne pas y répondre.'));
  });
});
