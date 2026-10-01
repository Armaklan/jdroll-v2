import { query, queryOne, execute } from '../db/mysql.js';
import { User, UserWithPassword, CreateUserData, UpdateUserProfileData, NotificationSettings, HomeUserSummary, MemberSummary } from '../types/index.js';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null>;
  findByUsernames(usernames: string[]): Promise<User[]>;
  searchByUsername(query: string, excludeId?: number): Promise<{ id: number; username: string; avatar: string }[]>;
  existsByUsernameOrEmail(username: string, mail: string): Promise<boolean>;
  create(data: CreateUserData): Promise<User>;
  updateProfile(id: number, data: UpdateUserProfileData): Promise<User>;
  updateNotificationSettings(id: number, settings: NotificationSettings): Promise<User>;
  updatePassword(id: number, currentPasswordHash: string, newPasswordHash: string): Promise<void>;
  updateLastAction(id: number): Promise<void>;
  findLastActionDateByUser(userId: number): Promise<string | null>;
  findLatestRegistrations(limit: number): Promise<HomeUserSummary[]>;
  findUpcomingBirthdays(days: number): Promise<HomeUserSummary[]>;
  findMembersWithAtLeastOnePost(): Promise<MemberSummary[]>;
}

export interface PasswordResetToken {
  reinitAlea: string;
  /** Date de génération du token : Date, chaîne ISO ou timestamp en millisecondes */
  reinitDate: Date | string | number;
}

export interface IUserPasswordResetRepository {
  findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null>;
  setPasswordResetToken(id: number, alea: string): Promise<void>;
  findPasswordResetToken(id: number): Promise<PasswordResetToken | null>;
  resetPasswordWithToken(id: number, alea: string, newPasswordHash: string): Promise<void>;
}

