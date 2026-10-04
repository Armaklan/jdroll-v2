import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripHtml,
  buildSystemNotificationBody,
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
  showSystemNotification,
  isSystemNotificationEnabled,
  setSystemNotificationEnabled,
  NotificationApiLike,
  StorageLike,
} from './system-notifications.js';

interface RecordedNotification {
  title: string;
  options: Record<string, unknown> | undefined;
  clicks: number;
  instance: { onclick: (() => void) | null; close(): void; triggerClick(): void };
}

type NotificationApiMock = NotificationApiLike & { created: RecordedNotification[] };

function makeNotificationApi(
  permission: NotificationPermission = 'granted',
  requestResult?: NotificationPermission,
  constructError?: Error | null
): NotificationApiMock {
  const created: RecordedNotification[] = [];

  const Ctor = function (this: any, title: string, options?: Record<string, unknown>) {
    // Comme dans un vrai navigateur, la création échoue si la permission
    // n'est pas accordée (sauf instruction contraire explicite)
    const error = constructError === undefined ? (permission === 'granted' ? null : new Error('denied')) : constructError;
    if (error) {
      throw error;
    }
    const recorded: RecordedNotification = { title, options, clicks: 0, instance: null as never };
    const self = this;
    this.close = () => {};
    this.triggerClick = () => {
      recorded.clicks += 1;
      self.onclick?.();
    };
    recorded.instance = this;
    created.push(recorded);
  } as unknown as NotificationApiMock;

  Ctor.permission = permission;
  Ctor.requestPermission = async () => requestResult ?? permission;
  Object.defineProperty(Ctor, 'created', { value: created });
  return Ctor;
}

function makeStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

describe('stripHtml', () => {
  it('supprime les balises HTML et décode les entités courantes', () => {
    assert.equal(
      stripHtml('<p>Bonjour <a href="/forum">le forum</a> &amp; la campagne&nbsp;!</p>'),
      'Bonjour le forum & la campagne !'
    );
  });

  it('retourne une chaîne vide pour du contenu vide', () => {
    assert.equal(stripHtml(''), '');
  });
});

describe('buildSystemNotificationBody', () => {
  it('construit le corps à partir du contenu HTML', () => {
    const body = buildSystemNotificationBody({ content: '<p>Nouveau message</p>', nb: 1 });
    assert.equal(body, 'Nouveau message');
  });

  it('ajoute le compteur quand la notification est groupée', () => {
    const body = buildSystemNotificationBody({ content: '<p>Nouveau message</p>', nb: 3 });
    assert.equal(body, 'Nouveau message (x3)');
  });

  it('utilise un corps de repli si le contenu est vide', () => {
    const body = buildSystemNotificationBody({ content: '', nb: 1 });
    assert.equal(body, 'Vous avez reçu une notification');
  });
});

describe('getSystemNotificationPermission', () => {
  it('retourne la permission courante', () => {
    const api = makeNotificationApi('granted');
    assert.equal(getSystemNotificationPermission(api), 'granted');
  });

  it('retourne "unsupported" quand l API Notification est absente', () => {
    assert.equal(getSystemNotificationPermission(null), 'unsupported');
  });
});

describe('requestSystemNotificationPermission', () => {
  it('retourne la permission demandée', async () => {
    const api = makeNotificationApi('default', 'granted');
    assert.equal(await requestSystemNotificationPermission(api), 'granted');
  });

  it('retourne "unsupported" quand l API Notification est absente', async () => {
    assert.equal(await requestSystemNotificationPermission(null), 'unsupported');
  });
});

describe('showSystemNotification', () => {
  it('affiche une notification système quand la permission est accordée et la préférence activée', () => {
    const api = makeNotificationApi('granted');
    const storage = makeStorage({ 'jdroll-system-notifications': 'enabled' });

    const shown = showSystemNotification(
      { title: 'Nouveau message', content: '<p>Jet de dés</p>', id: 42, nb: 1, url: '/forum/1/2' },
      { notificationApi: api, storage }
    );

    assert.equal(shown, true);
    assert.equal(api.created.length, 1);
    assert.equal(api.created[0].title, 'Nouveau message');
    assert.equal(api.created[0].options?.body, 'Jet de dés');
    assert.equal(api.created[0].options?.tag, '42');
  });

  it('n affiche rien si la permission est refusée', () => {
    const api = makeNotificationApi('denied');
    const storage = makeStorage({ 'jdroll-system-notifications': 'enabled' });

    const shown = showSystemNotification(
      { title: 'Nouveau message', content: '', id: 1, nb: 1, url: '' },
      { notificationApi: api, storage }
    );

    assert.equal(shown, false);
    assert.equal(api.created.length, 0);
  });

  it('n affiche rien si la préférence utilisateur est désactivée', () => {
    const api = makeNotificationApi('granted');
    const storage = makeStorage();

    const shown = showSystemNotification(
      { title: 'Nouveau message', content: '', id: 1, nb: 1, url: '' },
      { notificationApi: api, storage }
    );

    assert.equal(shown, false);
    assert.equal(api.created.length, 0);
  });

  it('ouvre l URL de la notification au clic', () => {
    const api = makeNotificationApi('granted');
    const storage = makeStorage({ 'jdroll-system-notifications': 'enabled' });
    const opened: string[] = [];

    showSystemNotification(
      { title: 'Nouveau message', content: '', id: 7, nb: 1, url: '/topics/12' },
      { notificationApi: api, storage, onOpen: (url) => opened.push(url) }
    );

    assert.equal(opened.length, 0);
    api.created[0].instance.triggerClick();
    assert.deepEqual(opened, ['/topics/12']);
  });

  it('affiche la notification si le getter de permission est erroné mais que la création réussit', () => {
    // Certains navigateurs headless rapportent Notification.permission === 'denied'
    // alors que la permission est accordée et que la création fonctionne
    const api = makeNotificationApi('denied', 'granted', null);
    const storage = makeStorage({ 'jdroll-system-notifications': 'enabled' });

    const shown = showSystemNotification(
      { title: 'Nouveau message', content: '', id: 9, nb: 1, url: '' },
      { notificationApi: api, storage }
    );

    assert.equal(shown, true);
    assert.equal(api.created.length, 1);
  });

  it('retourne false sans levée d erreur si la création échoue', () => {
    const api = {
      permission: 'granted',
      requestPermission: async () => 'granted' as NotificationPermission,
      construct() {
        throw new Error('boom');
      },
    } as unknown as NotificationApiLike;
    const storage = makeStorage({ 'jdroll-system-notifications': 'enabled' });

    const shown = showSystemNotification(
      { title: 'Nouveau message', content: '', id: 1, nb: 1, url: '' },
      { notificationApi: api, storage }
    );

    assert.equal(shown, false);
  });
});

describe('préférence utilisateur', () => {
  it('est désactivée par défaut', () => {
    const storage = makeStorage();
    assert.equal(isSystemNotificationEnabled(storage), false);
  });

  it('peut être activée puis désactivée', () => {
    const storage = makeStorage();
    setSystemNotificationEnabled(true, storage);
    assert.equal(isSystemNotificationEnabled(storage), true);
    setSystemNotificationEnabled(false, storage);
    assert.equal(isSystemNotificationEnabled(storage), false);
    assert.equal(storage.data['jdroll-system-notifications'], undefined);
  });
});
