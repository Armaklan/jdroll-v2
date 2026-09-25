import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HomeQueries } from './home.queries.js';
import { IUserRepository } from '../repositories/user.repository.js';
import { HomeUserSummary } from '../types/index.js';

class MockUserRepository implements IUserRepository {
  constructor(
    private readonly latestRegistrations: HomeUserSummary[] = [],
    private readonly todayBirthdays: HomeUserSummary[] = []
  ) {}

  async findLatestRegistrations(limit: number): Promise<HomeUserSummary[]> {
    return this.latestRegistrations.slice(0, limit);
  }

  async findTodayBirthdays(): Promise<HomeUserSummary[]> {
    return this.todayBirthdays;
  }

  async findById(): Promise<any> {
    return null;
  }

  async findByUsernameOrEmail(): Promise<any> {
    return null;
  }

  async findByUsernames(): Promise<any[]> {
    return [];
  }

  async searchByUsername(): Promise<any[]> {
    return [];
  }

  async existsByUsernameOrEmail(): Promise<boolean> {
    return false;
  }

  async create(): Promise<any> {
    return {} as any;
  }

  async updateProfile(): Promise<any> {
    return {} as any;
  }

  async updateNotificationSettings(): Promise<any> {
    return {} as any;
  }

  async updatePassword(): Promise<void> {}
}

describe('HomeQueries', () => {
  const latestRegistrations: HomeUserSummary[] = [
    { id: 1, username: 'nouveau_joueur', avatar: 'a1.png', profil: 0, subscribeDate: '2026-09-25 10:00:00' },
    { id: 2, username: 'autre_joueur', avatar: 'a2.png', profil: 1, subscribeDate: '2026-09-24 18:30:00' },
  ];

  const todayBirthdays: HomeUserSummary[] = [
    { id: 3, username: 'anniversaire_du_jour', avatar: 'a3.png', profil: 2, birthDate: '1990-09-25' },
  ];

  it('récupère les statistiques de la communauté (derniers inscrits et anniversaires du jour)', async () => {
    const queries = new HomeQueries(new MockUserRepository(latestRegistrations, todayBirthdays));

    const stats = await queries.getCommunityStats();

    assert.equal(stats.latestRegistrations.length, 2);
    assert.equal(stats.latestRegistrations[0].username, 'nouveau_joueur');
    assert.equal(stats.latestRegistrations[1].subscribeDate, '2026-09-24 18:30:00');
    assert.equal(stats.todayBirthdays.length, 1);
    assert.equal(stats.todayBirthdays[0].username, 'anniversaire_du_jour');
  });

  it('renvoie des listes vides quand aucun utilisateur ne correspond', async () => {
    const queries = new HomeQueries(new MockUserRepository([], []));

    const stats = await queries.getCommunityStats();

    assert.equal(stats.latestRegistrations.length, 0);
    assert.equal(stats.todayBirthdays.length, 0);
  });

  it('limite les derniers inscrits à 5 utilisateurs', async () => {
    const many: HomeUserSummary[] = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      username: `joueur_${i + 1}`,
      avatar: '',
      profil: 0,
      subscribeDate: '2026-09-25 00:00:00',
    }));
    const queries = new HomeQueries(new MockUserRepository(many, []));

    const stats = await queries.getCommunityStats();

    assert.equal(stats.latestRegistrations.length, 5);
  });
});
