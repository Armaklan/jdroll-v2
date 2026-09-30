import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ListAnnoncesUseCase } from './list-annonces.usecase.js';
import { IAnnonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { ForbiddenError } from '../../errors/domain.errors.js';

const ADMIN_PROFILE = 2;

class InMemoryAnnonceRepository implements IAnnonceRepository {
  annonces: Annonce[] = [];

  async findAll(): Promise<Annonce[]> {
    return [...this.annonces];
  }

  async findVisible(now: Date): Promise<Annonce[]> {
    return [...this.annonces];
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

describe('ListAnnoncesUseCase', () => {
  let repo: InMemoryAnnonceRepository;
  let useCase: ListAnnoncesUseCase;

  beforeEach(() => {
    repo = new InMemoryAnnonceRepository();
    repo.annonces = [
      {
        id: 1,
        title: 'Annonce expirée',
        content: '<p>Expiree</p>',
        createDate: '2026-01-01 10:00:00',
        endDate: '2026-01-31 10:00:00',
      },
      {
        id: 2,
        title: 'Annonce visible',
        content: '<p>Visible</p>',
        createDate: '2026-01-01 10:00:00',
        endDate: '2027-01-01 10:00:00',
      },
    ];
    useCase = new ListAnnoncesUseCase(repo);
  });

  it('liste toutes les annonces pour un admin (y compris expirées)', async () => {
    const annonces = await useCase.execute({ requesterProfil: ADMIN_PROFILE });

    assert.equal(annonces.length, 2);
    assert.equal(annonces[0].title, 'Annonce expirée');
    assert.equal(annonces[1].title, 'Annonce visible');
  });

  it('rejette un utilisateur non admin', async () => {
    await assert.rejects(
      useCase.execute({ requesterProfil: 0 }),
      ForbiddenError
    );
  });
});
