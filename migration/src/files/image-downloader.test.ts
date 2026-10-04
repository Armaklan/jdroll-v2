import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAvatarFilename,
  buildInlineImageFilename,
  extractInlineImageUrls,
  isDownloadableImageUrl,
  isEspritJdrImageUrl,
  replaceInlineImageUrls,
} from './image-downloader.js';

test('buildAvatarFilename dérive le nom de fichier depuis l\'url source', () => {
  assert.equal(
    buildAvatarFilename(50, 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/50/sanstitrego.png'),
    'pnj-50.png'
  );
});

test('buildAvatarFilename ignore la query string', () => {
  assert.equal(
    buildAvatarFilename(46, 'http://www.espritjdr.net/Upload/campagnes/36/intervenant/46/46.jpg?timestamp=1352563790130'),
    'pnj-46.jpg'
  );
});

test('buildAvatarFilename force une extension image connue en minuscules', () => {
  assert.equal(
    buildAvatarFilename(43, 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/43/62875215'),
    'pnj-43.jpg'
  );
  assert.equal(
    buildAvatarFilename(44, 'http://www.espritjdr.net/Upload/campagnes/35/intervenant/44/GIF.GIF'),
    'pnj-44.gif'
  );
});

test('isDownloadableImageUrl n\'accepte que les urls http(s) absolues', () => {
  assert.equal(isDownloadableImageUrl('http://www.espritjdr.net/Upload/a.png'), true);
  assert.equal(isDownloadableImageUrl('https://www.espritjdr.net/Upload/a.png'), true);
  assert.equal(isDownloadableImageUrl('  https://www.espritjdr.net/Upload/a.png  '), true);
  assert.equal(isDownloadableImageUrl('/Upload/a.png'), false);
  assert.equal(isDownloadableImageUrl('Upload/a.png'), false);
  assert.equal(isDownloadableImageUrl('ftp://www.espritjdr.net/Upload/a.png'), false);
  assert.equal(isDownloadableImageUrl(''), false);
  assert.equal(isDownloadableImageUrl(null), false);
});

test('isEspritJdrImageUrl n\'accepte que les urls du domaine espritjdr.net', () => {
  assert.equal(isEspritJdrImageUrl('http://www.espritjdr.net/Upload/a.png'), true);
  assert.equal(isEspritJdrImageUrl('https://espritjdr.net/Upload/a.png'), true);
  assert.equal(isEspritJdrImageUrl('https://sous.espritjdr.net/Upload/a.png'), true);
  assert.equal(isEspritJdrImageUrl('https://exemple.com/Upload/a.png'), false);
  assert.equal(isEspritJdrImageUrl('https://espritjdr.net.malice.com/a.png'), false);
  assert.equal(isEspritJdrImageUrl('/Upload/a.png'), false);
  assert.equal(isEspritJdrImageUrl(''), false);
});

test('extractInlineImageUrls extrait les src uniques des balises img', () => {
  const html =
    '<p><img src="http://a.example/1.png" alt="un">' +
    "<img src='http://a.example/2.png'>" +
    '<img src="http://a.example/1.png"></p>';
  assert.deepEqual(extractInlineImageUrls(html), ['http://a.example/1.png', 'http://a.example/2.png']);
});

test('extractInlineImageUrls ne remonte rien sans balise img', () => {
  assert.deepEqual(extractInlineImageUrls('<p>Texte sans image</p>'), []);
  assert.deepEqual(extractInlineImageUrls(''), []);
});

test('buildInlineImageFilename est déterministe et basé sur un hash de l\'url', () => {
  const url = 'http://www.espritjdr.net/Upload/campagnes/35/scene.jpg';
  const filename = buildInlineImageFilename(url);
  assert.equal(buildInlineImageFilename(url), filename);
  assert.match(filename, /^img-[0-9a-f]{32}\.jpg$/);
  // Urls différentes -> fichiers différents
  assert.notEqual(buildInlineImageFilename('http://www.espritjdr.net/Upload/campagnes/36/scene.jpg'), filename);
});

test('buildInlineImageFilename force une extension image connue', () => {
  assert.match(buildInlineImageFilename('http://www.espritjdr.net/Upload/sans-ext'), /\.jpg$/);
  assert.match(buildInlineImageFilename('http://www.espritjdr.net/Upload/GIF.GIF'), /\.gif$/);
});

test('replaceInlineImageUrls remplace uniquement les src connus, dans leurs attributs', () => {
  const html =
    '<p><img src="http://a.example/1.png" alt="un">' +
    '<img src="http://b.example/2.png"></p>';
  const replacements = new Map([['http://a.example/1.png', '/files/1/img-a.png']]);

  assert.equal(
    replaceInlineImageUrls(html, replacements),
    '<p><img src="/files/1/img-a.png" alt="un"><img src="http://b.example/2.png"></p>'
  );
});

test('replaceInlineImageUrls gère les quotes simples et les urls hors espritjdr', () => {
  const html = `<img src='http://a.example/1.png'>`;
  const replacements = new Map([['http://a.example/1.png', '/files/1/img-a.png']]);
  assert.equal(replaceInlineImageUrls(html, replacements), `<img src='/files/1/img-a.png'>`);
});
