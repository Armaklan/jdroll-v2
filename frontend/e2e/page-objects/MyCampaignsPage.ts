import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the My Campaigns page
 * Provides methods to interact with the user's campaigns
 */
export class MyCampaignsPage extends BasePage {
  // Selectors
  readonly title: Locator;
  readonly createCampaignButton: Locator;
  readonly campaignCards: Locator;
  readonly emptyState: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    
    this.title = page.getByRole('heading', { name: /Mes Campagnes/i });
    this.createCampaignButton = page.getByRole('link', { name: /Créer une campagne/i }).or(
      page.locator('a[href*="campaigns/new"], a[href*="create-campaign"]')
    );
    this.campaignCards = page.locator('.bg-white.border.border-slate-200.rounded-2xl, [class*="rounded-2xl"][class*="border"]');
    this.emptyState = page.getByText(/Aucune campagne|pas de campagne/i);
    this.searchInput = page.locator('input[type="search"]');
  }

  /**
   * Navigate to the my campaigns page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/my-campaigns');
    await this.waitForLoad();
    // Wait for either campaigns or empty state
    try {
      await this.page.waitForSelector('.bg-white.border.border-slate-200.rounded-2xl', { timeout: 5000 });
    } catch {
      // May be empty
    }
  }

  /**
   * Verify that we are on the my campaigns page
   */
  async isOnPage(): Promise<boolean> {
    return await this.title.count() > 0 || 
           await this.createCampaignButton.count() > 0 ||
           await this.emptyState.count() > 0;
  }

  /**
   * Click on the create campaign button
   */
  async clickCreateCampaignButton(): Promise<void> {
    await this.click(this.createCampaignButton);
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if there are any campaign cards
   */
  async hasCampaigns(): Promise<boolean> {
    return await this.campaignCards.count() > 0;
  }

  /**
   * Get the number of campaign cards
   */
  async getCampaignCount(): Promise<number> {
    return await this.campaignCards.count();
  }

  /**
   * Check if the page is showing empty state
   */
  async isEmpty(): Promise<boolean> {
    return await this.emptyState.count() > 0;
  }

  /**
   * Get all campaign card titles
   */
  async getCampaignTitles(): Promise<string[]> {
    const titles: string[] = [];
    const cards = await this.campaignCards.all();
    
    for (const card of cards) {
      const title = await card.locator('.font-bold.text-slate-900, h3, [class*="font-bold"]').textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }

  /**
   * Click on a campaign card by index
   */
  async clickCampaignCard(index: number): Promise<void> {
    const cards = await this.campaignCards.all();
    if (index < 0 || index >= cards.length) {
      throw new Error(`Campaign card index ${index} is out of bounds`);
    }
    await cards[index].click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for campaigns
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Wait for search to complete
  }

  /**
   * Get the text from the create campaign button
   */
  async getCreateCampaignButtonText(): Promise<string> {
    return await this.getText(this.createCampaignButton);
  }

  /**
   * Wait for campaigns to load
   */
  async waitForCampaigns(): Promise<void> {
    await this.campaignCards.first().waitFor({ state: 'visible', timeout: 10000 });
  }
}
