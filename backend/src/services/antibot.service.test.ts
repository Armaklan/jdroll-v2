import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistrationAntibot, MIN_REGISTRATION_TIME_MS } from './antibot.service.js';
import { AntibotError } from '../errors/domain.errors.js';

describe('validateRegistrationAntibot', () => {
  it('accepte une inscription avec honeypot vide et temps de remplissage suffisant', () => {
    assert.doesNotThrow(() => {
      validateRegistrationAntibot({ website: '', elapsedMs: 5000 });
    });
  });

  it('accepte un honeypot absent (compatibilité API)', () => {
    assert.doesNotThrow(() => {
      validateRegistrationAntibot({ elapsedMs: 5000 });
    });
  });

  it('rejette une inscription dont le honeypot est rempli', () => {
    assert.throws(
      () => validateRegistrationAntibot({ website: 'http://spam.example.com', elapsedMs: 5000 }),
      (err: unknown) => {
        assert.ok(err instanceof AntibotError);
        return true;
      }
    );
  });

  it('rejette une inscription soumise trop vite', () => {
    assert.throws(
      () => validateRegistrationAntibot({ website: '', elapsedMs: 100 }),
      (err: unknown) => {
        assert.ok(err instanceof AntibotError);
        return true;
      }
    );
  });

  it('rejette une inscription sans temps de remplissage (soumission directe API)', () => {
    assert.throws(
      () => validateRegistrationAntibot({ website: '' }),
      (err: unknown) => {
        assert.ok(err instanceof AntibotError);
        return true;
      }
    );
  });

  it('accepte une inscription exactement au temps minimal', () => {
    assert.doesNotThrow(() => {
      validateRegistrationAntibot({ website: '', elapsedMs: MIN_REGISTRATION_TIME_MS });
    });
  });
});
