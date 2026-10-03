import { config } from './config/env.js';
import { closePools } from './db/mysql.js';
import { espritJdrSource, jdrollTarget } from './repositories/index.js';
import { HttpImageDownloader } from './files/image-downloader.js';
import { MigrateCampaignUseCase } from './usecases/migrate-campaign.usecase.js';

function parseCampaignId(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--campaign-id=')) {
      return Number(arg.slice('--campaign-id='.length));
    }
    if (arg === '--campaign-id' && i + 1 < argv.length) {
      return Number(argv[i + 1]);
    }
  }
  return null;
}

function parseForce(argv: string[]): boolean {
  return argv.includes('--force');
}

function printUsage(): void {
  console.error('Usage : npm run migrate -- --campaign-id <id de la campagne espritjdr> [--force]');
  console.error('  --force : supprime la campagne jdroll déjà migrée puis la réimporte intégralement');
}

async function main(): Promise<void> {
  const campaignId = parseCampaignId(process.argv.slice(2));

  if (campaignId === null || !Number.isInteger(campaignId) || campaignId <= 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const useCase = new MigrateCampaignUseCase(espritJdrSource, jdrollTarget, {
    userName: config.migrationUser.name,
    userMail: config.migrationUser.mail,
    force: parseForce(process.argv.slice(2)),
  }, new HttpImageDownloader());

  try {
    console.log(`Migration de la campagne espritjdr ${campaignId} vers jdroll (${config.jdrollDatabase})...`);
    const report = await useCase.execute(campaignId);

    console.log('Migration terminée.');
    console.log(`  Campagne jdroll : ${report.targetCampaignId}`);
    console.log(`  MJ (utilisateur technique) : ${report.ownerUserId}`);
    console.log(`  Sections : ${report.sections}`);
    console.log(`  Topics : ${report.topics}`);
    console.log(`  PNJ migrés : ${report.pnjs}`);
    console.log(`  Images téléchargées : ${report.images}`);
    console.log(`  Posts migrés : ${report.posts}`);
    console.log(`  HJ migrés (dans les posts) : ${report.hjPosts}`);
    console.log(`  Posts déjà migrés (ignorés) : ${report.skippedPosts}`);
  } catch (error) {
    console.error(`Échec de la migration : ${(error as Error).message}`);
    process.exitCode = 1;
  } finally {
    await closePools();
  }
}

void main();
