import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSmtpParams } from './smtp.js';

describe('loadSmtpParams', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'smtp-test-'));
    configPath = join(tmpDir, 'smtp.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null when the config file does not exist', () => {
    const params = loadSmtpParams(join(tmpDir, 'missing.json'));
    assert.equal(params, null);
  });

  it('should return null when the config file is not valid JSON', () => {
    writeFileSync(configPath, 'not json at all', 'utf-8');
    const params = loadSmtpParams(configPath);
    assert.equal(params, null);
  });

  it('should return null when host is missing or empty', () => {
    writeFileSync(configPath, JSON.stringify({ port: 1025 }), 'utf-8');
    assert.equal(loadSmtpParams(configPath), null);

    writeFileSync(configPath, JSON.stringify({ host: '   ' }), 'utf-8');
    assert.equal(loadSmtpParams(configPath), null);
  });

  it('should load a valid config with defaults', () => {
    writeFileSync(
      configPath,
      JSON.stringify({
        host: 'localhost',
        port: 1025,
      }),
      'utf-8'
    );

    const params = loadSmtpParams(configPath);

    assert.notEqual(params, null);
    assert.equal(params!.host, 'localhost');
    assert.equal(params!.port, 1025);
    assert.equal(params!.secure, false);
    assert.equal(params!.from, 'noreply@jdroll.fr');
    assert.equal(params!.user, undefined);
    assert.equal(params!.pass, undefined);
    assert.equal(params!.siteUrl, undefined);
  });

  it('should load a full config with auth and site url', () => {
    writeFileSync(
      configPath,
      JSON.stringify({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        user: 'contact@example.com',
        pass: 'secret',
        from: 'noreply@example.com',
        siteUrl: 'https://www.jdroll.fr',
      }),
      'utf-8'
    );

    const params = loadSmtpParams(configPath);

    assert.notEqual(params, null);
    assert.equal(params!.host, 'smtp.example.com');
    assert.equal(params!.port, 465);
    assert.equal(params!.secure, true);
    assert.equal(params!.user, 'contact@example.com');
    assert.equal(params!.pass, 'secret');
    assert.equal(params!.from, 'noreply@example.com');
    assert.equal(params!.siteUrl, 'https://www.jdroll.fr');
  });
});
