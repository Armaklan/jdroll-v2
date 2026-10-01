/**
 * Rafraîchissement du service worker lors d'un "Réessayer" après une erreur
 * de chargement : si l'erreur vient d'un cache périmé, on force
 * - la recherche d'une nouvelle version du service worker (update),
 * - l'activation immédiate d'un worker en attente (SKIP_WAITING),
 * - la purge des caches runtime (hors precache de l'application),
 * puis on relance le chargement de la page.
 */

export interface WaitingWorkerLike {
  postMessage(message: unknown): void;
}

export interface ServiceWorkerRegistrationLike {
  update(): Promise<unknown>;
  waiting: WaitingWorkerLike | null;
}

export interface ServiceWorkerContainerLike {
  getRegistrations(): Promise<readonly ServiceWorkerRegistrationLike[]>;
}

export interface CacheStorageLike {
  keys(): Promise<string[]>;
  delete(cacheName: string): Promise<boolean>;
}

const PRECACHE_PREFIX = 'workbox-precache';
const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' };

function browserContainer(): ServiceWorkerContainerLike | null {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  return navigator.serviceWorker;
}

function browserCacheStorage(): CacheStorageLike | null {
  if (typeof caches === 'undefined') {
    return null;
  }
  return caches;
}

async function refreshRegistrations(container: ServiceWorkerContainerLike | null): Promise<void> {
  if (!container) {
    return;
  }

  const registrations = await container.getRegistrations();

  await Promise.all(
    registrations.map(async (registration) => {
      try {
        await registration.update();
      } catch (error) {
        console.warn('[ServiceWorker] Échec de la recherche de mise à jour', error);
      }
      registration.waiting?.postMessage(SKIP_WAITING_MESSAGE);
    })
  );
}

async function clearRuntimeCaches(cacheStorage: CacheStorageLike | null): Promise<void> {
  if (!cacheStorage) {
    return;
  }

  const cacheNames = await cacheStorage.keys();
  const runtimeCaches = cacheNames.filter((cacheName) => !cacheName.startsWith(PRECACHE_PREFIX));

  await Promise.all(runtimeCaches.map((cacheName) => cacheStorage.delete(cacheName)));
}

export async function refreshServiceWorker(
  container: ServiceWorkerContainerLike | null = browserContainer(),
  cacheStorage: CacheStorageLike | null = browserCacheStorage()
): Promise<void> {
  try {
    await refreshRegistrations(container);
  } catch (error) {
    console.warn('[ServiceWorker] Échec du rafraîchissement des enregistrements', error);
  }

  try {
    await clearRuntimeCaches(cacheStorage);
  } catch (error) {
    console.warn('[ServiceWorker] Échec de la purge des caches runtime', error);
  }
}

export async function retryWithServiceWorkerRefresh(retry: () => void | Promise<void>): Promise<void> {
  await refreshServiceWorker();
  await retry();
}
