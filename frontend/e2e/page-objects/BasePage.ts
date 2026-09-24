import { Page, Locator } from '@playwright/test';

/**
 * Base Page Object class that provides common functionality for all pages
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get the underlying Playwright page object
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Navigate to the page URL
   */
  abstract navigate(): Promise<void>;

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Get the current URL path
   */
  async getPath(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for the page to be fully loaded
   */
  async waitForLoad(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Wait for a specific selector to be visible
   */
  async waitForSelector(selector: string, timeout: number = 5000): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Check if an element is visible
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    try {
      const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element exists in the DOM
   */
  async exists(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    const count = await locator.count();
    return count > 0;
  }

  /**
   * Click on an element with wait
   */
  async click(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.click();
  }

  /**
   * Fill an input field
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible' });
    await locator.fill(value);
  }

  /**
   * Get text content from an element
   */
  async getText(selector: string | Locator): Promise<string> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 2000 });
    return (await locator.textContent())?.trim() || '';
  }

  /**
   * Wait for navigation to complete
   * For SPA navigation, this just waits a short time
   */
  async waitForNavigation(): Promise<void> {
    // For React Router navigation, waitForNavigation doesn't work
    // Instead, just wait a short time for the URL to change
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForURL(pattern: RegExp | string, timeout: number = 10000): Promise<void> {
    await this.page.waitForURL(pattern, { timeout });
  }
}
