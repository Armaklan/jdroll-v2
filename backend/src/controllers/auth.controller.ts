import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { registerUserUseCase, RegisterUserUseCase } from '../usecases/auth/register-user.usecase.js';
import { loginUserUseCase, LoginUserUseCase } from '../usecases/auth/login-user.usecase.js';
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

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase = registerUserUseCase,
    private readonly loginUseCase: LoginUserUseCase = loginUserUseCase,
    private readonly userQueryService: UserQueries = userQueries
  ) {}

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
   * Déclaration des routes du contrôleur sur l'instance Fastify
   */
  registerRoutes(app: FastifyInstance) {
    app.post('/api/auth/register', (req, rep) => this.register(req, rep, app));
    app.post('/api/auth/login', (req, rep) => this.login(req, rep, app));
    app.get('/api/auth/me', { preHandler: [app.authenticate] }, (req, rep) => this.getMe(req, rep));
  }
}

export const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {
  authController.registerRoutes(app);
}
