/**
 * Utilitaires de gestion des cookies côté navigateur.
 * Les fonctions pures (serializeCookie, parseCookie) sont testables sans DOM ;
 * les wrappers (setCookie, getCookie, deleteCookie) manipulent document.cookie.
 */

export interface CookieOptions {
  /** Durée de vie en jours (Max-Age en secondes) */
  maxAgeDays: number;
  /** Chemin de validité du cookie */
  path?: string;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const path = options.path ?? '/';
  const maxAge = Math.round(options.maxAgeDays * 24 * 60 * 60);
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=Lax`;
}

export function parseCookie(cookieString: string, name: string): string | null {
  if (!cookieString) {
    return null;
  }

  for (const part of cookieString.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const partName = part.slice(0, separatorIndex).trim();
    if (partName === name) {
      return part.slice(separatorIndex + 1).trim();
    }
  }

  return null;
}

export function setCookie(name: string, value: string, options: CookieOptions): void {
  document.cookie = serializeCookie(name, value, options);
}

export function getCookie(name: string): string | null {
  return parseCookie(document.cookie, name);
}

export function deleteCookie(name: string, path = '/'): void {
  document.cookie = `${name}=; Path=${path}; Max-Age=0; SameSite=Lax`;
}
