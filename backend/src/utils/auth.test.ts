import { md5, verifyPasswordMD5 } from './auth.js';

function runTests() {
  console.log('Testing MD5 hashing and verification...');

  const password = 'secretPassword123';
  const hashed = md5(password);

  if (hashed.length !== 32) {
    throw new Error(`Invalid MD5 hash length: ${hashed.length}`);
  }

  if (!verifyPasswordMD5(password, hashed)) {
    throw new Error('Verification failed for valid password');
  }

  if (verifyPasswordMD5('wrongPassword', hashed)) {
    throw new Error('Verification succeeded for invalid password');
  }

  // Test uppercase MD5 hash compatibility
  if (!verifyPasswordMD5(password, hashed.toUpperCase())) {
    throw new Error('Verification failed for uppercase MD5 hash');
  }

  console.log('✅ MD5 authentication tests passed successfully.');
}

runTests();
