import { AntibotError } from '../errors/domain.errors.js';

/**
 * Antibot basique pour l'inscription :
 * - Honeypot : champ "website" caché dans le formulaire, jamais rempli par un humain
 * - Temps de remplissage : un formulaire légitime met au moins MIN_REGISTRATION_TIME_MS à être soumis
 */
export const MIN_REGISTRATION_TIME_MS = 1500;

export interface AntibotInput {
  website?: string;
  elapsedMs?: number;
}

export function validateRegistrationAntibot(input: AntibotInput): void {
  if (input.website && input.website.trim() !== '') {
    throw new AntibotError();
  }

  if (input.elapsedMs === undefined || input.elapsedMs < MIN_REGISTRATION_TIME_MS) {
    throw new AntibotError();
  }
}
