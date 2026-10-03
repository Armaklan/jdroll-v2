import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runMigrations, loadMigrations, Migration, MigrationDb } from './migrations.js';

interface RecordedCall {
  sql: string;
  params: any[];
}

function writeMigrationFile(dir: string, filename: string, content: string): void {
  fs.writeFileSync(path.join(dir, filename), content);
}

describe('loadMigrations', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jdroll-migrations-'));
  });

  it('charge un fichier par version : id et nom dérivés du nom de fichier', () => {
    writeMigrationFile(dir, '11_programmed_sheet.sql', 'ALTER TABLE `t` ADD COLUMN `c` int;\n');

    const migrations = loadMigrations(dir);

    assert.deepEqual(migrations, [{
      id: 11,
      name: 'programmed_sheet',
      statements: ['ALTER TABLE `t` ADD COLUMN `c` int'],
    }]);
  });

  it('sépare les instructions et ignore les commentaires et fichiers non conformes', () => {
    writeMigrationFile(
      dir,
      '12_multi.sql',
      '-- Description de la migration\nALTER TABLE `t`\n  ADD COLUMN `a` int;\n\nINSERT INTO `t` (`a`) VALUES (1);\n'
    );
    writeMigrationFile(dir, 'README.md', 'ignore moi');
    writeMigrationFile(dir, 'notes.txt', 'ignore moi aussi');

    const migrations = loadMigrations(dir);

    assert.deepEqual(migrations, [{
      id: 12,
      name: 'multi',
      statements: ['ALTER TABLE `t`\n  ADD COLUMN `a` int', 'INSERT INTO `t` (`a`) VALUES (1)'],
    }]);
  });

  it('trie les migrations par id croissant et rejette les ids en doublon', () => {
    writeMigrationFile(dir, '13_trois.sql', 'SELECT 1;\n');
    writeMigrationFile(dir, '12_deux.sql', 'SELECT 1;\n');
    assert.deepEqual(loadMigrations(dir).map((m) => m.id), [12, 13]);

    writeMigrationFile(dir, '12_doublon.sql', 'SELECT 1;\n');
    assert.throws(() => loadMigrations(dir), /doublon/i);
  });
});

describe('dossier des migrations du projet', () => {
  it('contient un fichier par version, avec des ids uniques et croissants', () => {
    const migrations = loadMigrations();
    const ids = migrations.map((m: Migration) => m.id);
    assert.deepEqual(ids, [...new Set(ids)].sort((a, b) => a - b));
    assert.ok(ids.length > 0);
  });

  it('définit la migration 11 (programmed_sheet) avec la table feature_flip pour compatibilité', () => {
    const migration = loadMigrations().find((m: Migration) => m.id === 11);

    assert.ok(migration, 'la migration 11 doit exister');
    assert.equal(migration!.name, 'programmed_sheet');
    const featureFlipCreate = migration!.statements.find((s) => /CREATE TABLE IF NOT EXISTS `feature_flip`/.test(s));
    assert.ok(featureFlipCreate, 'la v11 doit créer feature_flip si absente');
    assert.match(featureFlipCreate!, /`name` varchar\(100\) NOT NULL/);
    assert.match(featureFlipCreate!, /`description` varchar\(500\) DEFAULT NULL/);
    assert.match(featureFlipCreate!, /`enabled` tinyint\(1\) NOT NULL DEFAULT '0'/);
    assert.match(featureFlipCreate!, /PRIMARY KEY \(`id`\)/);
    assert.match(featureFlipCreate!, /AUTO_INCREMENT/);
  });

  it('définit la migration 13 (assistant_mj) : feature flip assistant-mj, sans nouvelle table (statut 2 dans campagne_participant)', () => {
    const migration = loadMigrations().find((m: Migration) => m.id === 13);

    assert.ok(migration, 'la migration 13 doit exister');
    assert.equal(migration!.name, 'assistant_mj');
    const statements = migration!.statements.join('\n');
    assert.match(statements, /INSERT INTO `feature_flip`/);
    assert.match(statements, /'assistant-mj'/);
    assert.match(statements, /WHERE NOT EXISTS \(SELECT 1 FROM `feature_flip` WHERE `name` = 'assistant-mj'\)/);
    // Le rôle de MJ Assistant repose sur campagne_participant.statut = 2 :
    // aucune nouvelle table ne doit être créée.
    assert.doesNotMatch(statements, /CREATE TABLE/);
    // Nettoyage d'une éventuelle table résiduelle d'une migration 13 antérieure défaillante
    assert.match(statements, /DROP TABLE IF EXISTS `campagne_assistant_mj`/);
  });

  it('définit la migration 12 (chat_notification_settings) avec les réglages de notification dédiés au tchat privé', () => {
    const migration = loadMigrations().find((m: Migration) => m.id === 12);

    assert.ok(migration, 'la migration 12 doit exister');
    assert.equal(migration!.name, 'chat_notification_settings');
    const statements = migration!.statements.join('\n');
    assert.match(statements, /ALTER TABLE `user`\s+ADD COLUMN `notif_chat` int\(1\) NOT NULL DEFAULT '1'/);
    assert.match(statements, /ADD COLUMN `mail_chat` int\(1\) NOT NULL DEFAULT '0'/);
  });
});

