/**
 * Notifications système (Web Notifications API).
 * Affiche une notification OS quand une notification du site arrive,
 * si l'utilisateur a activé la préférence et accordé la permission.
 * Les dépendances navigateur (Notification, localStorage) sont injectables
 * pour permettre les tests unitaires sans DOM.
 */

export interface NotificationLike {
  onclick: ((this: NotificationLike, ev: Event) => unknown) | null;
  close(): void;
}

export interface NotificationApiLike {
  permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  new (title: string, options?: NotificationOptions): NotificationLike;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SystemNotificationItem {
  title: string;
  content: string;
  id: number;
  nb: number;
  url: string;
}

export interface ShowSystemNotificationDeps {
  notificationApi?: NotificationApiLike | null;
  storage?: StorageLike | null;
  /** Appelé quand l'utilisateur clique sur la notification système */
  onOpen?: (url: string) => void;
  /** Permet de rediriger le focus de la fenêtre (window par défaut) */
  focusWindow?: () => void;
}

const PREFERENCE_KEY = 'jdroll-system-notifications';
const FALLBACK_BODY = 'Vous avez reçu une notification';

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function browserNotificationApi(): NotificationApiLike | null {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return null;
  }
  return Notification as unknown as NotificationApiLike;
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Supprime les balises HTML et décode les entités courantes
 * pour obtenir un texte brut exploitable en corps de notification.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (entity) => HTML_ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construit le corps de la notification système à partir du contenu
 * (potentiellement HTML) et du compteur de groupement.
 */
export function buildSystemNotificationBody(item: { content: string; nb: number }): string {
  const text = stripHtml(item.content);
  const body = text || FALLBACK_BODY;
  return item.nb > 1 ? `${body} (x${item.nb})` : body;
}

export function getSystemNotificationPermission(
  api: NotificationApiLike | null = browserNotificationApi()
): NotificationPermission | 'unsupported' {
  if (!api) {
    return 'unsupported';
  }
  return api.permission;
}

export async function requestSystemNotificationPermission(
  api: NotificationApiLike | null = browserNotificationApi()
): Promise<NotificationPermission | 'unsupported'> {
  if (!api) {
    return 'unsupported';
  }
  try {
    return await api.requestPermission();
  } catch {
    return 'denied';
  }
}

export function isSystemNotificationEnabled(storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) {
    return false;
  }
  return storage.getItem(PREFERENCE_KEY) === 'enabled';
}

export function setSystemNotificationEnabled(
  enabled: boolean,
  storage: StorageLike | null = browserStorage()
): void {
  if (!storage) {
    return;
  }
  if (enabled) {
    storage.setItem(PREFERENCE_KEY, 'enabled');
  } else {
    storage.removeItem(PREFERENCE_KEY);
  }
}

/**
 * Affiche une notification système pour une notification du site.
 * Retourne true si la notification a été affichée.
 *
 * La permission n'est pas vérifiée via Notification.permission (getter
 * parfois erroné dans certains navigateurs) : un contexte réellement
 * refusé fait échouer la construction, interceptée ici.
 */
export function showSystemNotification(
  item: SystemNotificationItem,
  deps: ShowSystemNotificationDeps = {}
): boolean {
  const api = deps.notificationApi !== undefined ? deps.notificationApi : browserNotificationApi();
  const storage = deps.storage !== undefined ? deps.storage : browserStorage();

  if (!api || !isSystemNotificationEnabled(storage)) {
    return false;
  }

  try {
    const notification = new api(item.title || 'Notification', {
      body: buildSystemNotificationBody(item),
      tag: String(item.id),
    });

    notification.onclick = () => {
      if (deps.focusWindow) {
        deps.focusWindow();
      } else if (typeof window !== 'undefined') {
        window.focus();
      }
      if (item.url) {
        deps.onOpen?.(item.url);
      }
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}
