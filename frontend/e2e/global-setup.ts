import { FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * This file can be used to perform setup tasks that need to run once before all tests
 */

async function globalSetup(config: FullConfig) {
  // You can add global setup here, such as:
  // - Authentication that needs to persist across tests
  // - Database seeding
  // - Mock server setup
  
  // Example: Create a test user
  // const adminUser = await createTestUser();
  // process.env.TEST_ADMIN_USER = JSON.stringify(adminUser);
  
  console.log('Global setup completed');
}

export default globalSetup;
