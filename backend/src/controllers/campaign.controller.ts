import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { campaignQueries, CampaignQueries } from '../queries/campaign.queries.js';
import { forumQueries, ForumQueries } from '../queries/forum.queries.js';
import { createPostUseCase, CreatePostUseCase } from '../usecases/forum/create-post.usecase.js';
import { createSectionUseCase, CreateSectionUseCase } from '../usecases/forum/create-section.usecase.js';
import { updateSectionUseCase, UpdateSectionUseCase } from '../usecases/forum/update-section.usecase.js';
import { uploadSectionBannerUseCase, UploadSectionBannerUseCase } from '../usecases/forum/upload-section-banner.usecase.js';
import { createTopicUseCase, CreateTopicUseCase } from '../usecases/forum/create-topic.usecase.js';
import { updateTopicUseCase, UpdateTopicUseCase } from '../usecases/forum/update-topic.usecase.js';
import { reorderSectionsUseCase, ReorderSectionsUseCase } from '../usecases/forum/reorder-sections.usecase.js';
import { reorderTopicsUseCase, ReorderTopicsUseCase } from '../usecases/forum/reorder-topics.usecase.js';
import { createCharacterUseCase, CreateCharacterUseCase } from '../usecases/character/create-character.usecase.js';
import { updateCharacterUseCase, UpdateCharacterUseCase } from '../usecases/character/update-character.usecase.js';
import { uploadCharacterAvatarUseCase, UploadCharacterAvatarUseCase } from '../usecases/character/upload-character-avatar.usecase.js';
import { uploadCampaignBannerUseCase, UploadCampaignBannerUseCase } from '../usecases/campaign/upload-campaign-banner.usecase.js';
import { JWTPayload } from '../types/index.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  TopicNotFoundError,
  SectionNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
} from '../errors/domain.errors.js';

const getMyCampaignsSchema = z.object({
  role: z.enum(['master', 'player']).default('master'),
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),
});

const getAllCampaignsSchema = z.object({
  includeArchived: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),
  search: z.string().optional(),
});

const getCampaignForumParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const getTopicPostsParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const getTopicPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
});

const createPostParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createPostBodySchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide'),
  persoId: z.number().int().positive().nullable().optional(),
});

const createSectionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createSectionBodySchema = z.object({
  title: z.string().min(1, 'Le titre de la section est requis'),
  defaultCollapse: z.boolean().optional(),
  banniere: z.string().optional(),
});

const updateSectionBodySchema = z.object({
  title: z.string().min(1, 'Le titre de la section ne peut pas être vide').max(500, 'Le titre ne peut pas dépasser 500 caractères').optional(),
  defaultCollapse: z.boolean().optional(),
  banniere: z.string().optional(),
});

const createTopicParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createTopicBodySchema = z.object({
  title: z.string().min(1, 'Le titre du sujet est requis'),
  stickable: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  isClosed: z.boolean().optional(),
  firstPostContent: z.string().optional(),
  persoId: z.number().int().positive().nullable().optional(),
});

const updateTopicBodySchema = z.object({
  title: z.string().min(1, 'Le titre du sujet ne peut pas être vide').max(500, 'Le titre ne peut pas dépasser 500 caractères').optional(),
  stickable: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  isClosed: z.boolean().optional(),
});

const reorderSectionsParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const reorderSectionsBodySchema = z.object({
  sectionIds: z.array(z.number().int().positive()),
});

const reorderTopicsParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const reorderTopicsBodySchema = z.object({
  sections: z.array(
    z.object({
      sectionId: z.number().int().positive(),
      topicIds: z.array(z.number().int().positive()),
    })
  ),
});

const createCharacterParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createCharacterBodySchema = z.object({
  name: z.string().min(1, 'Le nom du personnage est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  concept: z.string().max(200, 'Le concept ne peut pas dépasser 200 caractères').optional().default(''),
  avatar: z.string().max(500, "L'URL de l'avatar ne peut pas dépasser 500 caractères").optional().default(''),
  publicDescription: z.string().optional().default(''),
  privateDescription: z.string().optional().default(''),
  technical: z.string().optional().default(''),
  catId: z.number().nullable().optional().default(null),
  userId: z.number().nullable().optional().default(null),
  assignedUserId: z.number().nullable().optional().default(null),
  statut: z.number().optional().default(0),
  persoFields: z.string().nullable().optional().default(null),
  widgets: z.string().optional().default(''),
});

const updateCharacterParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  campaignId: z.coerce.number().int().positive().optional(),
});

