import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface SmtpParams {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  siteUrl?: string;
}

const DEFAULT_SMTP_FILE = fileURLToPath(new URL('../../smtp.json', import.meta.url));
const DEFAULT_FROM = 'noreply@jdroll.fr';

export function loadSmtpParams(filePath: string = DEFAULT_SMTP_FILE): SmtpParams | null {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`[SMTP] Fichier de configuration invalide (JSON illisible) : ${filePath}`);
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data.host !== 'string' || data.host.trim() === '') {
    return null;
  }

  const from = typeof data.from === 'string' && data.from.trim() !== '' ? data.from.trim() : DEFAULT_FROM;

  return {
    host: data.host.trim(),
    port: Number(data.port) || 25,
    secure: data.secure === true,
    user: typeof data.user === 'string' && data.user !== '' ? data.user : undefined,
    pass: typeof data.pass === 'string' && data.pass !== '' ? data.pass : undefined,
    from,
    siteUrl: typeof data.siteUrl === 'string' && data.siteUrl.trim() !== '' ? data.siteUrl.trim() : undefined,
  };
}
