export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class CampaignNotFoundError extends MigrationError {
  constructor(campaignId: number) {
    super(`La campagne espritjdr avec l'identifiant ${campaignId} n'existe pas`);
    this.name = 'CampaignNotFoundError';
  }
}

export class CampaignAlreadyMigratedError extends MigrationError {
  readonly targetCampaignId: number;

  constructor(campaignId: number, targetCampaignId: number) {
    super(
      `La campagne espritjdr ${campaignId} a déjà été migrée vers la campagne jdroll ${targetCampaignId}`
    );
    this.name = 'CampaignAlreadyMigratedError';
    this.targetCampaignId = targetCampaignId;
  }
}
