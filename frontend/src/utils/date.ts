/**
 * Utilitaires pour le parsing et le formatage des dates provenant de la base de données.
 *
 * La base de données MySQL stocke les dates dans le fuseau horaire français (Europe/Paris).
 * Lorsqu'elles sont sérialisées en chaîne ISO avec un suffixe UTC (ou traitées par le backend),
 * un décalage de +2h (heure d'été) ou +1h (heure d'hiver) peut survenir si le navigateur
 * réapplique le fuseau horaire local.
 * Ces utilitaires s'assurent que les dates sont restituées fidèlement sans double décalage.
 */

/**
 * Parse une date issue de la base de données (déjà au créneau français)
 * en extrayant directement les composants date/heure afin d'éviter le décalage de fuseau.
 */
export function parseDbDate(dateInput?: string | Date | number | null): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') return null;

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInput !== 'string') return null;

  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  // Extraction directe des composants pour formats YYYY-MM-DD[T| ]HH:mm[:ss[.sss]]
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?/
  );

  if (match) {
    const year = parseInt(match[1], 10);
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hours = match[4] !== undefined ? parseInt(match[4], 10) : 0;
    const minutes = match[5] !== undefined ? parseInt(match[5], 10) : 0;
    const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 0;
    const ms = match[7] !== undefined ? parseInt(match[7].padEnd(3, '0').slice(0, 3), 10) : 0;

    const d = new Date(year, monthIndex, day, hours, minutes, seconds, ms);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Format standard : JJ/MM/AAAA HH:mm
 */
export function formatDate(
  dateInput?: string | Date | number | null,
  fallback = 'Date inconnue'
): string {
  const d = parseDbDate(dateInput);
  if (!d) return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  try {
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  }
}

/**
 * Format complet avec secondes (pour tour à dés) : JJ/MM/AAAA HH:mm:ss
 */
export function formatFullDateTime(
  dateInput?: string | Date | number | null,
  fallback = 'Date inconnue'
): string {
  const d = parseDbDate(dateInput);
  if (!d) return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  }
}

/**
 * Format pour les messages : JJ mmm AAAA, HH:mm
 */
export function formatMessageDate(
  dateInput?: string | Date | number | null,
  fallback = ''
): string {
  const d = parseDbDate(dateInput);
  if (!d) return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return typeof dateInput === 'string' && dateInput ? dateInput : fallback;
  }
}

/**
 * Format relatif / absolu pour les notifications : "À l'instant", "Il y a X min", "Il y a X h", "Il y a X j" ou date
 */
export function formatNotificationDate(dateInput?: string | Date | number | null): string {
  const d = parseDbDate(dateInput);
  if (!d) return '';
  try {
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - d.getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Format d'heure pour le tchat : HH:mm
 */
export function formatTime(timeInput?: string | Date | number | null): string {
  const d = parseDbDate(timeInput);
  if (!d) return typeof timeInput === 'string' ? timeInput : '';
  try {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return typeof timeInput === 'string' ? timeInput : '';
  }
}

/**
 * Format de libellé de date pour le tchat : "Aujourd'hui" ou "JJ mmm"
 */
export function formatDateLabel(timeInput?: string | Date | number | null): string {
  const d = parseDbDate(timeInput);
  if (!d) return '';
  try {
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    if (isToday) return "Aujourd'hui";
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

/**
 * Format une date ISO pour un input type="date" (YYYY-MM-DD)
 * Utilise parseDbDate qui extrait les composants directement sans décalage horaire
 */
export function formatDateForInput(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '';
  
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput !== 'string') return '';

  const trimmed = dateInput.trim();
  if (!trimmed) return '';

  // Essayer d'extraire directement YYYY-MM-DD depuis la chaîne
  // Cela fonctionne si le backend retourne "1986-05-05" avec dateStrings: true
  const directMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }

  // Si pas de match direct, essayer avec parseDbDate
  // Cela gère les dates au format ISO avec heure
  const d = parseDbDate(trimmed);
  if (d) {
    // Extraire la date via toISOString pour éviter les décalages horaires
    const isoString = d.toISOString();
    const isoMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  return '';
}

/**
 * Parse une date depuis un input type="date" (YYYY-MM-DD) vers un ISO string
 * Convertit YYYY-MM-DD en format ISO T12:00:00.000Z pour l'API
 * On utilise midi (12:00:00) au lieu de minuit pour éviter les problèmes de décalage horaire
 */
export function parseDateFromInput(dateInput?: string | null): string | null {
  if (!dateInput) return null;
  
  const trimmed = dateInput.trim();
  if (!trimmed) return null;

  // Validation du format YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  // Validation basique de la date
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  
  // Vérifier que la date extraite correspond à l'entrée
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) return null;

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
}
