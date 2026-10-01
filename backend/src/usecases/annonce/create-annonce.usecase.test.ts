import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CreateAnnonceUseCase } from './create-annonce.usecase.js';
import { IAnnonceRepository } from '../../repositories/annonce.repository.js';
import { Annonce } from '../../types/index.js';
import { DomainError, ForbiddenError } from '../../errors/domain.errors.js';

const ADMIN_PROFILE = 2;

class InMemoryAnnonceRepository implements IAnnonceRepository {
  annonces: Annonce[] = [];
  private nextId = 1;

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

function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

describe('CreateAnnonceUseCase', () => {
  let repo: InMemoryAnnonceRepository;
  let useCase: CreateAnnonceUseCase;

  beforeEach(() => {
    repo = new InMemoryAnnonceRepository();
    useCase = new CreateAnnonceUseCase(repo);
  });

  it('permet à un admin de créer une annonce avec une date de fin future', async () => {
    const result = await useCase.execute({
      requesterProfil: ADMIN_PROFILE,
      title: 'Maintenance du serveur',
      content: '<p>Le serveur sera indisponible samedi.</p>',
      endDate: futureDate(7),
    });

    assert.equal(result.title, 'Maintenance du serveur');
    assert.equal(result.content, '<p>Le serveur sera indisponible samedi.</p>');
    assert.ok(result.createDate, 'create_date doit être renseignée');
    assert.equal(result.endDate, futureDate(7));
    assert.equal(repo.annonces.length, 1);
  });

  it('rejette un utilisateur non admin', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: 0,
        title: 'Annonce pirate',
        content: '<p>Contenu</p>',
        endDate: futureDate(7),
      }),
      ForbiddenError
    );

    assert.equal(repo.annonces.length, 0);
  });

  it('rejette un titre vide', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        title: '',
        content: '<p>Contenu</p>',
        endDate: futureDate(7),
      }),
      DomainError
    );

    assert.equal(repo.annonces.length, 0);
  });

  it('rejette un contenu vide', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        title: 'Annonce',
        content: '',
        endDate: futureDate(7),
      }),
      DomainError
    );

    assert.equal(repo.annonces.length, 0);
  });

  it('rejette une date de fin dans le passé', async () => {
    await assert.rejects(
      useCase.execute({
        requesterProfil: ADMIN_PROFILE,
        title: 'Annonce',
        content: '<p>Contenu</p>',
        endDate: '2000-01-01 00:00:00',
      }),
      DomainError
    );

    assert.equal(repo.annonces.length, 0);
  });
});
