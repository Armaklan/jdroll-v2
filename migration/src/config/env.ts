import dotenv from 'dotenv';
dotenv.config();

export const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  espritjdrDatabase: process.env.ESPRITJDR_DB_NAME || 'espritjdr',
  jdrollDatabase: process.env.JDROLL_DB_NAME || 'jdroll',
  migrationUser: {
    // Nom du compte jdroll technique qui devient MJ des campagnes et auteur des posts migrés
    name: process.env.MIGRATION_USER_NAME || 'EspritJDR',
    mail: process.env.MIGRATION_USER_MAIL || 'espritjdr@migration.local',
  },
};
