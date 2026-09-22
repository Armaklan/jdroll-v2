import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { campaignQueries, CampaignQueries } from '../queries/campaign.queries.js';
import { forumQueries, ForumQueries } from '../queries/forum.queries.js';
import { createPostUseCase, CreatePostUseCase } from '../usecases/forum/create-post.usecase.js';
import { saveDraftUseCase, SaveDraftUseCase } from '../usecases/forum/save-draft.usecase.js';
import { deleteDraftUseCase, DeleteDraftUseCase } from '../usecases/forum/delete-draft.usecase.js';
import { updatePostUseCase, UpdatePostUseCase } from '../usecases/forum/update-post.usecase.js';
import { deletePostUseCase, DeletePostUseCase } from '../usecases/forum/delete-post.usecase.js';
import { rollDiceUseCase, RollDiceUseCase } from '../usecases/forum/roll-dice.usecase.js';
import { rollDiceTowerUseCase, RollDiceTowerUseCase } from '../usecases/campaign/roll-dice-tower.usecase.js';
import { createCampaignUseCase, CreateCampaignUseCase } from '../usecases/campaign/create-campaign.usecase.js';
import { updateCampaignUseCase, UpdateCampaignUseCase } from '../usecases/campaign/update-campaign.usecase.js';
import { joinCampaignUseCase, JoinCampaignUseCase } from '../usecases/campaign/join-campaign.usecase.js';
import { validateParticipantUseCase, ValidateParticipantUseCase } from '../usecases/campaign/validate-participant.usecase.js';
import { rejectParticipantUseCase, RejectParticipantUseCase } from '../usecases/campaign/reject-participant.usecase.js';
import { createSectionUseCase, CreateSectionUseCase } from '../usecases/forum/create-section.usecase.js';
import { updateSectionUseCase, UpdateSectionUseCase } from '../usecases/forum/update-section.usecase.js';
import { deleteSectionUseCase, DeleteSectionUseCase } from '../usecases/forum/delete-section.usecase.js';
import { uploadSectionBannerUseCase, UploadSectionBannerUseCase } from '../usecases/forum/upload-section-banner.usecase.js';
import { createTopicUseCase, CreateTopicUseCase } from '../usecases/forum/create-topic.usecase.js';
import { updateTopicUseCase, UpdateTopicUseCase } from '../usecases/forum/update-topic.usecase.js';
import { deleteTopicUseCase, DeleteTopicUseCase } from '../usecases/forum/delete-topic.usecase.js';
import { reorderSectionsUseCase, ReorderSectionsUseCase } from '../usecases/forum/reorder-sections.usecase.js';
import { reorderTopicsUseCase, ReorderTopicsUseCase } from '../usecases/forum/reorder-topics.usecase.js';
import { createCharacterUseCase, CreateCharacterUseCase } from '../usecases/character/create-character.usecase.js';
import { updateCharacterUseCase, UpdateCharacterUseCase } from '../usecases/character/update-character.usecase.js';
import { deleteCharacterUseCase, DeleteCharacterUseCase } from '../usecases/character/delete-character.usecase.js';
import { createPnjCategoryUseCase, CreatePnjCategoryUseCase } from '../usecases/character/create-pnj-category.usecase.js';
import { updatePnjCategoryUseCase, UpdatePnjCategoryUseCase } from '../usecases/character/update-pnj-category.usecase.js';
import { deletePnjCategoryUseCase, DeletePnjCategoryUseCase } from '../usecases/character/delete-pnj-category.usecase.js';
import { uploadCharacterAvatarUseCase, UploadCharacterAvatarUseCase } from '../usecases/character/upload-character-avatar.usecase.js';
import { uploadCampaignBannerUseCase, UploadCampaignBannerUseCase } from '../usecases/campaign/upload-campaign-banner.usecase.js';
import { observeCampaignUseCase, ObserveCampaignUseCase } from '../usecases/campaign/observe-campaign.usecase.js';
import { unobserveCampaignUseCase, UnobserveCampaignUseCase } from '../usecases/campaign/unobserve-campaign.usecase.js';
import { setCampaignAlertUseCase, SetCampaignAlertUseCase } from '../usecases/campaign/set-campaign-alert.usecase.js';
import { removeCampaignAlertUseCase, RemoveCampaignAlertUseCase } from '../usecases/campaign/remove-campaign-alert.usecase.js';
import { noteQueries, NoteQueries } from '../queries/note.queries.js';
import { createNoteUseCase, CreateNoteUseCase } from '../usecases/note/create-note.usecase.js';
import { updateNoteUseCase, UpdateNoteUseCase } from '../usecases/note/update-note.usecase.js';
import { deleteNoteUseCase, DeleteNoteUseCase } from '../usecases/note/delete-note.usecase.js';
import { JWTPayload } from '../types/index.js';
import {
  CampaignNotFoundError,
  CharacterNotFoundError,
  CategoryNotFoundError,
  TopicNotFoundError,
  PostNotFoundError,
  SectionNotFoundError,
  TopicClosedError,
  ForbiddenError,
  ValidationError,
  UserNotFoundError,
  NoteNotFoundError,
} from '../errors/domain.errors.js';

