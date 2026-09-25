import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { registerUserUseCase, RegisterUserUseCase } from '../usecases/auth/register-user.usecase.js';
import { loginUserUseCase, LoginUserUseCase } from '../usecases/auth/login-user.usecase.js';
import { updateUserProfileUseCase, UpdateUserProfileUseCase } from '../usecases/auth/update-user-profile.usecase.js';
import { uploadUserAvatarUseCase, UploadUserAvatarUseCase } from '../usecases/auth/upload-user-avatar.usecase.js';
import { updateNotificationSettingsUseCase, UpdateNotificationSettingsUseCase } from '../usecases/auth/update-notification-settings.usecase.js';
import { updatePasswordUseCase, UpdatePasswordUseCase } from '../usecases/auth/update-password.usecase.js';
import { userQueries, UserQueries } from '../queries/user.queries.js';
import {
  DomainError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  UserNotFoundError,
} from '../errors/domain.errors.js';
import { User, JWTPayload } from '../types/index.js';

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  mail: z.string().email(),
  password: z.string().min(3),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  mail: z.string().email().optional(),
  avatar: z.string().optional(),
  description: z.string().optional(),
  titre: z.string().optional(),
  birthDate: z.string().nullable().optional(),
});

const updateNotificationSettingsSchema = z.object({
  notif_mp: z.number().int().min(0).max(1).optional(),
  notif_inscription: z.number().int().min(0).max(1).optional(),
  notif_perso: z.number().int().min(0).max(1).optional(),
  notif_message: z.number().int().min(0).max(1).optional(),
  mail_mp: z.number().int().min(0).max(1).optional(),
  mail_inscription: z.number().int().min(0).max(1).optional(),
  mail_perso: z.number().int().min(0).max(1).optional(),
  mail_message: z.number().int().min(0).max(1).optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(3),
});

export class AuthController {
  private readonly registerUseCase: RegisterUserUseCase;
  private readonly loginUseCase: LoginUserUseCase;
  private readonly updateProfileUseCase: UpdateUserProfileUseCase;
  private readonly uploadAvatarUseCase: UploadUserAvatarUseCase;
  private readonly updateNotificationSettingsUseCase: UpdateNotificationSettingsUseCase;
  private readonly updatePasswordUseCase: UpdatePasswordUseCase;
  private readonly userQueryService: UserQueries;

  constructor(
    registerUC?: RegisterUserUseCase,
    loginUC?: LoginUserUseCase,
    updateProfileUC?: UpdateUserProfileUseCase,
    uploadAvatarUC?: UploadUserAvatarUseCase,
    updateNotifSettingsUC?: UpdateNotificationSettingsUseCase,
    updatePwdUC?: UpdatePasswordUseCase,
    userQuerySvc?: UserQueries
  ) {
    this.registerUseCase = registerUC || registerUserUseCase;
    this.loginUseCase = loginUC || loginUserUseCase;
    this.updateProfileUseCase = updateProfileUC || updateUserProfileUseCase;
    this.uploadAvatarUseCase = uploadAvatarUC || uploadUserAvatarUseCase;
    this.updateNotificationSettingsUseCase = updateNotifSettingsUC || updateNotificationSettingsUseCase;
    this.updatePasswordUseCase = updatePwdUC || updatePasswordUseCase;
    this.userQueryService = userQuerySvc || userQueries;
  }

  /**
   * Helper pour mapper les erreurs métier vers les codes de statut HTTP correspondants
   */
  private handleError(error: unknown, reply: FastifyReply) {
    if (error instanceof UserAlreadyExistsError) {
      return reply.status(409).send({ error: error.message });
    }
    if (error instanceof InvalidCredentialsError) {
      return reply.status(401).send({ error: error.message });
    }
    if (error instanceof UserNotFoundError) {
      return reply.status(404).send({ error: error.message });
    }
    if (error instanceof DomainError) {
      return reply.status(400).send({ error: error.message });
    }

    // Erreur inattendue
    throw error;
  }

  /**
   * Helper pour générer le token JWT d'un utilisateur
   */
  private generateToken(app: FastifyInstance, user: User): string {
    const payload: JWTPayload = {
      id: user.id,
      username: user.username,
      mail: user.mail,
      profil: user.profil,
    };
    return app.jwt.sign(payload);
  }

  /**
   * POST /api/auth/register
   * Inscription d'un nouvel utilisateur
   */
  async register(request: FastifyRequest, reply: FastifyReply, app: FastifyInstance) {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      const user = await this.registerUseCase.execute(parseResult.data);
      const token = this.generateToken(app, user);

      return reply.status(201).send({
        token,
        user,
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * POST /api/auth/login
   * Connexion d'un utilisateur existant
   */
  async login(request: FastifyRequest, reply: FastifyReply, app: FastifyInstance) {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      const user = await this.loginUseCase.execute(parseResult.data);
      const token = this.generateToken(app, user);

      return reply.status(200).send({
        token,
        user,
      });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * GET /api/auth/me
   * Récupération du profil de l'utilisateur connecté via Query module
   */
  async getMe(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;

    try {
      const user = await this.userQueryService.getUserProfile(userPayload.id);
      return reply.status(200).send({ user });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/auth/profile
   * Mise à jour du profil de l'utilisateur connecté
   */
  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;
    const parseResult = updateProfileSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      const user = await this.updateProfileUseCase.execute(userPayload.id, parseResult.data);
      return reply.status(200).send({ user });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * POST /api/auth/avatar
   * Téléverser une image (avatar ou image de profil) pour l'utilisateur connecté
   */
  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;

    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const buffer = await file.toBuffer();
      const result = await this.uploadAvatarUseCase.execute({
        userId: userPayload.id,
        filename: file.filename,
        mimetype: file.mimetype,
        content: buffer,
      });

      return reply.status(201).send(result);
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/auth/notification-settings
   * Mise à jour des paramètres de notification de l'utilisateur connecté
   */
  async updateNotificationSettings(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;
    const parseResult = updateNotificationSettingsSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      const user = await this.updateNotificationSettingsUseCase.execute(userPayload.id, parseResult.data);
      return reply.status(200).send({ user });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * PUT /api/auth/password
   * Mise à jour du mot de passe de l'utilisateur connecté
   */
  async updatePassword(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user as JWTPayload;
    const parseResult = updatePasswordSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données invalides',
        details: parseResult.error.format(),
      });
    }

    try {
      await this.updatePasswordUseCase.execute(userPayload.id, parseResult.data);
      return reply.status(200).send({ success: true, message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
      return this.handleError(error, reply);
    }
  }

  /**
   * Déclaration des routes du contrôleur sur l'instance Fastify
   */
  registerRoutes(app: FastifyInstance) {
    app.post('/api/auth/register', (req, rep) => this.register(req, rep, app));
    app.post('/api/auth/login', (req, rep) => this.login(req, rep, app));
    app.get('/api/auth/me', { preHandler: [app.authenticate] }, (req, rep) => this.getMe(req, rep));
    app.put('/api/auth/profile', { preHandler: [app.authenticate] }, (req, rep) => this.updateProfile(req, rep));
    app.post('/api/auth/avatar', { preHandler: [app.authenticate] }, (req, rep) => this.uploadAvatar(req, rep));
    app.put('/api/auth/notification-settings', { preHandler: [app.authenticate] }, (req, rep) => this.updateNotificationSettings(req, rep));
    app.put('/api/auth/password', { preHandler: [app.authenticate] }, (req, rep) => this.updatePassword(req, rep));
  }
}

export const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {
  authController.registerRoutes(app);
}
