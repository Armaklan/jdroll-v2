import mysql from 'mysql2/promise';
import { config } from '../config/env.js';

// La base espritjdr est encodée en latin1 : la lecture doit se faire dans
// ce charset pour obtenir les caractères accentués corrects.
export const sourcePool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.espritjdrDatabase,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'latin1',
  dateStrings: true,
});

// La base jdroll est en utf8mb4.
export const targetPool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.jdrollDatabase,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await sourcePool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function targetQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await targetPool.query(sql, params);
  return rows as T[];
}

export async function targetQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await targetQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function withTargetTransaction<T>(
  work: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await targetPool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePools(): Promise<void> {
  await Promise.all([sourcePool.end(), targetPool.end()]);
}
