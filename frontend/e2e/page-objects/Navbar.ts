import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Navbar component
 * Provides methods to interact with the navigation bar
 */
export class Navbar extends BasePage {
  // Selectors - using more reliable selectors
  readonly logo: Locator;
  readonly homeLink: Locator;
  readonly campaignsLink: Locator;
  readonly forumLink: Locator;
  readonly chatLink: Locator;
  readonly messagesLink: Locator;
  readonly loginButton: Locator;
  readonly registerButton: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;
  readonly mobileMenuButton: Locator;
  readonly notificationsButton: Locator;
  readonly unreadMessagesCount: Locator;
  readonly notificationsCount: Locator;

  constructor(page: Page) {
    super(page);
    
    // Logo and brand - more specific selectors
    this.logo = page.locator('a[href="/"]:has(img)');
    // homeLink should point to the logo link, not the "Accueil" nav link
    this.homeLink = page.getByRole('link', { name: /JdRoll Logo/i }).or(page.locator('a[href="/"]:has(img)'));
    
    // Main navigation links - use getByRole for accessibility
    this.campaignsLink = page.getByRole('link', { name: /Campagnes|Jouer/i });
    this.forumLink = page.getByRole('link', { name: /Forum/i });
    this.chatLink = page.getByRole('link', { name: /Tchat/i });
    this.messagesLink = page.getByRole('link', { name: /Messagerie/i });
    
    // Auth buttons - can be link or button, in nav or main (mobile)
    // Use :visible to only target visible elements
    this.loginButton = page.locator('a[href="/login"]:visible, button:has-text("Se connecter"):visible').first();
    this.registerButton = page.locator('a[href="/register"]:visible, button:has-text("S\'inscrire"):visible').first();
    
    // User menu (when logged in)
    this.userMenu = page.getByRole('link', { name: /Paramètres/i }).or(page.locator('a[href="/settings"]'));
    this.logoutButton = page.getByRole('button', { name: /Déconnexion/i });
    
    // Mobile menu
    this.mobileMenuButton = page.getByLabel('Menu');
    
    // Notifications
    this.notificationsButton = page.getByLabel('Notifications');
    // Count badges - more flexible selector
    this.unreadMessagesCount = page.locator('.bg-red-500:text-white:has-text(/\d+|99\+/):visible');
    this.notificationsCount = page.locator('.absolute.-top-1.-right-1.min-w-\[18px\].h-\[18px\].bg-red-500:visible');
  }

  /**
   * Navigate to home page
   */
  async navigate(): Promise<void> {
    await this.homeLink.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if user is authenticated (logged in)
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.userMenu.count() > 0 || await this.logoutButton.count() > 0;
  }

  /**
   * Check if user is not authenticated (guest)
   */
  async isGuest(): Promise<boolean> {
    return await this.loginButton.count() > 0 || await this.registerButton.count() > 0;
  }

  /**
   * Click on login button
   */
  async clickLogin(): Promise<void> {
    await this.click(this.loginButton);
    // Use waitForURL instead of waitForNavigation for SPA navigation
    await this.page.waitForURL(/\/login/);
  }

  /**
   * Click on register button
   */
  async clickRegister(): Promise<void> {
    await this.click(this.registerButton);
    // Use waitForURL instead of waitForNavigation for SPA navigation
    await this.page.waitForURL(/\/register/);
  }

  /**
   * Click on campaigns link
   */
  async clickCampaigns(): Promise<void> {
    await this.click(this.campaignsLink);
    // May navigate to my-campaigns or login (if not authenticated)
    await this.page.waitForURL(/\/my-campaigns|\/login/);
  }

  /**
   * Click on forum link
   */
  async clickForum(): Promise<void> {
    await this.click(this.forumLink);
    // May navigate to forum or login (if not authenticated)
    await this.page.waitForURL(/\/forum|\/login/);
  }

  /**
   * Click on chat link
   */
  async clickChat(): Promise<void> {
    await this.click(this.chatLink);
    // May navigate to chat or login (if not authenticated)
    await this.page.waitForURL(/\/chat|\/login/);
  }

  /**
   * Click on messages link
   */
  async clickMessages(): Promise<void> {
    await this.click(this.messagesLink);
    // May navigate to messages or login (if not authenticated)
    await this.page.waitForURL(/\/messages|\/login/);
  }

  /**
   * Open mobile menu
   */
  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    // Wait for mobile menu to be visible
    await this.page.waitForTimeout(500);
  }

  /**
   * Close mobile menu
   */
  async closeMobileMenu(): Promise<void> {
    // Try to find close button or click menu again
    const closeButton = this.page.getByLabel('Menu').or(this.page.getByRole('button', { name: /Close|Fermer/i }));
    await closeButton.click().catch(() => {
      // If already closed, that's fine
    });
  }

  /**
   * Click link by text
   */
  async clickLinkByText(text: string): Promise<void> {
    await this.page.getByRole('link', { name: new RegExp(text, 'i') }).first().click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click button by text
   */
  async clickButtonByText(text: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(text, 'i') }).first().click();
  }
}
