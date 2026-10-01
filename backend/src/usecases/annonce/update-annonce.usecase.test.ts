import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateAnnonceUseCase } from './update-annonce.usecase.js';
import { IAnnonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { DomainError, ForbiddenError, AnnonceNotFoundError } from '../../errors/domain.errors.js';

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
}

function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

describe('UpdateAnnonceUseCase', () => {
  let repo: InMemoryAnnonceRepository;
  let useCase: UpdateAnnonceUseCase;

  beforeEach(() => {
    repo = new InMemoryAnnonceRepository([
      {
        id: 1,
        title: 'Annonce initiale',
        content: '<p>Contenu initial</p>',
        createDate: '2026-01-01 10:00:00',
        endDate: futureDate(30),
      },
    ]);
    useCase = new UpdateAnnonceUseCase(repo);
  });

  it("permet à un admin de modifier le titre, le contenu et la date de fin", async () => {
    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      id: 1,
      title: 'Annonce modifiée',
      content: '<p>Contenu modifié</p>',
      endDate: futureDate(10),
    });

    assert.equal(result.title, 'Annonce modifiée');
    assert.equal(result.content, '<p>Contenu modifié</p>');
    assert.equal(result.createDate, '2026-01-01 10:00:00');
    assert.equal(result.endDate, futureDate(10));
  });

  it('rejette un utilisateur non admin', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: 0,
        id: 1,
        title: 'Pirate',
        content: '<p>Pirate</p>',
        endDate: futureDate(10),
      }),
      ForbiddenError
    );

    assert.equal(repo.annonces[0].title, 'Annonce initiale');
  });

  it('rejette une annonce inconnue', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        id: 999,
        title: 'Inconnue',
        content: '<p>Inconnue</p>',
        endDate: futureDate(10),
      }),
      AnnonceNotFoundError
    );
  });

  it('rejette un titre vide', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        id: 1,
        title: '',
        content: '<p>Contenu</p>',
        endDate: futureDate(10),
      }),
      DomainError
    );
  });

  it('rejette une date de fin dans le passé', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        id: 1,
        title: 'Annonce',
        content: '<p>Contenu</p>',
        endDate: '2000-01-01 00:00:00',
      }),
      DomainError
    );
  });
});
