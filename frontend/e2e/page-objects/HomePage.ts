import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Home page
 * Provides methods to interact with the home page elements
 */
export class HomePage extends BasePage {
  // Selectors - more reliable
  readonly heroTitle: Locator;
  readonly heroSubtitle: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly communitySection: Locator;
  readonly choiceSection: Locator;
  readonly platformSection: Locator;
  readonly carouselSection: Locator;
  readonly carouselTitle: Locator;
  readonly carouselTrack: Locator;
  readonly carouselSlides: Locator;
  readonly carouselNextButton: Locator;
  readonly carouselPrevButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.heroTitle = page.getByRole('heading', { name: /Bienvenue sur JdRoll/i, level: 1 });
    // Use more specific selector for subtitle - it's in the hero section after the title
    this.heroSubtitle = page.locator('p').filter({ hasText: /Du jeu, du rôle, du roll/i }).first();
    this.loginButton = page.getByRole('button', { name: /Se connecter/i }).first();
    this.registerButton = page.getByRole('button', { name: /S'inscrire/i }).first();

    // Content sections - use locator with filter for more control
    this.communitySection = page.locator('article').filter({ hasText: /Une communauté|Une communaute/i }).first();
    this.choiceSection = page.locator('article').filter({ hasText: /Du choix/i }).first();
    this.platformSection = page.locator('article').filter({ hasText: /Une plateforme/i }).first();

    // Campaign carousel
    this.carouselSection = page.locator('[data-testid="home-campaign-carousel"]');
    this.carouselTitle = page.locator('[data-testid="home-campaign-carousel-title"]');
    this.carouselTrack = page.locator('[data-testid="home-campaign-carousel-track"]');
    this.carouselSlides = page.locator('[data-testid="home-campaign-carousel-slide"]');
    this.carouselNextButton = page.locator('[data-testid="home-campaign-carousel-next"]');
    this.carouselPrevButton = page.locator('[data-testid="home-campaign-carousel-prev"]');
  }

  /**
   * Mock the GET /api/campaigns endpoint (used by the homepage carousel)
   */
  async mockCampaignsApi(campaigns: Array<Record<string, unknown>>): Promise<void> {
    await this.page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns }),
      });
    });
  }

  /**
   * Navigate to the home page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/');
    await this.waitForLoad();
    // Wait for hero section to be visible
    await this.heroTitle.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Verify that we are on the home page
   */
  async isOnPage(): Promise<boolean> {
    return await this.heroTitle.count() > 0;
  }

  /**
   * Click on the login button in the hero section
   */
  async clickLoginButton(): Promise<void> {
    await this.click(this.loginButton);
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Click on the register button in the hero section
   */
  async clickRegisterButton(): Promise<void> {
    await this.click(this.registerButton);
    await this.page.waitForURL(/\/register/);
  }

  /**
   * Check if login button is visible (user is not authenticated)
   */
  async isLoginButtonVisible(): Promise<boolean> {
    return await this.loginButton.count() > 0;
  }

  /**
   * Check if register button is visible (user is not authenticated)
   */
  async isRegisterButtonVisible(): Promise<boolean> {
    return await this.registerButton.count() > 0;
  }

  /**
   * Check if all content sections are visible
   */
  async areContentSectionsVisible(): Promise<boolean> {
    const sections = [
      this.communitySection,
      this.choiceSection,
      this.platformSection,
    ];
    
    for (const section of sections) {
      if (await section.count() === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get hero title text
   */
  async getHeroTitle(): Promise<string> {
    return await this.getText(this.heroTitle);
  }
}
