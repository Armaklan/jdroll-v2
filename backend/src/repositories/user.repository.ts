import { queryOne, execute } from '../db/mysql.js';
import { User, UserWithPassword, CreateUserData } from '../types/index.js';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null>;
  existsByUsernameOrEmail(username: string, mail: string): Promise<boolean>;
  create(data: CreateUserData): Promise<User>;
}

export class MysqlUserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const user = await queryOne<User>(
      `SELECT id, username, mail, avatar, description, profil, titre, subscribe_date, birthDate
       FROM user
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return user || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = await queryOne<UserWithPassword>(
      `SELECT id, username, mail, password, avatar, description, profil, titre, subscribe_date, birthDate
       FROM user
       WHERE username = ? OR mail = ?
       LIMIT 1`,
      [identifier, identifier]
    );
    return user || null;
  }

  async existsByUsernameOrEmail(username: string, mail: string): Promise<boolean> {
    const user = await queryOne<{ id: number }>(
      `SELECT id FROM user WHERE username = ? OR mail = ? LIMIT 1`,
      [username, mail]
    );
    return Boolean(user);
  }

  async create(data: CreateUserData): Promise<User> {
    const avatar = data.avatar ?? '';
    const description = data.description ?? '';
    const profil = data.profil ?? 0;
    const titre = data.titre ?? '';

    const result = await execute(
      `INSERT INTO user (username, mail, password, avatar, description, profil, titre, subscribe_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [data.username, data.mail, data.passwordHash, avatar, description, profil, titre]
    );

    const createdUser = await this.findById(result.insertId);
    if (!createdUser) {
      throw new Error(`Échec de récupération de l'utilisateur après insertion (id=${result.insertId})`);
    }

    return createdUser;
  }
}

export const userRepository: IUserRepository = new MysqlUserRepository();