const updateCharacterBodySchema = z.object({
  name: z.string().min(1, 'Le nom du personnage est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères').optional(),
  concept: z.string().max(200, 'Le concept ne peut pas dépasser 200 caractères').optional(),
  avatar: z.string().max(500, "L'URL de l'avatar ne peut pas dépasser 500 caractères").optional(),
  publicDescription: z.string().optional(),
  privateDescription: z.string().optional(),
  technical: z.string().optional(),
  catId: z.number().nullable().optional(),
  userId: z.number().nullable().optional(),
  assignedUserId: z.number().nullable().optional(),
  statut: z.number().optional(),
  persoFields: z.string().nullable().optional(),
  widgets: z.string().optional(),
});

export class CampaignController {
  constructor(
    private readonly campaignQueryService: CampaignQueries = campaignQueries,
    private readonly forumQueryService: ForumQueries = forumQueries,
    private readonly createPostUseCaseService: CreatePostUseCase = createPostUseCase,
    private readonly createSectionUseCaseService: CreateSectionUseCase = createSectionUseCase,
    private readonly updateSectionUseCaseService: UpdateSectionUseCase = updateSectionUseCase,
    private readonly uploadSectionBannerUseCaseService: UploadSectionBannerUseCase = uploadSectionBannerUseCase,
    private readonly createTopicUseCaseService: CreateTopicUseCase = createTopicUseCase,
    private readonly updateTopicUseCaseService: UpdateTopicUseCase = updateTopicUseCase,
    private readonly reorderSectionsUseCaseService: ReorderSectionsUseCase = reorderSectionsUseCase,
    private readonly reorderTopicsUseCaseService: ReorderTopicsUseCase = reorderTopicsUseCase,
    private readonly createCharacterUseCaseService: CreateCharacterUseCase = createCharacterUseCase,
    private readonly updateCharacterUseCaseService: UpdateCharacterUseCase = updateCharacterUseCase,
    private readonly uploadCharacterAvatarUseCaseService: UploadCharacterAvatarUseCase = uploadCharacterAvatarUseCase,
    private readonly uploadCampaignBannerUseCaseService: UploadCampaignBannerUseCase = uploadCampaignBannerUseCase
  ) {}

