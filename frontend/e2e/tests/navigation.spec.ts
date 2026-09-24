import { test, expect } from '@playwright/test';
import { HomePage } from '../page-objects/HomePage';
import { Navbar } from '../page-objects/Navbar';
import { MyCampaignsPage } from '../page-objects/MyCampaignsPage';
import { CampaignFormPage } from '../page-objects/CampaignFormPage';

/**
 * Navigation Tests
 * Tests for navigating between pages and the navbar functionality
 * Uses PageObject pattern for cleaner, more maintainable tests
 */

test.describe('Navigation', () => {
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
   * Test 1: Navbar logo redirects to home
   */
  test('Clicking on logo redirects to home page', async () => {
    // Act: Click on logo
    await navbar.homeLink.click();
    await navbar.waitForNavigation();
    
    // Assert: Should be on home page
    await expect(homePage.isOnPage()).resolves.toBeTruthy();
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 2: User can navigate to My Campaigns page from navbar
   */
  test('User can navigate to My Campaigns page from navbar', async () => {
    // Act: Click on campaigns link in navbar
    await navbar.clickCampaigns();
    
    // Assert: Should be on my campaigns page or login (if not auth)
    await expect(navbar.getPage()).toHaveURL(/my-campaigns|login/);
  });

  /**
   * Test 3: User can navigate to Forum page
   */
  test('User can navigate to Forum page from navbar', async () => {
    // Act: Click on forum link in navbar
    await navbar.clickForum();
    
    // Assert: URL should contain forum
    await expect(navbar.getPage()).toHaveURL(/forum/);
  });

  /**
   * Test 4: User can navigate to Chat page
   */
  test('User can navigate to Chat page from navbar', async () => {
    // Act: Click on chat link in navbar
    await navbar.clickChat();
    
    // Assert: URL should be /chat
    await expect(navbar.getPage()).toHaveURL('/chat');
  });

  /**
   * Test 5: User can navigate to Messages page
   */
  test('User can navigate to Messages page from navbar', async () => {
    // Act: Click on messages link in navbar
    await navbar.clickMessages();
    
    // Assert: URL should be /messages or login (if not auth)
    await expect(navbar.getPage()).toHaveURL(/messages|login/);
  });

  /**
   * Test 6: Home page displays all quick access cards
   */
  test('Home page displays all quick access cards', async () => {
    // Assert: All cards should be visible
    await expect(homePage.myCampaignsCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.createCampaignCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.joinCampaignCard).toBeVisible({ timeout: 5000 });
    await expect(homePage.forumCard).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 7: User can navigate to My Campaigns from quick access card
   */
  test('User can navigate to My Campaigns from quick access card', async () => {
    // Act: Click on My Campaigns card
    await homePage.clickMyCampaignsCard();
    
    // Assert: Should navigate to my campaigns or login
    await expect(navbar.getPage()).toHaveURL(/my-campaigns|login/);
  });

  /**
   * Test 8: User can navigate to Create Campaign from quick access card
   */
  test('User can navigate to Create Campaign from quick access card', async () => {
    // Act: Click on Create Campaign card
    await homePage.clickCreateCampaignCard();
    
    // Assert: Should navigate to create campaign or login
    await expect(navbar.getPage()).toHaveURL(/campaigns\/new|login/);
  });

  /**
   * Test 9: User can navigate to Join Campaign from quick access card
   */
  test('User can navigate to Join Campaign from quick access card', async () => {
    // Act: Click on Join Campaign card
    await homePage.clickJoinCampaignCard();
    
    // Assert: Should navigate to join campaign
    await expect(navbar.getPage()).toHaveURL('/join-campaign');
  });

  /**
   * Test 10: User can navigate to Forum from quick access card
   */
  test('User can navigate to Forum from quick access card', async () => {
    // Act: Click on Forum card
    await homePage.clickForumCard();
    
    // Assert: URL should contain forum
    await expect(navbar.getPage()).toHaveURL(/forum/);
  });

  /**
   * Test 11: Home page displays hero section
   */
  test('Home page hero section is displayed correctly', async () => {
    // Assert: Hero section elements
    await expect(homePage.heroTitle).toBeVisible({ timeout: 5000 });
    await expect(homePage.heroSubtitle).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 12: Navigation between pages updates URL correctly
   */
  test('Navigation updates URL correctly', async ({ page }) => {
    // Arrange: Start at home
    await expect(page).toHaveURL('/');
    
    // Act: Navigate to login page (simpler to test)
    await navbar.clickLogin();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/login/);
    
    // Navigate back to home
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  /**
   * Test 13: Home page displays content sections
   */
  test('Home page displays all content sections', async () => {
    // Assert: All sections should be visible
    await expect(homePage.communitySection).toBeVisible({ timeout: 5000 });
    await expect(homePage.choiceSection).toBeVisible({ timeout: 5000 });
    await expect(homePage.platformSection).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test 14: Create Campaign page is accessible
   */
  test('Create Campaign page is accessible', async () => {
    // Act: Navigate to create campaign page
    await campaignFormPage.navigate();
    
    // Assert: Should be on create campaign page or login
    await expect(campaignFormPage.isOnPage()).resolves.toBeTruthy();
  });
});
