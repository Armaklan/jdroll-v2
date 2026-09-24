import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Campaign Form page (Create/Edit campaign)
 * Provides methods to create and edit campaigns
 */
export class CampaignFormPage extends BasePage {
  // Selectors
  readonly title: Locator;
  readonly campaignNameInput: Locator;
  readonly campaignDescriptionInput: Locator;
  readonly campaignTypeSelect: Locator;
  readonly campaignVisibilitySelect: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly form: Locator;

  constructor(page: Page) {
    super(page);
    
    this.title = page.getByRole('heading', { name: /Créer une campagne/i });
    this.campaignNameInput = page.getByLabel(/Nom de la campagne/i);
    this.campaignDescriptionInput = page.getByLabel(/Description/i);
    this.campaignTypeSelect = page.locator('select[name*="type"]') || page.getByLabel(/Type de campagne/i);
    this.campaignVisibilitySelect = page.locator('select[name*="visibility"]') || page.getByLabel(/Visibilité/i);
    this.saveButton = page.getByRole('button', { name: /Enregistrer|Créer|Sauvegarder/i });
    this.cancelButton = page.getByRole('button', { name: /Annuler/i });
    this.errorMessage = page.locator('.bg-red-50, .border-red-200, .text-red-700').filter({ hasText: /Erreur|Error/i });
    this.loadingSpinner = page.locator('.animate-spin:visible');
    this.form = page.locator('form');
  }

  /**
   * Navigate to create campaign page
   */
  async navigate(): Promise<void> {
    await this.page.goto('/campaigns/new');
    await this.waitForLoad();
    await this.form.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  /**
   * Navigate to edit campaign page
   */
  async navigateToEdit(campaignId: string): Promise<void> {
    await this.page.goto(`/campaigns/${campaignId}/edit`);
    await this.waitForLoad();
    await this.form.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }

  /**
   * Verify that we are on the campaign form page
   */
  async isOnPage(): Promise<boolean> {
    return await this.title.count() > 0 || 
           await this.campaignNameInput.count() > 0 ||
           await this.form.count() > 0;
  }

  /**
   * Fill the campaign form
   */
  async fillForm(data: {
    name: string;
    description: string;
    type?: string;
    visibility?: string;
  }): Promise<void> {
    await this.campaignNameInput.fill(data.name);
    await this.campaignDescriptionInput.fill(data.description);
    
    if (data.type && await this.campaignTypeSelect.count() > 0) {
      await this.campaignTypeSelect.selectOption(data.type);
    }
    
    if (data.visibility && await this.campaignVisibilitySelect.count() > 0) {
      await this.campaignVisibilitySelect.selectOption(data.visibility);
    }
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    await this.saveButton.click();
    try {
      await this.page.waitForNavigation({ timeout: 10000 });
    } catch {
      // No navigation, might be form validation
    }
    await this.page.waitForTimeout(500);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: {
    name: string;
    description: string;
    type?: string;
    visibility?: string;
  }): Promise<void> {
    await this.fillForm(data);
    await this.submit();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click cancel button
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if form is in loading state
   */
  async isLoading(): Promise<boolean> {
    const disabled = await this.saveButton.getAttribute('disabled');
    const hasSpinner = await this.loadingSpinner.count() > 0;
    return disabled !== null || hasSpinner;
  }

  /**
   * Check if there's an error
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.count() > 0;
  }

  /**
   * Get error message
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.count() > 0) {
      return await this.getText(this.errorMessage);
    }
    return null;
  }

  /**
   * Get form values
   */
  async getFormValues(): Promise<{
    name: string;
    description: string;
    type: string;
    visibility: string;
  }> {
    return {
      name: await this.campaignNameInput.inputValue(),
      description: await this.campaignDescriptionInput.inputValue(),
      type: await this.campaignTypeSelect.count() > 0 ? await this.campaignTypeSelect.inputValue() : '',
      visibility: await this.campaignVisibilitySelect.count() > 0 ? await this.campaignVisibilitySelect.inputValue() : '',
    };
  }

  /**
   * Clear the form
   */
  async clearForm(): Promise<void> {
    await this.campaignNameInput.clear();
    await this.campaignDescriptionInput.clear();
  }
}
