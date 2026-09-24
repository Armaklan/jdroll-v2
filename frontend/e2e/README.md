# JdRoll E2E Tests with Playwright

This directory contains End-to-End (E2E) tests for the JdRoll application using [Playwright](https://playwright.dev/).

## Project Structure

```
e2e/
├── playwright.config.ts      # Playwright configuration
├── package.json             # E2E test dependencies
├── README.md                # This file
├── page-objects/            # Page Object classes
│   ├── index.ts             # Exports all Page Objects
│   ├── BasePage.ts          # Base Page Object class
│   ├── Navbar.ts            # Navbar Page Object
│   ├── HomePage.ts          # Home Page Object
│   ├── LoginPage.ts         # Login Page Object
│   ├── RegisterPage.ts      # Register Page Object
│   ├── MyCampaignsPage.ts   # My Campaigns Page Object
│   └── CampaignFormPage.ts  # Campaign Form Page Object
└── tests/                   # Test files
    ├── index.ts             # Test index
    ├── auth.spec.ts         # Authentication tests
    ├── navigation.spec.ts   # Navigation tests
    ├── mobileNavigation.spec.ts  # Mobile navigation tests
    ├── homepage.spec.ts     # Homepage tests
    └── campaigns.spec.ts     # Campaign tests
```

## Page Object Pattern

This test suite uses the **Page Object Pattern** to improve test maintainability and readability:

- **Page Objects** (`page-objects/*`) - Classes that encapsulate the technical details of page manipulation
- **Tests** (`tests/*.spec.ts`) - Test cases that use the Page Object API to express behavior naturally

### Benefits:
1. **Separation of Concerns**: Technical selectors are isolated from test logic
2. **Reusability**: Page Objects can be reused across multiple tests
3. **Maintainability**: Changes to the UI only need to be updated in one place
4. **Readability**: Tests read like natural language

## Getting Started

### 1. Install Dependencies

```bash
cd frontend/e2e
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

### 3. Run Tests

#### Run all tests:
```bash
npm test
```

#### Run tests in headed mode (see browser):
```bash
npm run test:headed
```

#### Run specific test file:
```bash
npx playwright test auth.spec.ts
```

#### Run tests with UI mode (interactive dashboard):
```bash
npm run test:ui
```

#### Run tests on specific browser:
```bash
npm run test:chrome    # Chromium
npm run test:firefox   # Firefox
npm run test:webkit    # WebKit (Safari)
npm run test:mobile    # Mobile Chrome
```

## Writing New Tests

### 1. Create a Page Object (if needed)

Create a new file in `page-objects/` for each page or component:

```typescript
// page-objects/ExamplePage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class ExamplePage extends BasePage {
  readonly title: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('h1');
    this.submitButton = page.locator('button[type="submit"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/example');
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
```

### 2. Create a Test File

Create a new test file in `tests/`:

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';
import { ExamplePage } from '../page-objects/ExamplePage';

test.describe('Example Feature', () => {
  let examplePage: ExamplePage;

  test.beforeEach(async ({ page }) => {
    examplePage = new ExamplePage(page);
    await examplePage.navigate();
  });

  test('Example page loads successfully', async () => {
    // Act & Assert
    await expect(examplePage.title).toBeVisible();
  });

  test('User can submit the form', async () => {
    // Act
    await examplePage.submit();
    
    // Assert
    await expect(examplePage.page).toHaveURL('/success');
  });
});
```

### 3. Run Your Tests

```bash
npx playwright test example.spec.ts
```

## Test Organization

Tests are organized by feature/domain:

- `auth.spec.ts` - Authentication (login, register, logout)
- `navigation.spec.ts` - Navigation between pages
- `mobileNavigation.spec.ts` - Mobile-specific navigation
- `homepage.spec.ts` - Homepage content and functionality
- `campaigns.spec.ts` - Campaign-related functionality

## Best Practices

### 1. Test Naming
- Use clear, descriptive test names
- Follow the pattern: `User can [action] [result]`
- Example: `User can navigate to login page from home`

### 2. Test Structure
```typescript
test.describe('Feature Name', () => {
  // Setup - runs before each test
  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    // Navigate to starting page
  });

  test('Test description', async () => {
    // Arrange - setup test conditions
    
    // Act - perform the action being tested
    
    // Assert - verify the expected outcome
  });
});
```

### 3. Use Page Objects
- Always use Page Objects instead of direct selectors in tests
- This makes tests more readable and maintainable
- Example: `await loginPage.login('user', 'pass')` instead of `await page.locator('#username').fill('user')`

### 4. Keep Tests Independent
- Each test should be independent of others
- Use `beforeEach` to reset state before each test
- Don't rely on the state left by previous tests

### 5. Test One Thing Per Test
- Each test should verify one specific behavior
- If you find yourself writing "and" in the test description, consider splitting it

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- Tests run in parallel by default
- Tests run on multiple browsers (Chromium, Firefox, WebKit)
- Mobile viewports are tested
- Screenshots and videos are captured on failure
- Web server is automatically started for local development

## Debugging

### View Test Report
```bash
npm run show-report
```

### Run in Debug Mode
```bash
npm run test:debug
```

### Pause Execution
Add `await page.pause();` in your test to pause and inspect the page.

Or in a Page Object:
```typescript
async pause(): Promise<void> {
  await this.page.pause();
}
```

### Generate Code
Use Playwright's code generator to create new tests:
```bash
npx playwright codegen http://localhost:5173
```

## Environment Variables

Create a `.env` file in the `e2e/` directory to configure the base URL:

```env
BASE_URL=http://localhost:5173
```

## CI/CD Integration

For CI/CD pipelines:

1. Install dependencies: `npm install`
2. Install browsers: `npx playwright install --with-deps`
3. Run tests: `npx playwright test`

Add `CI=true` environment variable to prevent automatic web server startup.

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Page Object Pattern](https://martinfowler.com/bliki/PageObject.html)
- [Playwright Test API](https://playwright.dev/docs/test-api)
