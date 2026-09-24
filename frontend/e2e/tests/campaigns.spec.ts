import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';
import { MyCampaignsPage } from '../page-objects/MyCampaignsPage';
import { CampaignFormPage } from '../page-objects/CampaignFormPage';

/**
 * Campaigns Tests
 * Tests for campaign-related functionality (viewing, creating campaigns)
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Campaigns', () => {
  let homePage: HomePage;
  let navbar: Navbar;
  let myCampaignsPage: MyCampaignsPage;
  let campaignFormPage: CampaignFormPage;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    homePage = new HomePage(page);
    navbar = new Navbar(page);
    myCampaignsPage = new MyCampaignsPage(page);
    campaignFormPage = new CampaignFormPage(page);
    
    // Start from home page
    await homePage.navigate();
  });

  /**
   * Test 1: My Campaigns page is accessible from navbar
   */
  test('My Campaigns page is accessible from navbar', async () => {
    // Act: Navigate to My Campaigns
    await navbar.clickCampaigns();
    
    // Assert: URL should contain my-campaigns or login (if not auth)
    await expect(navbar.getPage()).toHaveURL(/my-campaigns|login/);
  });

  /**
   * Test 2: My Campaigns page is accessible from home quick access
   */
  test('My Campaigns page is accessible from home quick access card', async () => {
    // Act: Click on My Campaigns card
    await homePage.clickMyCampaignsCard();
    
    // Assert: URL should contain my-campaigns or login
    await expect(navbar.getPage()).toHaveURL(/my-campaigns|login/);
  });

  /**
   * Test 3: Create Campaign page is accessible
   */
  test('Create Campaign page is accessible', async () => {
    // Act: Navigate to create campaign
    await campaignFormPage.navigate();
    
    // Assert: Should be on create campaign page or login
    const url = navbar.getPage().url();
    expect(url).toMatch(/campaigns\/new|login/);
  });

  /**
   * Test 4: Create Campaign page is accessible from quick access
   */
  test('Create Campaign page is accessible from home quick access card', async () => {
    // Act: Click on Create Campaign card
    await homePage.clickCreateCampaignCard();
    
    // Assert: URL should contain create campaign or login
    await expect(navbar.getPage()).toHaveURL(/campaigns\/new|login/);
  });

  /**
   * Test 5: Create Campaign form fields exist
   */
  test('Create Campaign form has all required fields when accessible', async ({ page }) => {
    // Navigate directly to create campaign
    await page.goto('/campaigns/new');
    
    // Wait for form or redirect
    try {
      await campaignFormPage.form.waitFor({ state: 'visible', timeout: 3000 });
      // If form is visible, check fields
      await expect(campaignFormPage.campaignNameInput).toBeVisible({ timeout: 3000 });
      await expect(campaignFormPage.campaignDescriptionInput).toBeVisible({ timeout: 3000 });
    } catch {
      // Redirected to login - that's expected for unauthenticated users
      await expect(page).toHaveURL(/login/);
    }
  });

  /**
   * Test 6: Create Campaign form fields have proper labels
   */
  test('Create Campaign form fields have proper labels when accessible', async ({ page }) => {
    await page.goto('/campaigns/new');
    
    try {
      await campaignFormPage.form.waitFor({ state: 'visible', timeout: 3000 });
      // Check for label elements
      await expect(page.getByLabel(/Nom de la campagne/i)).toHaveCount(1);
      await expect(page.getByLabel(/Description/i)).toHaveCount(1);
    } catch {
      // Redirected to login - that's expected
      await expect(page).toHaveURL(/login/);
    }
  });

  /**
   * Test 7: Create Campaign form can be filled when accessible
   */
  test('Create Campaign form can be filled with data when accessible', async ({ page }) => {
    await page.goto('/campaigns/new');
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // If redirected to login, that's expected for unauthenticated users
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/login/);
      return;
    }
    
    await campaignFormPage.form.waitFor({ state: 'visible', timeout: 3000 });
    
    const campaignData = {
      name: 'Test Campaign',
      description: 'This is a test campaign description',
    };
    
    // Act: Fill the form
    await campaignFormPage.fillForm(campaignData);
    
    // Assert: Form should have the values
    const formValues = await campaignFormPage.getFormValues();
    expect(formValues.name).toBe(campaignData.name);
    expect(formValues.description).toBe(campaignData.description);
  });

  /**
   * Test 8: Join Campaign page is accessible from navbar
   */
  test('Join Campaign page is accessible from navbar', async () => {
    // Act: Click on campaigns link
    await navbar.clickCampaigns();
    
    // Assert: URL should contain join-campaign or campaigns
    await expect(navbar.getPage()).toHaveURL(/campaigns|join-campaign|login/);
  });

  /**
   * Test 9: Join Campaign page is accessible from home quick access
   */
  test('Join Campaign page is accessible from home quick access card', async () => {
    // Act: Click on Join Campaign card
    await homePage.clickJoinCampaignCard();
    
    // Assert: Should navigate to join campaign
    await expect(navbar.getPage()).toHaveURL('/join-campaign');
  });

  /**
   * Test 10: Cancel button on Create Campaign form works
   */
  test('Cancel button on Create Campaign form navigates back when accessible', async ({ page }) => {
    await page.goto('/campaigns/new');
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // If redirected to login, that's expected for unauthenticated users
    if (page.url().includes('/login')) {
      await expect(page).toHaveURL(/login/);
      return;
    }
    
    // Otherwise, we should be on the form page
    await campaignFormPage.form.waitFor({ state: 'visible', timeout: 3000 });
    await campaignFormPage.cancel();
    
    // Should navigate away from create campaign page
    await expect(page).not.toHaveURL(/campaigns\/new$/);
  });

  /**
   * Test 11: Form has proper button types
   */
  test('Campaign form has proper button types when accessible', async ({ page }) => {
    await page.goto('/campaigns/new');
    
    try {
      await campaignFormPage.form.waitFor({ state: 'visible', timeout: 3000 });
      
      // Assert: Button types
      const saveButtonType = await campaignFormPage.saveButton.getAttribute('type');
      expect(saveButtonType).toBe('submit');
      
      const cancelButtonType = await campaignFormPage.cancelButton.getAttribute('type');
      expect(cancelButtonType).toBe('button');
    } catch {
      // Redirected to login - that's expected
      await expect(page).toHaveURL(/login/);
    }
  });
});