describe('runMigrations', () => {
  let calls: RecordedCall[];
  let currentVersion: number | null;
  let failingSql: string | null;
  let db: MigrationDb;
  let migrations: Migration[];

  beforeEach(() => {
    calls = [];
    currentVersion = 10;
    failingSql = null;
    migrations = [
      { id: 10, name: 'deja_appliquee', statements: ['SELECT 10;'] },
      { id: 11, name: 'programmed_sheet', statements: ['SELECT 11a;', 'SELECT 11b;'] },
      { id: 12, name: 'suivante', statements: ['SELECT 12;'] },
    ];
    db = {
      query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
        calls.push({ sql, params });
        if (sql.includes('MAX(id)')) {
          return [{ maxId: currentVersion }] as T[];
        }
        return [] as T[];
      },
      execute: async (sql: string, params: any[] = []): Promise<any> => {
        calls.push({ sql, params });
        if (failingSql !== null && sql.includes(failingSql)) {
          throw new Error('SQL error');
        }
        return {} as any;
      },
    };
  });

  it("n'applique rien quand la base est déjà à jour", async () => {
    currentVersion = 12;

    const applied = await runMigrations(db, migrations);

    assert.deepEqual(applied, []);
    assert.equal(calls.length, 1); // seul le SELECT MAX(id) a été exécuté
  });

  it('considère une table vide (maxId null) comme version 0 et applique toutes les migrations', async () => {
    currentVersion = null;

    const applied = await runMigrations(db, migrations);

    assert.deepEqual(applied.map((m) => m.id), [10, 11, 12]);
  });

  it("applique uniquement les migrations postérieures à la version courante, dans l'ordre, sans doublon", async () => {
    currentVersion = 10;

    const applied = await runMigrations(db, migrations);

    assert.deepEqual(applied.map((m) => m.id), [11, 12]);
  });

  it('exécute les instructions de chaque migration puis insère la ligne dans version', async () => {
    currentVersion = 10;

    await runMigrations(db, migrations);

    const execCalls = calls.filter((c) => c.sql !== 'SELECT MAX(id) AS maxId FROM `version`');
    assert.deepEqual(
      execCalls.map((c) => c.sql),
      [
        'SELECT 11a;', 'SELECT 11b;', 'INSERT INTO `version` (`id`, `install_date`) VALUES (?, NOW())',
        'SELECT 12;', 'INSERT INTO `version` (`id`, `install_date`) VALUES (?, NOW())',
      ]
    );
    assert.deepEqual(execCalls[2].params, [11]);
    assert.deepEqual(execCalls[4].params, [12]);
  });

  it("s'arrête à la première instruction en échec sans enregistrer la version ni continuer", async () => {
    currentVersion = 10;
    failingSql = 'SELECT 11b';

    await assert.rejects(() => runMigrations(db, migrations), /SQL error/);

    assert.ok(!calls.some((c) => /INSERT INTO `version`/.test(c.sql)));
    assert.ok(!calls.some((c) => c.sql === 'SELECT 12;'));
  });
});
