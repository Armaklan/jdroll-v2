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

function parseNoImages(argv: string[]): boolean {
  return argv.includes('--noimg');
}

function parseFicheId(argv: string[]): number | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--fiche-id=')) {
      return Number(arg.slice('--fiche-id='.length));
    }
    if (arg === '--fiche-id' && i + 1 < argv.length) {
      return Number(argv[i + 1]);
    }
  }
  return null;
}

function printUsage(): void {
  console.error('Usage : npm run migrate -- --campaign-id <id de la campagne espritjdr> [--fiche-id <id generateur_fiche>] [--force] [--noimg]');
  console.error('  --fiche-id : convertit la fiche du générateur espritjdr en fiche codée jdroll et l\'applique à la campagne migrée');
  console.error('  --force : supprime la campagne jdroll déjà migrée puis la réimporte intégralement');
  console.error('  --noimg : ne télécharge pas les images, les liens d\'origine sont conservés');
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
    noImages: parseNoImages(process.argv.slice(2)),
    ficheId: parseFicheId(process.argv.slice(2)),
  }, new HttpImageDownloader());

  try {
    console.log(`Migration de la campagne espritjdr ${campaignId} vers jdroll (${config.jdrollDatabase})...`);
    const report = await useCase.execute(campaignId);

    console.log('Migration terminée.');
    console.log(`  Campagne jdroll : ${report.targetCampaignId}`);
    console.log(`  MJ de la campagne : ${report.mjUserId}` +
      (report.mjUserId !== report.ownerUserId ? ` (réattribué, utilisateur technique : ${report.ownerUserId})` : ' (utilisateur technique)'));
    console.log(`  Sections : ${report.sections}`);
    console.log(`  Topics : ${report.topics}`);
    console.log(`  PNJ migrés : ${report.pnjs}`);
    console.log(`  Images téléchargées : ${report.images}`);
    console.log(`  Posts migrés : ${report.posts}`);
    console.log(`  Jets de dés migrés (dicer) : ${report.diceRolls}`);
    console.log(`  Posts de jet de dés : ${report.dicePosts}`);
    console.log(`  HJ migrés (dans les posts) : ${report.hjPosts}`);
    console.log(`  Posts déjà migrés (ignorés) : ${report.skippedPosts}`);
    console.log(`  Utilisateurs rattachés (participants + persos) : ${report.participants}`);
    console.log(`  MJ assistants rattachés : ${report.assistants}`);
    if (report.sheet) {
      console.log(`  Fiche du générateur convertie (${report.sheet.ficheNom}) : ${report.sheet.fields} champs`);
      const unsupported = Object.entries(report.sheet.unsupported);
      if (unsupported.length > 0) {
        console.log(`  Fonctionnalités sans équivalent jdroll : ${unsupported.map(([k, n]) => `${k} (${n})`).join(', ')}`);
        console.log('  Détail : migration/FONCTIONNALITES_NON_MIGREES.md');
      }
    }
  } catch (error) {
    console.error(`Échec de la migration : ${(error as Error).message}`);
    process.exitCode = 1;
  } finally {
    await closePools();
  }
}

void main();