const getMyCampaignsSchema = z.object({
  role: z.enum(['all', 'master', 'player', 'observer']).default('all'),
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
  includePreparation: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val === 'true' || val === '1';
      }
      return Boolean(val);
    }, z.boolean())
    .default(false),
  search: z.string().optional(),
});

const getCampaignParamsSchema = z.object({
  id: z.coerce.number().int().nonnegative(),
});

const participantActionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
});

const createCampaignBodySchema = z.object({
  name: z.string().min(1, 'Le nom de la campagne est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  systeme: z.string().max(100, 'Le système ne peut pas dépasser 100 caractères').optional().default(''),
  univers: z.string().max(100, 'L’univers ne peut pas dépasser 100 caractères').optional().default(''),
  description: z.string().optional().default(''),
  nbJoueurs: z.coerce.number().int().min(1, 'Il faut au moins 1 joueur').max(50, 'Le nombre de joueurs maximum est 50').default(4),
  banniere: z.string().optional(),
  banniereForum: z.string().nullable().optional(),
  statut: z.coerce.number().int().min(0).max(3).optional(),
  isRecrutementOpen: z.boolean().optional(),
  rythme: z.coerce.number().int().min(0).max(4).optional(),
  rp: z.coerce.number().int().min(0).max(3).optional(),
  isMultiCharacter: z.boolean().optional(),
  dialogueColor: z.string().nullable().optional(),
  penseeColor: z.string().nullable().optional(),
  rp1Color: z.string().nullable().optional(),
  rp2Color: z.string().nullable().optional(),
  quoteColor: z.string().nullable().optional(),
  sidebarColor: z.string().nullable().optional(),
  oddLineColor: z.string().nullable().optional(),
  evenLineColor: z.string().nullable().optional(),
  textColor: z.string().nullable().optional(),
  linkColor: z.string().nullable().optional(),
  linkSidebarColor: z.string().nullable().optional(),
  hr: z.string().nullable().optional(),
  width: z.string().nullable().optional(),
  defaultDice: z.string().nullable().optional(),
  defaultPersoId: z
    .preprocess((val) => (val === '' || val === 0 || val === '0' ? null : val), z.coerce.number().int().positive().nullable().optional()),
  template: z.string().nullable().optional(),
  templateHtml: z.string().nullable().optional(),
  templateImg: z.string().nullable().optional(),
  templateFields: z.string().nullable().optional(),
  widgets: z.string().nullable().optional(),
});

const updateCampaignBodySchema = createCampaignBodySchema.partial();

const getCampaignForumParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const searchCampaignQuerySchema = z.object({
  q: z.string().optional().default(''),
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

const saveDraftBodySchema = z.object({
  content: z.string().optional().default(''),
  persoId: z.coerce.number().int().positive().nullable().optional(),
});

const updatePostParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const updatePostBodySchema = z.object({
  content: z.string().min(1, 'Le message ne peut pas être vide'),
  persoId: z.number().int().positive().nullable().optional(),
});

const deletePostParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const rollDiceParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const rollDiceBodySchema = z.object({
  formula: z.string().min(1, 'La formule de dé est requise'),
  description: z.string().optional(),
});

const createSectionParamsSchema = z.object({
  id: z.coerce.number().int().min(0).optional(),
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
  isPrivate: z.union([z.boolean(), z.coerce.number().int().min(0).max(2)]).optional(),
  canReadUserIds: z.array(z.coerce.number().int().positive()).optional(),
  isClosed: z.boolean().optional(),
  firstPostContent: z.string().optional(),
  persoId: z.number().int().positive().nullable().optional(),
});

const updateTopicBodySchema = z.object({
  title: z.string().min(1, 'Le titre du sujet ne peut pas être vide').max(500, 'Le titre ne peut pas dépasser 500 caractères').optional(),
  stickable: z.boolean().optional(),
  isPrivate: z.union([z.boolean(), z.coerce.number().int().min(0).max(2)]).optional(),
  canReadUserIds: z.array(z.coerce.number().int().positive()).optional(),
  isClosed: z.boolean().optional(),
});

const reorderSectionsParamsSchema = z.object({
  id: z.coerce.number().int().min(0).optional(),
});

const reorderSectionsBodySchema = z.object({
  sectionIds: z.array(z.number().int().positive()),
});

const reorderTopicsParamsSchema = z.object({
  id: z.coerce.number().int().min(0).optional(),
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

const deleteCharacterParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  campaignId: z.coerce.number().int().positive().optional(),
});

const createPnjCategoryParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createPnjCategoryBodySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis').max(200, 'Le nom ne peut pas dépasser 200 caractères'),
  defaultCollapse: z.boolean().optional().default(false),
});

const updatePnjCategoryParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.id !== undefined || data.categoryId !== undefined, {
    message: 'Identifiant de catégorie manquant',
  });

