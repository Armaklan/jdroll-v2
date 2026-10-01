import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeleteAnnonceUseCase } from './delete-annonce.usecase.js';
import { IAnnonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { ForbiddenError, AnnonceNotFoundError } from '../../errors/domain.errors.js';

const ADMIN_PROFILE = 2;

class InMemoryAnnonceRepository implements IAnnonceRepository {
  annonces: Annonce[] = [];
  private nextId = 1;

  constructor(seed: Annonce[] = []) {
    this.annonces = seed.map((annonce) => ({ ...annonce }));
    this.nextId = seed.length + 1;
  }

  async findAll(): Promise<Annonce[]> {
    return [...this.annonces];
  }

  async findVisible(): Promise<Annonce[]> {
    const time = Date.now();
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
    const annonce: Annonce = {
      id: this.nextId++,
      title,
      content,
      createDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      endDate,
    };
    this.annonces.push(annonce);
    return annonce;
  }

  async update(id: number, title: string, content: string, endDate: string): Promise<boolean> {
    const annonce = this.annonces.find((annonce) => annonce.id === id);
    if (!annonce) {
      return false;
    }
    annonce.title = title;
    annonce.content = content;
    annonce.endDate = endDate;
    return true;
  }

  async delete(id: number): Promise<boolean> {
    const index = this.annonces.findIndex((annonce) => annonce.id === id);
    if (index === -1) {
      return false;
    }
    this.annonces.splice(index, 1);
    return true;
  }
}

describe('DeleteAnnonceUseCase', () => {
  let repo: InMemoryAnnonceRepository;
  let useCase: DeleteAnnonceUseCase;

  beforeEach(() => {
    repo = new InMemoryAnnonceRepository([
      {
        id: 1,
        title: 'Annonce à supprimer',
        content: '<p>Contenu</p>',
        createDate: '2026-01-01 10:00:00',
        endDate: '2026-12-31 10:00:00',
      },
      {
        id: 2,
        title: 'Autre annonce',
        content: '<p>Autre contenu</p>',
        createDate: '2026-01-02 10:00:00',
        endDate: '2026-12-31 10:00:00',
      },
    ]);
    useCase = new DeleteAnnonceUseCase(repo);
  });

  it("permet à un admin de supprimer une annonce, sans toucher aux autres", async () => {
    await useCase.execute({ requesterProfil: ADMIN_PROFILE, id: 1 });

    assert.equal(repo.annonces.length, 1);
    assert.equal(repo.annonces[0].id, 2);
    assert.equal(repo.annonces[0].title, 'Autre annonce');
  });

  it('rejette un utilisateur non admin', async () => {
    await assert.rejects(
      useCase.execute({ requesterProfil: 0, id: 1 }),
      ForbiddenError
    );

    assert.equal(repo.annonces.length, 2);
  });

  it('rejette une annonce inconnue', async () => {
    await assert.rejects(
      useCase.execute({ requesterProfil: ADMIN_PROFILE, id: 999 }),
      AnnonceNotFoundError
    );
  });
});
