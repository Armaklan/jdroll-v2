import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  refreshServiceWorker,
  retryWithServiceWorkerRefresh,
  ServiceWorkerContainerLike,
  CacheStorageLike,
} from './service-worker.js';

interface RecordedRegistration {
  updateCalls: number;
  updateError: Error | null;
  messages: unknown[];
  waiting: boolean;
}

function makeContainer(registrations: RecordedRegistration[]): ServiceWorkerContainerLike {
  return {
    getRegistrations: async () =>
      registrations.map((registration) => ({
        update: async () => {
          registration.updateCalls += 1;
          if (registration.updateError) {
            throw registration.updateError;
          }
        },
        waiting: registration.waiting
          ? { postMessage: (message: unknown) => registration.messages.push(message) }
          : null,
      })),
  };
}

function makeCacheStorage(caches: Record<string, boolean>): CacheStorageLike & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    keys: async () => Object.keys(caches),
    delete: async (cacheName: string) => {
      deleted.push(cacheName);
      return true;
    },
  };
}

describe('refreshServiceWorker', () => {
  it('ne fait rien et ne lève pas quand le service worker et les caches sont indisponibles', async () => {
    await assert.doesNotReject(() => refreshServiceWorker(null, null));
  });

  it("cherche une mise à jour de chaque enregistrement et active immédiatement un worker en attente", async () => {
    const withWaiting: RecordedRegistration = { updateCalls: 0, updateError: null, messages: [], waiting: true };
    const withoutWaiting: RecordedRegistration = { updateCalls: 0, updateError: null, messages: [], waiting: false };
    const registrations = [withWaiting, withoutWaiting];

    await refreshServiceWorker(makeContainer(registrations), null);

    assert.equal(withWaiting.updateCalls, 1);
    assert.equal(withoutWaiting.updateCalls, 1);
    assert.deepEqual(withWaiting.messages, [{ type: 'SKIP_WAITING' }]);
    assert.deepEqual(withoutWaiting.messages, []);
  });

  it("ne bloque pas si la recherche de mise à jour échoue (backend ou réseau indisponible)", async () => {
    const failing: RecordedRegistration = { updateCalls: 0, updateError: new Error('network'), messages: [], waiting: true };

    await assert.doesNotReject(() => refreshServiceWorker(makeContainer([failing]), null));
    assert.equal(failing.updateCalls, 1);
    assert.deepEqual(failing.messages, [{ type: 'SKIP_WAITING' }]);
  });

  it("purge les caches runtime mais conserve le precache de l'application", async () => {
    const cacheStorage = makeCacheStorage({
      'jdroll-images': true,
      'workbox-precache-v2-http://localhost:3000': true,
      'workbox-precache-v2-https://jdroll.example.com': true,
    });

    await refreshServiceWorker(null, cacheStorage);

    assert.deepEqual(cacheStorage.deleted.sort(), ['jdroll-images']);
  });

  it('ne lève pas si la liste des caches échoue', async () => {
    const cacheStorage: CacheStorageLike = {
      keys: async () => {
        throw new Error('quota');
      },
      delete: async () => true,
    };

    await assert.doesNotReject(() => refreshServiceWorker(null, cacheStorage));
  });
});

describe('retryWithServiceWorkerRefresh', () => {
  it('rafraîchit le service worker puis relance le chargement', async () => {
    const calls: string[] = [];

    await retryWithServiceWorkerRefresh(async () => {
      calls.push('retry');
    });

    assert.deepEqual(calls, ['retry']);
  });

  it('relance le chargement même si le rafraîchissement échoue', async () => {
    let retried = false;

    await assert.doesNotReject(() =>
      retryWithServiceWorkerRefresh(async () => {
        retried = true;
      })
    );

    assert.equal(retried, true);
  });
});