const updatePnjCategoryBodySchema = z.object({
  name: z.string().min(1, 'Le nom de la catégorie est requis').max(200, 'Le nom ne peut pas dépasser 200 caractères').optional(),
  defaultCollapse: z.boolean().optional(),
});

const noteParamsSchema = z.object({
  id: z.coerce.number().int().nonnegative(),
  noteId: z.coerce.number().int().positive(),
});

const createNoteBodySchema = z.object({
  content: z.string().optional().default(''),
});

const updateNoteBodySchema = z.object({
  content: z.string(),
});

const deletePnjCategoryParamsSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.id !== undefined || data.categoryId !== undefined, {
    message: 'Identifiant de catégorie manquant',
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
    private readonly saveDraftUseCaseService: SaveDraftUseCase = saveDraftUseCase,
    private readonly deleteDraftUseCaseService: DeleteDraftUseCase = deleteDraftUseCase,
    private readonly updatePostUseCaseService: UpdatePostUseCase = updatePostUseCase,
    private readonly deletePostUseCaseService: DeletePostUseCase = deletePostUseCase,
    private readonly rollDiceUseCaseService: RollDiceUseCase = rollDiceUseCase,
    private readonly rollDiceTowerUseCaseService: RollDiceTowerUseCase = rollDiceTowerUseCase,
    private readonly createCampaignUseCaseService: CreateCampaignUseCase = createCampaignUseCase,
    private readonly updateCampaignUseCaseService: UpdateCampaignUseCase = updateCampaignUseCase,
    private readonly createSectionUseCaseService: CreateSectionUseCase = createSectionUseCase,
    private readonly updateSectionUseCaseService: UpdateSectionUseCase = updateSectionUseCase,
    private readonly deleteSectionUseCaseService: DeleteSectionUseCase = deleteSectionUseCase,
    private readonly uploadSectionBannerUseCaseService: UploadSectionBannerUseCase = uploadSectionBannerUseCase,
    private readonly createTopicUseCaseService: CreateTopicUseCase = createTopicUseCase,
    private readonly updateTopicUseCaseService: UpdateTopicUseCase = updateTopicUseCase,
    private readonly deleteTopicUseCaseService: DeleteTopicUseCase = deleteTopicUseCase,
    private readonly reorderSectionsUseCaseService: ReorderSectionsUseCase = reorderSectionsUseCase,
    private readonly reorderTopicsUseCaseService: ReorderTopicsUseCase = reorderTopicsUseCase,
    private readonly createCharacterUseCaseService: CreateCharacterUseCase = createCharacterUseCase,
    private readonly updateCharacterUseCaseService: UpdateCharacterUseCase = updateCharacterUseCase,
    private readonly deleteCharacterUseCaseService: DeleteCharacterUseCase = deleteCharacterUseCase,
    private readonly createPnjCategoryUseCaseService: CreatePnjCategoryUseCase = createPnjCategoryUseCase,
    private readonly updatePnjCategoryUseCaseService: UpdatePnjCategoryUseCase = updatePnjCategoryUseCase,
    private readonly deletePnjCategoryUseCaseService: DeletePnjCategoryUseCase = deletePnjCategoryUseCase,
    private readonly uploadCharacterAvatarUseCaseService: UploadCharacterAvatarUseCase = uploadCharacterAvatarUseCase,
    private readonly uploadCampaignBannerUseCaseService: UploadCampaignBannerUseCase = uploadCampaignBannerUseCase,
    private readonly joinCampaignUseCaseService: JoinCampaignUseCase = joinCampaignUseCase,
    private readonly validateParticipantUseCaseService: ValidateParticipantUseCase = validateParticipantUseCase,
    private readonly rejectParticipantUseCaseService: RejectParticipantUseCase = rejectParticipantUseCase,
    private readonly observeCampaignUseCaseService: ObserveCampaignUseCase = observeCampaignUseCase,
    private readonly unobserveCampaignUseCaseService: UnobserveCampaignUseCase = unobserveCampaignUseCase,
    private readonly setCampaignAlertUseCaseService: SetCampaignAlertUseCase = setCampaignAlertUseCase,
    private readonly removeCampaignAlertUseCaseService: RemoveCampaignAlertUseCase = removeCampaignAlertUseCase,
    private readonly noteQueryService: NoteQueries = noteQueries,
    private readonly createNoteUseCaseService: CreateNoteUseCase = createNoteUseCase,
    private readonly updateNoteUseCaseService: UpdateNoteUseCase = updateNoteUseCase,
    private readonly deleteNoteUseCaseService: DeleteNoteUseCase = deleteNoteUseCase
  ) {}

  /**
   * GET /api/campaigns/:id
   * Récupère les détails d'une campagne par son identifiant
   */
  async getCampaignById(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignParamsSchema.safeParse(request.params);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur anonyme
    }

    try {
      const campaign = await this.campaignQueryService.getCampaignById(parseResult.data.id, userId);
      return reply.status(200).send({ campaign });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération de la campagne' });
    }
  }

  /**
   * POST /api/campaigns
   * Crée une nouvelle campagne avec sa configuration associée
   */
  async createCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = createCampaignBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Données de campagne invalides',
        details: parseResult.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const campaign = await this.createCampaignUseCaseService.execute({
        mjId: user.id,
        ...parseResult.data,
      });

      return reply.status(201).send({ campaign });
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la création de la campagne' });
    }
  }

  /**
   * PUT /api/campaigns/:id
   * Met à jour une campagne et sa configuration associée
   */
  async updateCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = updateCampaignBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de mise à jour invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const campaign = await this.updateCampaignUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
        ...parseBody.data,
      });

      return reply.status(200).send({ campaign });
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
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour de la campagne' });
    }
  }

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
   * Récupère toutes les campagnes avec filtre d'archive, de préparation (admin) et recherche textuelle
   */
  async getAllCampaigns(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getAllCampaignsSchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Paramètres de requête invalides',
        details: parseResult.error.format(),
      });
    }

    const { includeArchived, includePreparation, search } = parseResult.data;

    let userProfil: number | undefined;
    try {
      await request.jwtVerify();
      userProfil = (request.user as JWTPayload)?.profil;
    } catch {
      // Utilisateur anonyme
    }

    // Seuls les administrateurs (profil === 2) peuvent voir les campagnes en préparation
    const allowedPreparation = userProfil === 2 && includePreparation;

    try {
      const campaigns = await this.campaignQueryService.getAllCampaigns(includeArchived, search, allowedPreparation);
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
   * GET /api/campaigns/:id/search
   * Recherche dans la campagne (topics, cartes, personnages) selon les permissions de l'utilisateur
   */
  async searchCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = getCampaignForumParamsSchema.safeParse(request.params);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseResult.error.format(),
      });
    }

    const parseQuery = searchCampaignQuerySchema.safeParse(request.query);
    const q = parseQuery.success ? parseQuery.data.q : '';

    const { id: campaignId } = parseResult.data;

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.campaignQueryService.searchCampaign(campaignId, q, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la recherche dans la campagne' });
    }
  }

  /**
   * GET /api/characters/:id ou GET /api/campaigns/:campaignId/characters/:id
   * Récupère la fiche détaillée d'un personnage avec les configurations de campagne associées
   */
  async getCharacter(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as { id?: string; characterId?: string };
    const characterId = Number(params.characterId || params.id);
    if (isNaN(characterId) || characterId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de personnage invalide' });
    }

    let userId: number | undefined;
    try {
      await request.jwtVerify();
      userId = (request.user as JWTPayload)?.id;
    } catch {
      // Utilisateur non connecté / invité
    }

    try {
      const data = await this.campaignQueryService.getCharacter(characterId, userId);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CharacterNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération du personnage' });
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
   * PUT / POST /api/topics/:id/draft
   * Sauvegarde le brouillon de message d'un utilisateur pour un sujet
   */
  async saveDraft(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getTopicPostsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = saveDraftBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de brouillon invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: topicId } = parseParams.data;
    const { content, persoId } = parseBody.data;

    try {
      const draft = await this.saveDraftUseCaseService.execute({
        topicId,
        userId: user.id,
        content: content ?? '',
        persoId: persoId ?? null,
      });

      return reply.status(200).send({ draft });
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
      return reply.status(500).send({ error: 'Erreur lors de la sauvegarde du brouillon' });
    }
  }

  /**
   * DELETE /api/topics/:id/draft
   * Supprime le brouillon de message d'un utilisateur pour un sujet
   */
  async deleteDraft(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getTopicPostsParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: topicId } = parseParams.data;

    try {
      await this.deleteDraftUseCaseService.execute({
        topicId,
        userId: user.id,
      });

      return reply.status(200).send({ success: true });
    } catch (error) {
      if (error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression du brouillon' });
    }
  }

  /**
   * PUT / PATCH /api/posts/:id
   * Met à jour un message
   */
  async updatePost(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = updatePostParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de message invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = updatePostBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de message invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: postId } = parseParams.data;
    const { content, persoId } = parseBody.data;

    try {
      const post = await this.updatePostUseCaseService.execute({
        postId,
        userId: user.id,
        userProfil: user.profil,
        content,
        persoId,
      });

      return reply.status(200).send({ post });
    } catch (error) {
      if (error instanceof PostNotFoundError || error instanceof TopicNotFoundError) {
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
      return reply.status(500).send({ error: 'Erreur lors de la modification du message' });
    }
  }

  /**
   * DELETE /api/posts/:id
   * Supprime un message
   */
  async deletePost(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = deletePostParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de message invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: postId } = parseParams.data;

    try {
      const result = await this.deletePostUseCaseService.execute({
        postId,
        userId: user.id,
        userProfil: user.profil,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof PostNotFoundError || error instanceof TopicNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof TopicClosedError) {
        return reply.status(400).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression du message' });
    }
  }

  /**
   * POST /api/topics/:id/dice-roll
   * Lance un jet de dés dans un sujet
   */
  async rollDice(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = rollDiceParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de sujet invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = rollDiceBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de jet de dé invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: topicId } = parseParams.data;
    const { formula, description } = parseBody.data;

    try {
      const result = await this.rollDiceUseCaseService.execute({
        topicId,
        userId: user.id,
        formula,
        description,
      });

      return reply.status(201).send(result);
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
      return reply.status(500).send({ error: 'Erreur lors de l’exécution du jet de dés' });
    }
  }

  /**
   * GET /api/campaigns/:id/dice-rolls
   * Récupère les 20 derniers jets de dés de la campagne (Tour à dés)
   * - MJ : tous les jets de la campagne
   * - Joueur : uniquement ses propres jets de la campagne
   */
  async getCampaignDiceRolls(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignForumParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campaignId } = parseParams.data;

    try {
      const rolls = await this.campaignQueryService.getCampaignDiceRolls(campaignId, user.id);
      return reply.status(200).send({ rolls });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des jets de dés' });
    }
  }

  /**
   * POST /api/campaigns/:id/dice-rolls
   * Lance un jet de dés dans la tour à dés de la campagne (sans créer de post)
   */
  async rollDiceTower(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignForumParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = rollDiceBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de jet de dé invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campaignId } = parseParams.data;
    const { formula, description } = parseBody.data;

    try {
      const result = await this.rollDiceTowerUseCaseService.execute({
        campaignId,
        userId: user.id,
        formula,
        description,
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
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l’exécution du jet de dés' });
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
    const campagneId = parseParams.data.id !== undefined && parseParams.data.id !== null ? parseParams.data.id : 0;
    const { title, defaultCollapse, banniere } = parseBody.data;

    try {
      const section = await this.createSectionUseCaseService.execute({
        campagneId,
        userId: user.id,
        userProfil: user.profil,
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
    const { title, stickable, isPrivate, canReadUserIds, isClosed, firstPostContent, persoId } = parseBody.data;

    try {
      const topic = await this.createTopicUseCaseService.execute({
        sectionId,
        userId: user.id,
        userProfil: user.profil,
        title,
        stickable,
        isPrivate,
        canReadUserIds,
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
    const campagneId = parseParams.data.id !== undefined && parseParams.data.id !== null ? parseParams.data.id : 0;
    const { sectionIds } = parseBody.data;

    try {
      const result = await this.reorderSectionsUseCaseService.execute({
        campagneId,
        userId: user.id,
        userProfil: user.profil,
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
    const campagneId = parseParams.data.id !== undefined && parseParams.data.id !== null ? parseParams.data.id : 0;
    const { sections } = parseBody.data;

    try {
      const result = await this.reorderTopicsUseCaseService.execute({
        campagneId,
        userId: user.id,
        userProfil: user.profil,
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
        userProfil: user.profil,
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
   * DELETE /api/sections/:id
   * DELETE /api/campaigns/:id/sections/:sectionId
   * Supprime une section
   */
  async deleteSection(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as Record<string, any>;
    const sectionId = Number(params.sectionId || params.id);

    if (!sectionId || isNaN(sectionId) || sectionId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de section invalide' });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.deleteSectionUseCaseService.execute({
        sectionId,
        userId: user.id,
        userProfil: user.profil,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof SectionNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression de la section' });
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
        userProfil: user.profil,
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
    const { title, stickable, isPrivate, canReadUserIds, isClosed } = parseBody.data;

    try {
      const topic = await this.updateTopicUseCaseService.execute({
        topicId,
        userId: user.id,
        userProfil: user.profil,
        title,
        stickable,
        isPrivate,
        canReadUserIds,
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
   * DELETE /api/topics/:id
   * DELETE /api/campaigns/:id/topics/:topicId
   * Supprime un sujet
   */
  async deleteTopic(request: FastifyRequest, reply: FastifyReply) {
    const params = request.params as Record<string, any>;
    const topicId = Number(params.topicId || params.id);

    if (!topicId || isNaN(topicId) || topicId <= 0) {
      return reply.status(400).send({ error: 'Identifiant de sujet invalide' });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.deleteTopicUseCaseService.execute({
        topicId,
        userId: user.id,
        userProfil: user.profil,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof TopicNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression du sujet' });
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
   * DELETE /api/characters/:id ou DELETE /api/campaigns/:campaignId/characters/:id
   * Supprime un personnage (par le MJ)
   */
  async deleteCharacter(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = deleteCharacterParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de personnage invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: characterId } = parseParams.data;

    try {
      const result = await this.deleteCharacterUseCaseService.execute({
        characterId,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CharacterNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression du personnage' });
    }
  }

  /**
   * POST /api/campaigns/:id/categories
   * Crée une catégorie de PNJ (par le MJ)
   */
  async createPnjCategory(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = createPnjCategoryParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createPnjCategoryBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de catégorie invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const { id: campagneId } = parseParams.data;
    const body = parseBody.data;

    try {
      const category = await this.createPnjCategoryUseCaseService.execute({
        campagneId,
        userId: user.id,
        name: body.name,
        defaultCollapse: body.defaultCollapse,
      });

      return reply.status(201).send({ category });
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
      return reply.status(500).send({ error: 'Erreur lors de la création de la catégorie' });
    }
  }

  /**
   * PUT /api/categories/:id ou PUT /api/campaigns/:id/categories/:categoryId
   * Modifie une catégorie de PNJ (par le MJ)
   */
  async updatePnjCategory(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = updatePnjCategoryParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de catégorie invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = updatePnjCategoryBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de modification de catégorie invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const categoryId = parseParams.data.categoryId ?? parseParams.data.id!;
    const body = parseBody.data;

    try {
      const category = await this.updatePnjCategoryUseCaseService.execute({
        categoryId,
        userId: user.id,
        name: body.name,
        defaultCollapse: body.defaultCollapse,
      });

      return reply.status(200).send({ category });
    } catch (error) {
      if (error instanceof CategoryNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la modification de la catégorie' });
    }
  }

  /**
   * DELETE /api/categories/:id ou DELETE /api/campaigns/:id/categories/:categoryId
   * Supprime une catégorie de PNJ (par le MJ)
   */
  async deletePnjCategory(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = deletePnjCategoryParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de catégorie invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;
    const categoryId = parseParams.data.categoryId ?? parseParams.data.id!;

    try {
      const result = await this.deletePnjCategoryUseCaseService.execute({
        categoryId,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CategoryNotFoundError || error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression de la catégorie' });
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
   * POST /api/campaigns/:id/join
   * Permet à un utilisateur connecté de rejoindre une campagne
   */
  async joinCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.joinCampaignUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l’inscription à la campagne' });
    }
  }

  /**
   * POST /api/campaigns/:id/participants/:userId/accept
   * Valide l'inscription d'un joueur en attente (MJ)
   */
  async validateParticipant(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = participantActionParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Paramètres invalides',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.validateParticipantUseCaseService.execute({
        campaignId: parseParams.data.id,
        mjId: user.id,
        targetUserId: parseParams.data.userId,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError || error instanceof UserNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la validation de l’inscription' });
    }
  }

  /**
   * POST /api/campaigns/:id/participants/:userId/reject
   * Refuse l'inscription d'un joueur en attente (MJ)
   */
  async rejectParticipant(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = participantActionParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Paramètres invalides',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.rejectParticipantUseCaseService.execute({
        campaignId: parseParams.data.id,
        mjId: user.id,
        targetUserId: parseParams.data.userId,
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
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors du refus de l’inscription' });
    }
  }

  /**
   * GET /api/campaigns/:id/pending-participants
   * Récupère la liste des inscriptions en attente de validation (MJ)
   */
  async getPendingParticipants(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const pendingParticipants = await this.campaignQueryService.getPendingCampaignParticipants(
        parseParams.data.id,
        user.id
      );

      return reply.status(200).send({ pendingParticipants });
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des inscriptions en attente' });
    }
  }

  /**
   * POST /api/campaigns/:id/observe
   * Permet à un utilisateur connecté d'observer une campagne
   */
  async observeCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.observeCampaignUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l’observation de la campagne' });
    }
  }

  /**
   * DELETE /api/campaigns/:id/observe (ou POST /api/campaigns/:id/unobserve)
   * Permet à un utilisateur connecté de ne plus observer une campagne
   */
  async unobserveCampaign(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.unobserveCampaignUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de l’arrêt de l’observation' });
    }
  }

  /**
   * POST /api/campaigns/:id/alert
   * Permet à un joueur ou MJ de marquer une campagne « À traiter »
   */
  async setCampaignAlert(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.setCampaignAlertUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
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
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à traiter de la campagne' });
    }
  }

  /**
   * DELETE /api/campaigns/:id/alert (ou POST /api/campaigns/:id/unalert)
   * Permet de retirer l'état « À traiter » d'une campagne
   */
  async removeCampaignAlert(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const result = await this.removeCampaignAlertUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
      });

      return reply.status(200).send(result);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression de l’alerte' });
    }
  }

  /**
   * GET /api/campaigns/:id/notes
   * Récupère les notes personnelles d'un joueur ou MJ pour cette campagne
   */
  async getCampaignNotes(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const data = await this.noteQueryService.getCampaignNotes(parseParams.data.id, user.id);
      return reply.status(200).send(data);
    } catch (error) {
      if (error instanceof CampaignNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la récupération des notes' });
    }
  }

  /**
   * POST /api/campaigns/:id/notes
   * Crée une nouvelle note personnelle pour un joueur ou MJ
   */
  async createCampaignNote(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = getCampaignParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Identifiant de campagne invalide',
        details: parseParams.error.format(),
      });
    }

    const parseBody = createNoteBodySchema.safeParse(request.body ?? {});
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de note invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const note = await this.createNoteUseCaseService.execute({
        campaignId: parseParams.data.id,
        userId: user.id,
        content: parseBody.data.content,
      });

      return reply.status(201).send({ note });
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
      return reply.status(500).send({ error: 'Erreur lors de la création de la note' });
    }
  }

  /**
   * PUT /api/campaigns/:id/notes/:noteId
   * Met à jour une note personnelle
   */
  async updateCampaignNote(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = noteParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Paramètres invalides',
        details: parseParams.error.format(),
      });
    }

    const parseBody = updateNoteBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.status(400).send({
        error: 'Données de note invalides',
        details: parseBody.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      const note = await this.updateNoteUseCaseService.execute({
        id: parseParams.data.noteId,
        campaignId: parseParams.data.id,
        userId: user.id,
        content: parseBody.data.content,
      });

      return reply.status(200).send({ note });
    } catch (error) {
      if (error instanceof CampaignNotFoundError || error instanceof NoteNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message, details: error.details });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la mise à jour de la note' });
    }
  }

  /**
   * DELETE /api/campaigns/:id/notes/:noteId
   * Supprime une note personnelle
   */
  async deleteCampaignNote(request: FastifyRequest, reply: FastifyReply) {
    const parseParams = noteParamsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.status(400).send({
        error: 'Paramètres invalides',
        details: parseParams.error.format(),
      });
    }

    const user = request.user as JWTPayload;

    try {
      await this.deleteNoteUseCaseService.execute({
        id: parseParams.data.noteId,
        campaignId: parseParams.data.id,
        userId: user.id,
      });

      return reply.status(200).send({ success: true });
    } catch (error) {
      if (error instanceof CampaignNotFoundError || error instanceof NoteNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      if (error instanceof ForbiddenError) {
        return reply.status(403).send({ error: error.message });
      }
      request.log.error(error);
      return reply.status(500).send({ error: 'Erreur lors de la suppression de la note' });
    }
  }

  /**
   * Déclaration des routes du contrôleur
   */
  registerRoutes(app: FastifyInstance) {
    // Route publique pour voir toutes les campagnes
    app.get('/api/campaigns', (req, rep) => this.getAllCampaigns(req, rep));

    // Routes authentifiées pour consulter, créer, modifier et supprimer les notes de campagne
    app.get(
      '/api/campaigns/:id/notes',
      { preHandler: [app.authenticate] },
      (req, rep) => this.getCampaignNotes(req, rep)
    );
    app.post(
      '/api/campaigns/:id/notes',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createCampaignNote(req, rep)
    );
    app.put(
      '/api/campaigns/:id/notes/:noteId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCampaignNote(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/notes/:noteId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteCampaignNote(req, rep)
    );

    // Route authentifiée pour rejoindre une campagne
    app.post(
      '/api/campaigns/:id/join',
      { preHandler: [app.authenticate] },
      (req, rep) => this.joinCampaign(req, rep)
    );

    // Routes authentifiées pour valider / refuser les inscriptions (MJ)
    app.post(
      '/api/campaigns/:id/participants/:userId/accept',
      { preHandler: [app.authenticate] },
      (req, rep) => this.validateParticipant(req, rep)
    );
    app.post(
      '/api/campaigns/:id/participants/:userId/validate',
      { preHandler: [app.authenticate] },
      (req, rep) => this.validateParticipant(req, rep)
    );
    app.post(
      '/api/campaigns/:id/participants/:userId/reject',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rejectParticipant(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/participants/:userId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rejectParticipant(req, rep)
    );
    app.get(
      '/api/campaigns/:id/pending-participants',
      { preHandler: [app.authenticate] },
      (req, rep) => this.getPendingParticipants(req, rep)
    );

    // Routes authentifiées pour observer / ne plus observer une campagne
    app.post(
      '/api/campaigns/:id/observe',
      { preHandler: [app.authenticate] },
      (req, rep) => this.observeCampaign(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/observe',
      { preHandler: [app.authenticate] },
      (req, rep) => this.unobserveCampaign(req, rep)
    );
    app.post(
      '/api/campaigns/:id/unobserve',
      { preHandler: [app.authenticate] },
      (req, rep) => this.unobserveCampaign(req, rep)
    );

    // Routes authentifiées pour marquer / démarquer « À traiter » une campagne
    app.post(
      '/api/campaigns/:id/alert',
      { preHandler: [app.authenticate] },
      (req, rep) => this.setCampaignAlert(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/alert',
      { preHandler: [app.authenticate] },
      (req, rep) => this.removeCampaignAlert(req, rep)
    );
    app.post(
      '/api/campaigns/:id/unalert',
      { preHandler: [app.authenticate] },
      (req, rep) => this.removeCampaignAlert(req, rep)
    );

    // Route pour voir les détails d'une campagne
    app.get('/api/campaigns/:id', (req, rep) => this.getCampaignById(req, rep));

    // Route authentifiée pour créer une campagne
    app.post(
      '/api/campaigns',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createCampaign(req, rep)
    );

    // Routes authentifiées pour modifier une campagne (MJ)
    app.put(
      '/api/campaigns/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCampaign(req, rep)
    );
    app.patch(
      '/api/campaigns/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updateCampaign(req, rep)
    );

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

    // Route pour rechercher dans une campagne (topics, cartes, personnages)
    app.get('/api/campaigns/:id/search', (req, rep) => this.searchCampaign(req, rep));

    // Route pour voir la fiche d'un personnage spécifique
    app.get('/api/characters/:id', (req, rep) => this.getCharacter(req, rep));
    app.get('/api/campaigns/:id/characters/:characterId', (req, rep) => this.getCharacter(req, rep));

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

    // Routes authentifiées pour supprimer un personnage (MJ)
    app.delete(
      '/api/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteCharacter(req, rep)
    );
    app.delete(
      '/api/campaigns/:campaignId/characters/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteCharacter(req, rep)
    );

    // Routes authentifiées de gestion des catégories de PNJ (MJ)
    app.post(
      '/api/campaigns/:id/categories',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createPnjCategory(req, rep)
    );
    app.put(
      '/api/categories/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePnjCategory(req, rep)
    );
    app.patch(
      '/api/categories/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePnjCategory(req, rep)
    );
    app.put(
      '/api/campaigns/:id/categories/:categoryId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePnjCategory(req, rep)
    );
    app.patch(
      '/api/campaigns/:id/categories/:categoryId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePnjCategory(req, rep)
    );
    app.delete(
      '/api/categories/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deletePnjCategory(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/categories/:categoryId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deletePnjCategory(req, rep)
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

    // Routes authentifiées pour le brouillon d'un sujet
    app.put(
      '/api/topics/:id/draft',
      { preHandler: [app.authenticate] },
      (req, rep) => this.saveDraft(req, rep)
    );
    app.post(
      '/api/topics/:id/draft',
      { preHandler: [app.authenticate] },
      (req, rep) => this.saveDraft(req, rep)
    );
    app.delete(
      '/api/topics/:id/draft',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteDraft(req, rep)
    );

    // Routes authentifiées pour modifier un message
    app.put(
      '/api/posts/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePost(req, rep)
    );
    app.patch(
      '/api/posts/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.updatePost(req, rep)
    );

    // Route authentifiée pour supprimer un message
    app.delete(
      '/api/posts/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deletePost(req, rep)
    );

    // Route authentifiée pour lancer des dés dans un sujet
    app.post(
      '/api/topics/:id/dice-roll',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rollDice(req, rep)
    );
    app.post(
      '/api/topics/:id/roll-dice',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rollDice(req, rep)
    );

    // Routes pour la Tour à dés de la campagne
    app.get(
      '/api/campaigns/:id/dice-rolls',
      { preHandler: [app.authenticate] },
      (req, rep) => this.getCampaignDiceRolls(req, rep)
    );
    app.post(
      '/api/campaigns/:id/dice-rolls',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rollDiceTower(req, rep)
    );
    app.post(
      '/api/campaigns/:id/dice-roll',
      { preHandler: [app.authenticate] },
      (req, rep) => this.rollDiceTower(req, rep)
    );

    // Routes authentifiées d'administration du forum de campagne (pour le MJ) et du forum général (pour l'admin)
    app.post(
      '/api/campaigns/:id/sections',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createSection(req, rep)
    );
    app.post(
      '/api/sections',
      { preHandler: [app.authenticate] },
      (req, rep) => this.createSection(req, rep)
    );
    app.post(
      '/api/forum/sections',
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
    app.delete(
      '/api/sections/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteSection(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/sections/:sectionId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteSection(req, rep)
    );

    // Routes authentifiées pour téléverser la bannière d'une section (MJ ou Admin)
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
    app.delete(
      '/api/topics/:id',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteTopic(req, rep)
    );
    app.delete(
      '/api/campaigns/:id/topics/:topicId',
      { preHandler: [app.authenticate] },
      (req, rep) => this.deleteTopic(req, rep)
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
      '/api/sections/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderSections(req, rep)
    );
    app.patch(
      '/api/sections/reorder',
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
    app.put(
      '/api/topics/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderTopics(req, rep)
    );
    app.patch(
      '/api/topics/reorder',
      { preHandler: [app.authenticate] },
      (req, rep) => this.reorderTopics(req, rep)
    );
  }
}

export const campaignController = new CampaignController();

export async function campaignRoutes(app: FastifyInstance) {
  campaignController.registerRoutes(app);
}
