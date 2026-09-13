import crypto from 'crypto';

export function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

export function verifyPasswordMD5(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  return md5(password).toLowerCase() === storedHash.toLowerCase();
}
