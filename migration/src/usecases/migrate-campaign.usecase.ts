import { createHash, randomUUID } from 'node:crypto';
import { IEspritJdrSource, IJdrollTarget } from '../repositories/index.js';
import {
  buildSectionPlans,
  buildTopicPlans,
} from '../mappers/forum-structure.mapper.js';
import { mapCampaign } from '../mappers/espritjdr.mapper.js';
import { MigrationReport } from '../types.js';
import {
  CampaignNotFoundError,
  CampaignAlreadyMigratedError,
} from '../errors/migration.errors.js';

export interface MigrateCampaignOptions {
  userName: string;
  userMail: string;
}

export class MigrateCampaignUseCase {
  constructor(
    private readonly source: IEspritJdrSource,
    private readonly target: IJdrollTarget,
    private readonly options: MigrateCampaignOptions
  ) {}

  async execute(campaignId: number): Promise<MigrationReport> {
    await this.target.ensureMigrationTable();

    const existingTargetId = await this.target.getMigrationTargetId('campagne', `campagne:${campaignId}`);
    if (existingTargetId !== null) {
      throw new CampaignAlreadyMigratedError(campaignId, existingTargetId);
    }

    const campaign = await this.source.getCampaign(campaignId);
    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const ownerUserId = await this.ensureOwnerUser();

    const [espaces, sections, groupes, themes] = await Promise.all([
      this.source.getEspaces(campaignId),
      this.source.getSections(campaignId),
      this.source.getGroupes(campaignId),
      this.source.getThemes(campaignId),
    ]);

    const sectionPlans = buildSectionPlans(espaces, sections, groupes);
    const topicPlans = buildTopicPlans(sectionPlans, groupes, themes);

    const targetCampaignId = await this.target.createCampaignWithMapping(
      `campagne:${campaignId}`,
      mapCampaign(campaign, ownerUserId)
    );

    const sectionIds = new Map<string, number>();
    for (const sectionPlan of sectionPlans) {
      const existingSectionId = await this.target.getMigrationTargetId('section', sectionPlan.key);
      if (existingSectionId !== null) {
        sectionIds.set(sectionPlan.key, existingSectionId);
        continue;
      }
      const sectionId = await this.target.createSectionWithMapping(sectionPlan.key, {
        campagneId: targetCampaignId,
        title: sectionPlan.title,
        ordre: sectionPlan.ordre,
      });
      sectionIds.set(sectionPlan.key, sectionId);
    }

    let posts = 0;
    let skippedPosts = 0;

    for (const topicPlan of topicPlans) {
      let topicId = await this.target.getMigrationTargetId('topic', topicPlan.key);
      if (topicId === null) {
        topicId = await this.target.createTopicWithMapping(topicPlan.key, {
          sectionId: sectionIds.get(topicPlan.sectionKey) as number,
          title: topicPlan.title,
          isClosed: topicPlan.isClosed,
          ordre: topicPlan.ordre,
        });
      }

      const sourcePosts = await this.source.getPostsByTheme(topicPlan.themeId);
      if (sourcePosts.length === 0) {
        continue;
      }

      const postKeys = sourcePosts.map((post) => `post:${post.id}`);
      const migratedPostIds = await this.target.getMigrationTargetIds('post', postKeys);
      const postsToMigrate = sourcePosts.filter(
        (post) => !migratedPostIds.has(`post:${post.id}`)
      );

      skippedPosts += sourcePosts.length - postsToMigrate.length;

      if (postsToMigrate.length === 0) {
        continue;
      }

      await this.target.createPostsWithMapping(
        topicPlan.key,
        topicId,
        postsToMigrate.map((post) => ({
          sourceId: post.id,
          userId: ownerUserId,
          content: post.contenu,
          createDate: post.dateCreation,
        }))
      );
      posts += postsToMigrate.length;
    }

    return {
      sourceCampaignId: campaignId,
      targetCampaignId,
      ownerUserId,
      sections: sectionPlans.length,
      topics: topicPlans.length,
      posts,
      skippedPosts,
    };
  }

  private async ensureOwnerUser(): Promise<number> {
    const existingUserId = await this.target.findUserIdByUsername(this.options.userName);
    if (existingUserId !== null) {
      return existingUserId;
    }

    // Mot de passe aléatoire non communicable : compte technique.
    const passwordHash = createHash('md5')
      .update(`${randomUUID()}-${Date.now()}`)
      .digest('hex');

    return this.target.createUser({
      username: this.options.userName,
      mail: this.options.userMail,
      passwordHash,
      description: 'Compte technique regroupant les données migrées depuis EspritJDR.',
    });
  }
}
