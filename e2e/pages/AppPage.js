/**
 * Page Object Model for Kilterboard Logbook App
 * Provides methods to interact with the application
 */

const { expect } = require('@playwright/test');
const path = require('path');

class AppPage {
  constructor(page) {
    this.page = page;
    
    // Loading screen elements
    this.loadingScreen = page.locator('#loading-screen');
    this.fileInput = page.locator('#db-file-input');
    this.selectDatabaseButton = page.getByRole('button', { name: /select database/i });
    this.loadingStatus = page.locator('#loading-status');
    
    // Main screen elements
    this.mainScreen = page.locator('#main-screen');
    this.totalCount = page.locator('#total-count');
    this.recordList = page.locator('#record-list');
    this.loadMoreButton = page.locator('#load-more');
    
    // Header buttons
    this.statsButton = page.locator('button[title="Statistics"]');
    this.reloadButton = page.locator('button[title="Reload"]');
    
    // Stats page
    this.statsPage = page.locator('#stats-page');
    this.statsCloseButton = page.locator('#stats-page button').first();
    this.statsTabs = {
      overview: page.locator('.stats-tab[data-tab="overview"]'),
      grade: page.locator('.stats-tab[data-tab="grade"]'),
      trend: page.locator('.stats-tab[data-tab="trend"]'),
      sql: page.locator('.stats-tab[data-tab="sql"]'),
    };
    
    // Filter elements
    this.filterBar = page.locator('#filter-bar');
    this.filterPanel = page.locator('#filter-panel');
    this.filterButton = page.locator('button.filter-btn');
    this.filterTime = page.locator('#filter-time');
    this.filterAscent = page.locator('#filter-ascent');
    this.filterBid = page.locator('#filter-bid');
    this.filterSearch = page.locator('#filter-search');
    this.resetFiltersButton = page.getByRole('button', { name: /reset filters/i });
    
    // Detail modal
    this.detailModal = page.locator('#detail-modal');
    this.modalCloseButton = page.locator('.modal-close');
    
    // KPI cards in stats
    this.kpiTotal = page.locator('#kpi-total');
    this.kpiAscent = page.locator('#kpi-ascent');
    this.kpiBid = page.locator('#kpi-bid');
    this.kpiFlash = page.locator('#kpi-flash');
    
    // SQL explorer
    this.sqlInput = page.locator('#sql-input');
    this.sqlTemplate = page.locator('#sql-template');
    this.runQueryButton = page.getByRole('button', { name: /run query/i });
    this.sqlResult = page.locator('#sql-result');
  }

  /**
   * Navigate to the app and wait for initial load
   */
  async goto() {
    await this.page.goto('/');
    // Wait for the page to be ready
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clear IndexedDB cache by reloading and clicking reload button
   */
  async clearIndexedDBCache() {
    // Execute in browser context to clear IndexedDB
    await this.page.evaluate(async () => {
      return new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('KilterLogbookDB');
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        request.onblocked = () => resolve(false);
        // Timeout fallback
        setTimeout(() => resolve(false), 1000);
      });
    });
  }

  /**
   * Load database file
   * @param {string} dbFileName - Name of the db file in fixtures folder
   */
  async loadDatabase(dbFileName = 'test-data.db') {
    const dbPath = path.resolve(__dirname, `../fixtures/${dbFileName}`);
    
    // Wait for file input to be present in DOM
    await expect(this.fileInput).toBeAttached({ timeout: 10000 });
    
    // Upload file
    await this.fileInput.setInputFiles(dbPath);
    
    // Wait for main screen to appear (SQL.js initialization takes time)
    await expect(this.mainScreen).toBeVisible({ timeout: 30000 });
    await expect(this.loadingScreen).not.toHaveClass(/active/);
  }

  /**
   * Check if loading screen is active/visible
   */
  async isLoadingScreenVisible() {
    const hasActive = await this.loadingScreen.evaluate(el => 
      el.classList.contains('active')
    );
    return hasActive;
  }

  /**
   * Check if main screen is active/visible
   */
  async isMainScreenVisible() {
    const hasActive = await this.mainScreen.evaluate(el => 
      el.classList.contains('active')
    );
    return hasActive;
  }

  /**
   * Click reload button to clear cache
   */
  async clickReloadButton() {
    await this.reloadButton.click();
  }

  /**
   * Open statistics page
   */
  async openStats() {
    await this.statsButton.click();
    await expect(this.statsPage).toHaveClass(/active/);
  }

  /**
   * Close statistics page
   */
  async closeStats() {
    await this.statsCloseButton.click();
    await expect(this.statsPage).not.toHaveClass(/active/);
  }

  /**
   * Switch to a specific stats tab
   */
  async switchStatsTab(tabName) {
    await this.statsTabs[tabName].click();
    await expect(this.statsTabs[tabName]).toHaveClass(/active/);
  }

  /**
   * Open filter panel
   */
  async openFilterPanel() {
    await this.filterButton.click();
    await expect(this.filterPanel).toHaveClass(/active/);
  }

  /**
   * Close filter panel
   */
  async closeFilterPanel() {
    // Click the close button
    const closeButton = this.filterPanel.locator('.btn-close');
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      // Fallback: click outside the panel
      await this.page.click('body', { position: { x: 10, y: 10 } });
    }
    await expect(this.filterPanel).not.toHaveClass(/active/);
  }

  /**
   * Apply time filter
   */
  async filterByTime(timeValue) {
    await this.filterTime.selectOption(timeValue);
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  /**
   * Toggle ascent filter
   */
  async toggleAscentFilter(show) {
    const isChecked = await this.filterAscent.isChecked();
    if (isChecked !== show) {
      await this.filterAscent.click();
    }
  }

  /**
   * Toggle bid filter
   */
  async toggleBidFilter(show) {
    const isChecked = await this.filterBid.isChecked();
    if (isChecked !== show) {
      await this.filterBid.click();
    }
  }

  /**
   * Search by climb name
   */
  async searchByName(name) {
    await this.filterSearch.fill(name);
    await this.page.waitForTimeout(300); // Wait for filter to apply
  }

  /**
   * Reset all filters
   */
  async resetFilters() {
    await this.resetFiltersButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Get total record count
   */
  async getRecordCount() {
    const text = await this.totalCount.textContent();
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Click on a record card to open detail
   */
  async openRecordDetail(index = 0) {
    const cards = this.recordList.locator('.record-card');
    await cards.nth(index).click();
    await expect(this.detailModal).toHaveClass(/active/);
  }

  /**
   * Close detail modal
   */
  async closeDetailModal() {
    await this.modalCloseButton.click();
    await expect(this.detailModal).not.toHaveClass(/active/);
  }

  /**
   * Load more records
   */
  async loadMore() {
    await this.loadMoreButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Execute SQL query
   */
  async executeSqlQuery(query) {
    await this.sqlInput.fill(query);
    await this.runQueryButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get KPI values from stats page
   */
  async getKPIValues() {
    return {
      total: await this.kpiTotal.textContent(),
      ascents: await this.kpiAscent.textContent(),
      bids: await this.kpiBid.textContent(),
      flash: await this.kpiFlash.textContent(),
    };
  }

  /**
   * Wait for charts to render
   */
  async waitForCharts() {
    await this.page.waitForTimeout(1000); // Charts need time to render
  }
}

module.exports = { AppPage };