export class MysqlUserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const user = await queryOne<User>(
      `SELECT id, username, mail, avatar, description, profil, titre, subscribe_date, birthDate, notif_mp, notif_inscription, notif_perso, notif_message, notif_chat, mail_mp, mail_inscription, mail_perso, mail_message, mail_chat
       FROM user
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return user || null;
  }

  async findByUsernameOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const user = await queryOne<UserWithPassword>(
      `SELECT id, username, mail, password, avatar, description, profil, titre, subscribe_date, birthDate, notif_mp, notif_inscription, notif_perso, notif_message, notif_chat, mail_mp, mail_inscription, mail_perso, mail_message, mail_chat
       FROM user
       WHERE username = ? OR mail = ?
       LIMIT 1`,
      [identifier, identifier]
    );
    return user || null;
  }

  async findByUsernames(usernames: string[]): Promise<User[]> {
    if (usernames.length === 0) return [];
    const placeholders = usernames.map(() => '?').join(',');
    return query<User>(
      `SELECT id, username, mail, avatar, description, profil, titre, subscribe_date, birthDate, notif_mp, notif_inscription, notif_perso, notif_message, notif_chat, mail_mp, mail_inscription, mail_perso, mail_message, mail_chat
       FROM user
       WHERE username IN (${placeholders})`,
      usernames
    );
  }

  async searchByUsername(searchQuery: string, excludeId?: number): Promise<{ id: number; username: string; avatar: string }[]> {
    const q = `%${searchQuery.trim()}%`;
    const params: any[] = [q];
    let sql = `SELECT id, username, avatar FROM user WHERE username LIKE ?`;
    if (excludeId) {
      sql += ` AND id != ?`;
      params.push(excludeId);
    }
    sql += ` ORDER BY username ASC LIMIT 20`;
    return query<{ id: number; username: string; avatar: string }>(sql, params);
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

  async updateProfile(id: number, data: UpdateUserProfileData): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.mail !== undefined) {
      updates.push('mail = ?');
      params.push(data.mail);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(data.avatar);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.titre !== undefined) {
      updates.push('titre = ?');
      params.push(data.titre);
    }
    if (data.birthDate !== undefined) {
      updates.push('birthDate = ?');
      // Convertir la date ISO (ex: 1986-05-05T00:00:00.000Z) en format YYYY-MM-DD pour MySQL
      let formattedDate = data.birthDate;
      if (typeof formattedDate === 'string') {
        // Si c'est une chaîne vide ou juste des espaces, mettre à null
        const trimmed = formattedDate.trim();
        if (!trimmed) {
          formattedDate = null;
        } else {
          // Extraire uniquement la partie date YYYY-MM-DD
          const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
          formattedDate = match ? match[1] : null;
        }
      }
      params.push(formattedDate);
    }

    if (updates.length === 0) {
      const user = await this.findById(id);
      if (!user) {
        throw new Error(`Utilisateur avec l'ID ${id} introuvable`);
      }
      return user;
    }

    params.push(id);
    const sql = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
    await execute(sql, params);

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error(`Utilisateur avec l'ID ${id} introuvable`);
    }

    return updatedUser;
  }

  async updateNotificationSettings(id: number, settings: NotificationSettings): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];

    if (settings.notif_mp !== undefined) {
      updates.push('notif_mp = ?');
      params.push(settings.notif_mp);
    }
    if (settings.notif_inscription !== undefined) {
      updates.push('notif_inscription = ?');
      params.push(settings.notif_inscription);
    }
    if (settings.notif_perso !== undefined) {
      updates.push('notif_perso = ?');
      params.push(settings.notif_perso);
    }
    if (settings.notif_message !== undefined) {
      updates.push('notif_message = ?');
      params.push(settings.notif_message);
    }
    if (settings.notif_chat !== undefined) {
      updates.push('notif_chat = ?');
      params.push(settings.notif_chat);
    }
    if (settings.mail_mp !== undefined) {
      updates.push('mail_mp = ?');
      params.push(settings.mail_mp);
    }
    if (settings.mail_inscription !== undefined) {
      updates.push('mail_inscription = ?');
      params.push(settings.mail_inscription);
    }
    if (settings.mail_perso !== undefined) {
      updates.push('mail_perso = ?');
      params.push(settings.mail_perso);
    }
    if (settings.mail_message !== undefined) {
      updates.push('mail_message = ?');
      params.push(settings.mail_message);
    }
    if (settings.mail_chat !== undefined) {
      updates.push('mail_chat = ?');
      params.push(settings.mail_chat);
    }

    if (updates.length === 0) {
      const user = await this.findById(id);
      if (!user) {
        throw new Error(`Utilisateur avec l'ID ${id} introuvable`);
      }
      return user;
    }

    params.push(id);
    const sql = `UPDATE user SET ${updates.join(', ')} WHERE id = ?`;
    await execute(sql, params);

    const updatedUser = await this.findById(id);
    if (!updatedUser) {
      throw new Error(`Utilisateur avec l'ID ${id} introuvable`);
    }

    return updatedUser;
  }

  async updatePassword(id: number, currentPasswordHash: string, newPasswordHash: string): Promise<void> {
    const sql = `UPDATE user SET password = ? WHERE id = ? AND password = ?`;
    const result = await execute(sql, [newPasswordHash, id, currentPasswordHash]);
    
    if (result.affectedRows === 0) {
      throw new Error('Mot de passe actuel incorrect ou utilisateur introuvable');
    }
  }

  async updateLastAction(id: number): Promise<void> {
    await execute(
      `INSERT INTO last_action (user_id, time) VALUES (?, NOW())
       ON DUPLICATE KEY UPDATE time = NOW()`,
      [id]
    );
  }

  async findLastActionDateByUser(userId: number): Promise<string | null> {
    const row = await queryOne<{ time: string }>(
      `SELECT time FROM last_action WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return row?.time ?? null;
  }

  async setPasswordResetToken(id: number, alea: string): Promise<void> {
    await execute(
      `UPDATE user SET reinitAlea = ?, reinitDate = NOW() WHERE id = ?`,
      [alea, id]
    );
  }

  async findPasswordResetToken(id: number): Promise<PasswordResetToken | null> {
    // UNIX_TIMESTAMP retourne un epoch invariant de fuseau horaire
    // (NOW() écrit et relit avec la même horloge côté base)
    const token = await queryOne<{ reinitAlea: string; reinitDate: number }>(
      `SELECT reinitAlea, UNIX_TIMESTAMP(reinitDate) * 1000 AS reinitDate
       FROM user
       WHERE id = ? AND reinitAlea IS NOT NULL AND reinitDate IS NOT NULL
       LIMIT 1`,
      [id]
    );
    return token || null;
  }

  async resetPasswordWithToken(id: number, alea: string, newPasswordHash: string): Promise<void> {
    const result = await execute(
      `UPDATE user SET password = ?, reinitAlea = NULL, reinitDate = NULL
       WHERE id = ? AND reinitAlea = ?`,
      [newPasswordHash, id, alea]
    );

    if (result.affectedRows === 0) {
      throw new Error('Token de réinitialisation invalide ou expiré');
    }
  }

  async findLatestRegistrations(limit: number): Promise<HomeUserSummary[]> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    return query<HomeUserSummary>(
      `SELECT id, username, avatar, profil, subscribe_date as subscribeDate
       FROM user
       WHERE EXISTS (SELECT 1 FROM last_action WHERE last_action.user_id = user.id)
       ORDER BY subscribe_date DESC, id DESC
       LIMIT ?`,
      [safeLimit]
    );
  }

  async findUpcomingBirthdays(days: number): Promise<HomeUserSummary[]> {
    const safeDays = Math.min(Math.max(1, days), 365);
    return query<HomeUserSummary>(
      `SELECT id, username, avatar, profil, birthDate,
              DATE_ADD(
                birthDate,
                INTERVAL YEAR(CURDATE()) - YEAR(birthDate)
                  + (DATE_FORMAT(birthDate, '%m-%d') < DATE_FORMAT(CURDATE(), '%m-%d')) YEAR
              ) AS upcomingDate
       FROM user
       WHERE birthDate IS NOT NULL
       HAVING upcomingDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY upcomingDate ASC, username ASC
       LIMIT 20`,
      [safeDays]
    );
  }

  async findMembersWithAtLeastOnePost(): Promise<MemberSummary[]> {
    return query<MemberSummary>(
      `SELECT u.id, u.username, u.avatar, u.profil, u.titre,
              u.subscribe_date as subscribeDate,
              la.time as lastActionDate
       FROM user u
       LEFT JOIN last_action la ON la.user_id = u.id
       WHERE EXISTS (SELECT 1 FROM posts WHERE posts.user_id = u.id)
       ORDER BY u.username ASC`
    );
  }
}

export const userRepository: IUserRepository & IUserPasswordResetRepository = new MysqlUserRepository();
