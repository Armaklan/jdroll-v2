import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, execute } from './mysql.js';

export interface Migration {
  id: number;
  name: string;
  statements: string[];
}

export interface AppliedMigration {
  id: number;
  name: string;
}

export interface MigrationDb {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<any>;
}

// Dossier contenant un fichier SQL par version : <id>_<nom>.sql
// (ex: 11_programmed_sheet.sql). Les instructions d'un fichier sont séparées
// par un ';' en fin de ligne ; les lignes de commentaire '--' sont ignorées.
const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const MIGRATION_FILENAME = /^(\d+)_([a-z0-9_]+)\.sql$/;

function parseStatements(content: string): string[] {
  const withoutComments = content
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(/;[ \t]*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  const migrations = fs.readdirSync(dir)
    .map((filename): Migration | null => {
      const match = MIGRATION_FILENAME.exec(filename);
      if (match === null) {
        return null;
      }
      return {
        id: Number(match[1]),
        name: match[2],
        statements: parseStatements(fs.readFileSync(path.join(dir, filename), 'utf-8')),
      };
    })
    .filter((migration): migration is Migration => migration !== null)
    .sort((a, b) => a.id - b.id);

  const ids = migrations.map((migration) => migration.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Migrations invalides dans ${dir} : ids en doublon`);
  }
  return migrations;
}

export async function runMigrations(
  db: MigrationDb = { query, execute },
  migrations: Migration[] = loadMigrations()
): Promise<AppliedMigration[]> {
  const rows = await db.query<{ maxId: number | null }>('SELECT MAX(id) AS maxId FROM `version`');
  const currentVersion = rows.length > 0 ? rows[0].maxId ?? 0 : 0;

  const pending = migrations.filter((migration) => migration.id > currentVersion);

  const applied: AppliedMigration[] = [];
  for (const migration of pending) {
    for (const statement of migration.statements) {
      await db.execute(statement);
    }
    await db.execute('INSERT INTO `version` (`id`, `install_date`) VALUES (?, NOW())', [migration.id]);
    applied.push({ id: migration.id, name: migration.name });
  }
  return applied;
}
