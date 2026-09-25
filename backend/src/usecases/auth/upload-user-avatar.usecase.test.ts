import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UploadUserAvatarUseCase } from './upload-user-avatar.usecase.js';
import { IUserRepository } from '../../repositories/user.repository.js';
import { IFileStorage } from '../../storage/file-storage.js';
import { User } from '../../types/index.js';
import { UserNotFoundError, ValidationError } from '../../errors/domain.errors.js';

class MockUserRepository implements IUserRepository {
  constructor(private users: User[] = []) {}

  async findById(id: number): Promise<User | null> {
    return this.users.find((u) => u.id === id) || null;
  }
  async findByUsernameOrEmail(): Promise<any> {
    return null;
  }
  async findByUsernames(): Promise<User[]> {
    return [];
  }
  async searchByUsername(): Promise<{ id: number; username: string; avatar: string }[]> {
    return [];
  }
  async existsByUsernameOrEmail(): Promise<boolean> {
    return false;
  }
  async create(): Promise<User> {
    throw new Error('not implemented');
  }
  async updateProfile(): Promise<User> {
    throw new Error('not implemented');
  }
  async updateNotificationSettings(): Promise<User> {
    throw new Error('not implemented');
  }
  async updatePassword(): Promise<void> {}
}

class MockFileStorage implements IFileStorage {
  public savedUserFiles: { userId: number; filename: string; content: Buffer }[] = [];

  async saveCampaignFile(): Promise<string> {
    throw new Error('not implemented');
  }

  async saveUserFile(userId: number, filename: string, content: Buffer): Promise<string> {
    this.savedUserFiles.push({ userId, filename, content });
    return `/files/users/${userId}/${filename}`;
  }
}

describe('UploadUserAvatarUseCase', () => {
  const existingUser: User = {
    id: 42,
    username: 'test_user',
    mail: 'test@example.com',
    avatar: '',
    description: '',
    profil: '',
    titre: '',
    subscribe_date: '2024-01-01',
  } as unknown as User;

  it('should upload an avatar for an existing user and store it in a user subfolder', async () => {
    const repo = new MockUserRepository([existingUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadUserAvatarUseCase(repo, storage);

    const buffer = Buffer.from('fake-image-binary-data');
    const result = await useCase.execute({
      userId: 42,
      filename: 'my-avatar.png',
      mimetype: 'image/png',
      content: buffer,
    });

    assert.match(result.url, /^\/files\/users\/42\/[a-f0-9]{32}\.png$/);
    assert.match(result.filename, /^[a-f0-9]{32}\.png$/);
    assert.equal(storage.savedUserFiles.length, 1);
    assert.equal(storage.savedUserFiles[0].userId, 42);
    assert.equal(storage.savedUserFiles[0].filename, result.filename);
    assert.equal(storage.savedUserFiles[0].content, buffer);
  });

  it('should reject non-existing user', async () => {
    const repo = new MockUserRepository([existingUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadUserAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          userId: 999,
          filename: 'avatar.png',
          mimetype: 'image/png',
          content: Buffer.from('data'),
        }),
      (err: any) => err instanceof UserNotFoundError
    );
  });

  it('should reject non-image mimetypes/files', async () => {
    const repo = new MockUserRepository([existingUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadUserAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          filename: 'malicious.exe',
          mimetype: 'application/octet-stream',
          content: Buffer.from('binary-exe'),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('image valide')
    );
  });

  it('should reject empty files', async () => {
    const repo = new MockUserRepository([existingUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadUserAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          filename: 'avatar.png',
          mimetype: 'image/png',
          content: Buffer.from(''),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('vide')
    );
  });

  it('should reject files larger than 10 Mo', async () => {
    const repo = new MockUserRepository([existingUser]);
    const storage = new MockFileStorage();
    const useCase = new UploadUserAvatarUseCase(repo, storage);

    await assert.rejects(
      () =>
        useCase.execute({
          userId: 42,
          filename: 'avatar.png',
          mimetype: 'image/png',
          content: Buffer.alloc(10 * 1024 * 1024 + 1),
        }),
      (err: any) => err instanceof ValidationError && err.message.includes('10 Mo')
    );
  });
});