  /**
   * GET /api/campaigns/mine
   * Récupère la liste des campagnes de l'utilisateur connecté (maîtrisées ou joueur, avec ou sans archivées)
   */
  async getMyCampaigns(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as JWTPayload;
    const parseResult = getMyCampaignsSchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètres de requête invalides',
        details: parseResult.error.format(),
      });
    }

    const { role, includeArchived } = parseResult.data;

    try {
      const campaigns = await this.campaignQueryService.getMyCampaigns(user.id, role, includeArchived);
      return reply.status(200).send({ campaigns });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des campagnes' });
    }
  }

  /**
   * GET /api/campaigns
   * Récupère toutes les campagnes avec filtre d'archive et recherche textuelle
   */
  async getAllCampaigns(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getAllCampaignsSchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètres de requête invalides',
        details: parseResult.error.format(),
      });
    }

    const { includeArchived, search } = parseResult.data;

    try {
      const campaigns = await this.campaignQueryService.getAllCampaigns(includeArchived, search);
      return reply.status(200).send({ campaigns });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des campagnes' });
    }
  }

  /**
   * GET /api/forum
   * Récupère le forum général avec ses sections et topics (et l'état de lecture selon l'utilisateur)
   */
  async getGeneralForum(request: FastifyRequest, reply: FastifyReply) {
    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.forumQueryService.getGeneralForum(userId);
      return reply.status(200).send(data);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération du forum général' });
    }
  }

  /**
   * GET /api/campaigns/:id/forum
   * Récupère le forum d'une campagne avec ses sections et topics (et l'état de lecture selon l'utilisateur)
   */
  async getCampaignForum(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignForumParamsSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    const { id: campaignId } = parseResult.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.forumQueryService.getCampaignForum(campaignId, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération du forum de la campagne' });
    }
  }

  /**
   * GET /api/campaigns/:id/characters
   * Récupère la galerie des personnages d'une campagne avec leurs catégories
   */
  async getCampaignCharacters(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignForumParamsSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    const { id: campaignId } = parseResult.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.campaignQueryService.getCampaignCharacters(campaignId, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des personnages de la campagne' });
    }
  }

  /**
   * GET /api/topics/:id
   * Récupère les messages d'un topic avec pagination et détection automatique de la page du dernier message lu
   */
  async getTopicPosts(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getTopicPostsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const parseQuery = getTopicPostsQuerySchema.safeParse(request.query);
    if (!parseQuery.success) {
      return reply.status(400).send({
        error: 'Paramètre de page invalide',
        details: parseQuery.error.format(),
      });
    }

    const { id: topicId } = parseParams.data;
    const { page } = parseQuery.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.forumQueryService.getTopicPosts(topicId, page, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des messages du sujet' });
    }
  }

  /**
   * POST /api/topics/:id/posts
   * Crée un nouveau message dans un sujet
   */
  async createPost(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = createPostParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createPostBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de message invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: topicId } = parseParams.data;
    const { content, persoId } = parseBody.data;

    try {
      const post = await this.createPostUseCaseService.execute({
        topicId,
        userId: user.id,
        content,
        persoId: persoId ?? null,
      });

      return reply.status(201).send({ post });
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof TopicClosedError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création du message' });
    }
  }

  /**
   * POST /api/campaigns/:id/sections
   * Crée une nouvelle section dans le forum de la campagne
   */
  async createSection(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = createSectionParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createSectionBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de section invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campagneId } = parseParams.data;
    const { title, defaultCollapse, banniere } = parseBody.data;

    try {
      const section = await this.createSectionUseCaseService.execute({
        campagneId,
        userId: user.id,
        title,
        defaultCollapse,
        banniere,
      });

      return reply.status(201).send({ section });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création de la section' });
    }
  }

  /**
   * POST /api/sections/:id/topics
   * Crée un nouveau sujet dans une section
   */
  async createTopic(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = createTopicParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de section invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createTopicBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de sujet invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: sectionId } = parseParams.data;
    const { title, stickable, isPrivate, isClosed, firstPostContent, persoId } = parseBody.data;

    try {
      const topic = await this.createTopicUseCaseService.execute({
        sectionId,
        userId: user.id,
        title,
        stickable,
        isPrivate,
        isClosed,
        firstPostContent,
        persoId,
      });

      return reply.status(201).send({ topic });
    } catch (error) {
      if (error instanceof SectionNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création du sujet' });
    }
  }

  /**
   * PUT /api/campaigns/:id/sections/reorder
   * Réordonne les sections d'une campagne
   */
  async reorderSections(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = reorderSectionsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = reorderSectionsBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de réorganisation invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campagneId } = parseParams.data;
    const { sectionIds } = parseBody.data;

    try {
      const result = await this.reorderSectionsUseCaseService.execute({
        campagneId,
        userId: user.id,
        sectionIds,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError || error instanceof SectionNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la réorganisation des sections' });
    }
  }

  /**
   * PUT /api/campaigns/:id/topics/reorder
   * Réordonne les sujets et gère les déplacements entre sections d'une campagne
   */
  async reorderTopics(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = reorderTopicsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = reorderTopicsBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de réorganisation de sujets invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campagneId } = parseParams.data;
    const { sections } = parseBody.data;

    try {
      const result = await this.reorderTopicsUseCaseService.execute({
        campagneId,
        userId: user.id,
        sections,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError || error instanceof SectionNotFoundError || error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la réorganisation des sujets' });
    }
  }

  /**
   * PUT /api/sections/:id
   * PUT /api/campaigns/:id/sections/:sectionId
   * Met à jour une section (titre, collapse par défaut, bannière)
   */
  async updateSection(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as Record<string, any>;
    const sectionId = Number(params.sectionId || params.id);

    if (!sectionId || isNaN(sectionId) || sectionId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de section invalide' });
    }

    const parseBody = updateSectionBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de section invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { title, defaultCollapse, banniere } = parseBody.data;

    try {
      const section = await this.updateSectionUseCaseService.execute({
        sectionId,
        userId: user.id,
        title,
        defaultCollapse,
        banniere,
      });

      return reply.status(200).send({ section });
    } catch (error) {
      if (error instanceof SectionNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour de la section' });
    }
  }

  /**
   * POST /api/sections/:id/banner
   * POST /api/campaigns/:id/sections/:sectionId/banner
   * Téléverse une bannière pour une section de campagne (MJ)
   */
  async uploadSectionBanner(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as JWTPayload;
      const params = request.params as Record<string, any>;
      const sectionId = Number(params.sectionId || params.id);
      const campaignId = params.campaignId || params.id ? Number(params.campaignId || params.id) : undefined;

      if (!sectionId || isNaN(sectionId) || sectionId <= 0) {
        return reply.status(400).send({ error: 'Identifiant de section invalide' });
      }

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const buffer = await file.toBuffer();
      const result = await this.uploadSectionBannerUseCaseService.execute({
        sectionId,
        campagneId: campaignId,
        userId: user.id,
        filename: file.filename,
        mimetype: file.mimetype,
        content: buffer,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof SectionNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0]?.message || 'Données invalides' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du téléversement de la bannière de section' });
    }
  }

  /**
   * PUT /api/topics/:id
   * PUT /api/campaigns/:id/topics/:topicId
   * Met à jour un sujet (titre, épinglé, privé, fermé)
   */
  async updateTopic(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as Record<string, any>;
    const topicId = Number(params.topicId || params.id);

    if (!topicId || isNaN(topicId) || topicId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de sujet invalide' });
    }

    const parseBody = updateTopicBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de sujet invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { title, stickable, isPrivate, isClosed } = parseBody.data;

    try {
      const topic = await this.updateTopicUseCaseService.execute({
        topicId,
        userId: user.id,
        title,
        stickable,
        isPrivate,
        isClosed,
      });

      return reply.status(200).send({ topic });
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour du sujet' });
    }
  }

  /**
   * POST /api/campaigns/:id/characters
   * Crée un nouveau personnage dans une campagne (réservé au MJ)
   */
  async createCharacter(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = createCharacterParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createCharacterBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de personnage invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campagneId } = parseParams.data;
    const body = parseBody.data;

    try {
      const character = await this.createCharacterUseCaseService.execute({
        campagneId,
        userId: user.id,
        name: body.name,
        concept: body.concept,
        avatar: body.avatar,
        publicDescription: body.publicDescription,
        privateDescription: body.privateDescription,
        technical: body.technical,
        catId: body.catId,
        assignedUserId: body.assignedUserId !== undefined ? body.assignedUserId : body.userId,
        statut: body.statut,
        persoFields: body.persoFields,
        widgets: body.widgets,
      });

      return reply.status(201).send(character);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création du personnage' });
    }
  }

  /**
   * PUT /api/characters/:id ou PUT /api/campaigns/:campaignId/characters/:id
   * Met à jour un personnage (par le MJ ou le joueur affecté)
   */
  async updateCharacter(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = updateCharacterParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de personnage invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = updateCharacterBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de modification du personnage invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: characterId } = parseParams.data;
    const body = parseBody.data;

    try {
      const character = await this.updateCharacterUseCaseService.execute({
        characterId,
        userId: user.id,
        name: body.name,
        concept: body.concept,
        avatar: body.avatar,
        publicDescription: body.publicDescription,
        privateDescription: body.privateDescription,
        technical: body.technical,
        catId: body.catId,
        assignedUserId: body.assignedUserId !== undefined ? body.assignedUserId : body.userId,
        statut: body.statut,
        persoFields: body.persoFields,
        widgets: body.widgets,
      });

      return reply.status(200).send(character);
    } catch (error) {
      if (error instanceof CharacterNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour du personnage' });
    }
  }

  /**
   * GET /api/campaigns/:id/participants
   * Récupère la liste des participants d'une campagne
   */
  async getCampaignParticipants(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignForumParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    const { id: campaignId } = parseResult.data;

    try {
      const participants = await this.campaignQueryService.getCampaignParticipants(campaignId);
      return reply.status(200).send({ participants });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des participants' });
    }
  }

  /**
   * POST /api/campaigns/:id/characters/upload-avatar
   * Téléverser une image de portrait pour un personnage de la campagne
   */
  async uploadCharacterAvatar(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as JWTPayload;
      const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
      const { id: campaignId } = paramsSchema.parse(request.params);

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const buffer = await file.toBuffer();
      const result = await this.uploadCharacterAvatarUseCaseService.execute({
        campagneId: campaignId,
        userId: user.id,
        filename: file.filename,
        mimetype: file.mimetype,
        content: buffer,
      });

      return reply.status(201).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0]?.message || 'Données invalides' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du téléversement du portrait' });
    }
  }

  /**
   * POST /api/campaigns/:id/banner
   * POST /api/campaigns/:id/upload-banner
   * Téléverser une nouvelle image de bannière pour la campagne (MJ uniquement)
   */
  async uploadCampaignBanner(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as JWTPayload;
      const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
      const { id: campaignId } = paramsSchema.parse(request.params);

      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: 'Aucun fichier fourni' });
      }

      const buffer = await file.toBuffer();
      const result = await this.uploadCampaignBannerUseCaseService.execute({
        campagneId: campaignId,
        userId: user.id,
        filename: file.filename,
        mimetype: file.mimetype,
        content: buffer,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0]?.message || 'Données invalides' });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du téléversement de la bannière' });
    }
  }

  /**
   * Déclaration des routes du contrôleur
   */
  registerRoutes(app: FastifyInstance) {
    // Route publique pour voir toutes les campagnes
    app.get('/api/campaigns', (req, rep) => this.getAllCampaigns(req, rep));

    // Route authentifiée pour voir ses propres campagnes
    app.get(
      '/api/campaigns/mine',
      { preHandler: [app.authenticate] },
      (req, rep) => this.getMyCampaigns(req, rep)
    );

    // Route pour voir le forum général (accessible public avec statut de lecture si connecté)
    app.get('/api/forum', (req, rep) => this.getGeneralForum(req, rep));

    // Route pour voir le forum d'une campagne (accessible public avec statut de lecture si connecté)
    app.get('/api/campaigns/:id/forum', (req, rep) => this.getCampaignForum(req, rep));

    // Route pour voir la galerie des personnages d'une campagne
    app.get('/api/campaigns/:id/characters', (req, rep) => this.getCampaignCharacters(req, rep));
    app.get('/api/campaigns/:id/gallery', (req, rep) => this.getCampaignCharacters(req, rep));

    // Route pour voir les participants d'une campagne
    app.get('/api/campaigns/:id/participants', (req, rep) => this.getCampaignParticipants(req, rep));

    // Route authentifiée pour créer un personnage (MJ)
    app.post(
      '/api/campaigns/:id/characters',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createCharacter(req, rep)
    );

    // Route authentifiée pour téléverser un portrait de personnage
    app.post(
      '/api/campaigns/:id/characters/upload-avatar',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadCharacterAvatar(req, rep)
    );
    app.post(
      '/api/campaigns/:id/upload',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadCharacterAvatar(req, rep)
    );

    // Route authentifiée pour téléverser la bannière d'une campagne (MJ)
    app.post(
      '/api/campaigns/:id/banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadCampaignBanner(req, rep)
    );
    app.post(
      '/api/campaigns/:id/upload-banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadCampaignBanner(req, rep)
    );

    // Routes authentifiées pour modifier un personnage (MJ ou joueur assigné)
    app.put(
      '/api/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCharacter(req, rep)
    );
    app.patch(
      '/api/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCharacter(req, rep)
    );
    app.put(
      '/api/campaigns/:campaignId/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCharacter(req, rep)
    );
    app.patch(
      '/api/campaigns/:campaignId/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCharacter(req, rep)
    );

    // Route pour voir les messages d'un sujet (accessible public avec statut de lecture si connecté)
    app.get('/api/topics/:id', (req, rep) => this.getTopicPosts(req, rep));
    app.get('/api/campaigns/:campaignId/topics/:id', (req, rep) => this.getTopicPosts(req, rep));

    // Route authentifiée pour poster un message dans un sujet
    app.post(
      '/api/topics/:id/posts',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createPost(req, rep)
    );

    // Routes authentifiées d'administration du forum de campagne (pour le MJ)
    app.post(
      '/api/campaigns/:id/sections',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createSection(req, rep)
    );

    app.post(
      '/api/sections/:id/topics',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createTopic(req, rep)
    );

    // Routes authentifiées pour modifier une section
    app.put(
      '/api/sections/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateSection(req, rep)
    );
    app.patch(
      '/api/sections/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateSection(req, rep)
    );
    app.put(
      '/api/campaigns/:id/sections/:sectionId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateSection(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/sections/:sectionId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateSection(req, rep)
    );

    // Routes authentifiées pour téléverser la bannière d'une section (MJ)
    app.post(
      '/api/sections/:id/banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadSectionBanner(req, rep)
    );
    app.post(
      '/api/sections/:id/upload-banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadSectionBanner(req, rep)
    );
    app.post(
      '/api/campaigns/:id/sections/:sectionId/banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadSectionBanner(req, rep)
    );
    app.post(
      '/api/campaigns/:id/sections/:sectionId/upload-banner',
      { preHandler: [app.authenticate] },
      (req, rep) => this.uploadSectionBanner(req, rep)
    );

    // Routes authentifiées pour modifier un sujet
    app.put(
      '/api/topics/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateTopic(req, rep)
    );
    app.patch(
      '/api/topics/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateTopic(req, rep)
    );
    app.put(
      '/api/campaigns/:id/topics/:topicId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateTopic(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/topics/:topicId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateTopic(req, rep)
    );

    app.put(
      '/api/campaigns/:id/sections/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderSections(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/sections/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderSections(req, rep)
    );

    app.put(
      '/api/campaigns/:id/topics/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderTopics(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/topics/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderTopics(req, rep)
    );
  }
}

export const campaignController = new CampaignController();

export async function campaignRoutes(app: FastifyInstance) {
  campaignController.registerRoutes(app);
}
