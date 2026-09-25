import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';

/**
 * Homepage Tests
 * Tests for the home page content and functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Homepage', () => {
  let homePage: HomePage;
  let navbar: Navbar;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);
    
    // Start from home page
    await homePage.navigate();
  });

  /**
   * Test 1: Homepage loads successfully
   */
  test('Homepage loads successfully', async () => {
    // Assert: Page should load and hero section visible
    await expect(homePage.isOnPage()).resolves.toBeTruthy();
    await expect(homePage.heroTitle).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 2: Homepage has correct page title
   */
  test('Homepage has correct title', async ({ page }) => {
    // Wait a bit for title to be set
    await page.waitForTimeout(500);
    const title = await page.title();
    expect(title.toLowerCase()).toContain('jdroll');
  });

  /**
   * Test 3: Homepage displays hero section content
   */
  test('Homepage hero section has correct content', async () => {
    // Assert: Hero section content
    await expect(homePage.heroTitle).toContainText(/JdRoll/i);
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
    
    // Subtitle might be in different format
    const subtitleText = await homePage.heroSubtitle.textContent();
    expect(subtitleText?.toLowerCase()).toContain('jeu');
  });

  /**
   * Test 4: Homepage shows auth buttons for unauthenticated user
   */
  test('Homepage shows login and register buttons for unauthenticated user', async () => {
    // Assert: Auth buttons should be visible
    await expect(navbar.loginButton).toBeVisible({ timeout: 5000 });
    await expect(navbar.registerButton).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 5: Homepage displays all content sections
   */
  test('Homepage displays all main content sections', async () => {
    // Assert: All sections should be visible
    await expect(homePage.communitySection).toBeVisible({ timeout: 5000 });
    await expect(homePage.choiceSection).toBeVisible({ timeout: 5000 });
    await expect(homePage.platformSection).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 6: Community section has correct content
   */
  test('Community section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.communitySection.textContent();
    expect(sectionText?.toLowerCase()).toContain('communauté');
  });

  /**
   * Test 7: Choice section has correct content
   */
  test('Choice section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.choiceSection.textContent();
    expect(sectionText?.toLowerCase()).toContain('choix');
  });

  /**
   * Test 8: Platform section has correct content
   */
  test('Platform section has correct content', async () => {
    // Assert: Section content
    const sectionText = await homePage.platformSection.textContent();
    expect(sectionText?.toLowerCase()).toContain('plateforme');
  });

  /**
   * Test 11: Homepage is responsive
   */
  test('Homepage adapts to different screen sizes', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(homePage.heroTitle).toBeVisible({ timeout: 3000 });
  });

  /**
   * Test 12: Homepage layout is consistent
   */
  test('Homepage has consistent layout structure', async ({ page }) => {
    // Assert: Main container exists - simple check
    await expect(page.locator('main')).toHaveCount(1);
    // Check that hero title is visible (basic layout check)
    await expect(homePage.heroTitle).toBeVisible();
  });
});

/**
 * Homepage Campaign Carousel Tests
 * The homepage displays a carousel with recruiting campaigns,
 * falling back to random active campaigns when none recruit.
 */

function makeCampaign(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    name: 'Table de test',
    mjId: 1,
    mjUsername: 'TestMJ',
    nbJoueurs: 4,
    nbJoueursActuel: 1,
    banniere: '',
    systeme: 'D&D 5e',
    univers: 'Médiéval-fantastique',
    description: 'Une table de test.',
    statut: 0,
    isArchived: false,
    isRecrutementOpen: true,
    ...overrides,
  };
}

