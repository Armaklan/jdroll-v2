import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AnnonceQueries } from './annonce.queries.js';
import { IAnnonceRepository } from '../repositories/annonce.repository.js';
import { Annonce } from '../types/index.js';

class InMemoryAnnonceRepository implements IAnnonceRepository {
  annonces: Annonce[] = [];
  visibleCalls: Date[] = [];

  async findAll(): Promise<Annonce[]> {
    return [...this.annonces];
  }

  async findVisible(now: Date): Promise<Annonce[]> {
    this.visibleCalls.push(now);
    const time = now.getTime();
    return this.annonces.filter(
      (annonce) =>
        new Date(annonce.createDate).getTime() <= time &&
        new Date(annonce.endDate).getTime() >= time
    );
  }

  async findById(id: number): Promise<Annonce | null> {
    return this.annonces.find((annonce) => annonce.id === id) || null;
  }

  async create(title: string, content: string, endDate: string): Promise<Annonce> {
    throw new Error('Non utilisé');
  }

  async update(id: number, title: string, content: string, endDate: string): Promise<boolean> {
    return false;
  }
}

describe('AnnonceQueries', () => {
  let repo: InMemoryAnnonceRepository;
  let queries: AnnonceQueries;

  beforeEach(() => {
    repo = new InMemoryAnnonceRepository();
    repo.annonces = [
      {
        id: 1,
        title: 'Annonce visible',
        content: '<p>Visible</p>',
        createDate: '2026-01-01 10:00:00',
        endDate: '2027-01-01 10:00:00',
      },
      {
        id: 2,
        title: 'Annonce expirée',
        content: '<p>Expiree</p>',
        createDate: '2025-01-01 10:00:00',
        endDate: '2025-12-31 10:00:00',
      },
      {
        id: 3,
        title: 'Annonce planifiée',
        content: '<p>Planifiee</p>',
        createDate: '2027-06-01 10:00:00',
        endDate: '2027-07-01 10:00:00',
      },
    ];
    queries = new AnnonceQueries(repo);
  });

  it('ne renvoie que les annonces dont la fenêtre create_date/end_date couvre maintenant', async () => {
    const annonces = await queries.getVisibleAnnonces();

    assert.equal(annonces.length, 1);
    assert.equal(annonces[0].title, 'Annonce visible');
  });

  it('interroge le repository avec la date courante', async () => {
    await queries.getVisibleAnnonces();

    assert.equal(repo.visibleCalls.length, 1);
    const delta = Math.abs(Date.now() - repo.visibleCalls[0].getTime());
    assert.ok(delta < 5000, 'la date passée au repository doit être la date courante');
  });

  it('renvoie une liste vide quand aucune annonce est visible', async () => {
    repo.annonces = [];

    const annonces = await queries.getVisibleAnnonces();

    assert.deepEqual(annonces, []);
  });
});