test.describe('Homepage campaign carousel', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('Homepage displays a carousel with recruiting tables', async () => {
    await homePage.navigate();

    // Carousel section visible with at least one slide
    await expect(homePage.carouselSection).toBeVisible({ timeout: 10000 });
    const slideCount = await homePage.carouselSlides.count();
    expect(slideCount).toBeGreaterThanOrEqual(1);

    // Title advertises recruiting tables
    const titleText = await homePage.carouselTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('recrute');
  });

  test('Carousel next and previous buttons scroll the slides', async ({ page }) => {
    // Mock 5 recruiting campaigns to guarantee multiple slides
    const mocked = Array.from({ length: 5 }, (_, i) =>
      makeCampaign({ id: i + 1, name: `Table recrute ${i + 1}` })
    );
    await page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: mocked }),
      });
    });

    await homePage.navigate();
    await expect(homePage.carouselSection).toBeVisible({ timeout: 10000 });
    await expect(homePage.carouselSlides).toHaveCount(5);

    const scrollBefore = await homePage.carouselTrack.evaluate((el: HTMLElement) => el.scrollLeft);

    // Next button scrolls forward
    await homePage.carouselNextButton.click();
    await expect
      .poll(async () => homePage.carouselTrack.evaluate((el: HTMLElement) => el.scrollLeft))
      .toBeGreaterThan(scrollBefore);

    // Previous button scrolls back
    await homePage.carouselPrevButton.click();
    await expect
      .poll(async () => homePage.carouselTrack.evaluate((el: HTMLElement) => el.scrollLeft))
      .toBe(scrollBefore);
  });

  test('Carousel falls back to random active tables when none recruit', async ({ page }) => {
    // No recruiting campaign: 2 active, 1 archived, 1 in preparation
    const mocked = [
      makeCampaign({ id: 11, name: 'Aventure active', isRecrutementOpen: false, statut: 0 }),
      makeCampaign({ id: 12, name: 'Autre aventure', isRecrutementOpen: false, statut: 0 }),
      makeCampaign({ id: 13, name: 'Ancienne table', isRecrutementOpen: false, statut: 2, isArchived: true }),
      makeCampaign({ id: 14, name: 'Table en préparation', isRecrutementOpen: false, statut: 3 }),
    ];
    await page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: mocked }),
      });
    });

    await homePage.navigate();
    await expect(homePage.carouselSection).toBeVisible({ timeout: 10000 });

    // Only the 2 active campaigns are displayed
    await expect(homePage.carouselSlides).toHaveCount(2);

    // Title advertises active tables instead of recruiting ones
    const titleText = await homePage.carouselTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('active');
    expect(titleText?.toLowerCase()).not.toContain('recrute');
  });

  test('Carousel is hidden when no campaign is available at all', async ({ page }) => {
    await page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: [] }),
      });
    });

    await homePage.navigate();
    await homePage.heroTitle.waitFor({ state: 'visible', timeout: 10000 });
    await expect(homePage.carouselSection).toHaveCount(0);
  });

  test('Carousel slides are at most 280px wide', async ({ page }) => {
    const mocked = Array.from({ length: 5 }, (_, i) =>
      makeCampaign({ id: i + 1, name: `Table étroite ${i + 1}` })
    );
    await page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: mocked }),
      });
    });

    await homePage.navigate();
    await expect(homePage.carouselSlides).toHaveCount(5);

    const slideWidths = await homePage.carouselSlides.evaluateAll((slides) =>
      slides.map((slide) => slide.getBoundingClientRect().width)
    );
    for (const width of slideWidths) {
      expect(width).toBeLessThanOrEqual(280);
    }
  });

  test('Carousel slides are centered when they do not fill the track', async ({ page }) => {
    // Only 2 slides: they cannot fill the whole track width
    const mocked = [
      makeCampaign({ id: 21, name: 'Table centrée A' }),
      makeCampaign({ id: 22, name: 'Table centrée B' }),
    ];
    await page.route('**/api/campaigns?*', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ campaigns: mocked }),
      });
    });

    await homePage.navigate();
    await expect(homePage.carouselSlides).toHaveCount(2);

    const gaps = await homePage.carouselTrack.evaluate((track: HTMLElement) => {
      const trackRect = track.getBoundingClientRect();
      const slides = Array.from(
        track.querySelectorAll('[data-testid="home-campaign-carousel-slide"]')
      ) as HTMLElement[];
      const first = slides[0].getBoundingClientRect();
      const last = slides[slides.length - 1].getBoundingClientRect();
      return {
        leftGap: first.left - trackRect.left,
        rightGap: trackRect.right - last.right,
      };
    });

    // Slides are horizontally centered: left and right gaps are balanced
    expect(gaps.leftGap).toBeGreaterThan(0);
    expect(Math.abs(gaps.leftGap - gaps.rightGap)).toBeLessThan(5);
  });

  test('Presentation cards show icon and title on the same line', async () => {
    await homePage.navigate();

    const sections = [homePage.communitySection, homePage.choiceSection, homePage.platformSection];
    for (const section of sections) {
      const alignment = await section.evaluate((el: HTMLElement) => {
        const icon = el.querySelector('div svg')?.closest('div');
        const title = el.querySelector('div.text-xl') ?? el.querySelector('h2, h3');
        if (!icon || !title) {
          return null;
        }
        const iconRect = icon.getBoundingClientRect();
        const titleRect = title.getBoundingClientRect();
        return {
          iconCenterY: iconRect.top + iconRect.height / 2,
          titleCenterY: titleRect.top + titleRect.height / 2,
        };
      });
      expect(alignment).not.toBeNull();
      if (alignment) {
        // Icon and title share the same vertical line
        expect(Math.abs(alignment.iconCenterY - alignment.titleCenterY)).toBeLessThan(10);
      }
    }
  });
});
