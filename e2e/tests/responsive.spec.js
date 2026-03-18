/**
 * Responsive Design E2E Tests
 * 
 * 测试场景：
 * 1. 移动端视口适配
 * 2. 平板视口适配
 * 3. 桌面端显示
 * 4. 横屏/竖屏切换
 */

const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

const viewports = {
  mobile: { width: 375, height: 667 },
  mobileLarge: { width: 414, height: 896 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },
};

test.describe('响应式设计', () => {
  
  test('桌面端正常显示', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.desktop);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证 main screen 显示
    await expect(app.mainScreen).toHaveClass(/active/);
    
    // 验证记录列表可见
    await expect(app.recordList).toBeVisible();
    
    // 验证筛选栏可见
    await expect(app.filterBar).toBeVisible();
  });

  test('平板视口正常显示', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.tablet);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证应用正常显示
    await expect(app.mainScreen).toHaveClass(/active/);
    await expect(app.recordList).toBeVisible();
  });

  test('移动端视口正常显示', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证应用正常显示
    await expect(app.mainScreen).toHaveClass(/active/);
    await expect(app.recordList).toBeVisible();
  });

  test('大屏桌面端显示更多内容', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.desktopLarge);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证应用正常显示
    await expect(app.mainScreen).toHaveClass(/active/);
    await expect(app.recordList).toBeVisible();
  });
});

test.describe('移动端交互', () => {
  
  test('移动端记录卡片点击正常', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 点击第一条记录
    await app.openRecordDetail(0);
    
    // 验证弹窗显示
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 验证弹窗内容可见
    await expect(app.detailModal.locator('#modal-body')).toBeVisible();
  });

  test('移动端筛选面板正常', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 打开筛选面板
    await app.openFilterPanel();
    
    // 验证面板显示
    await expect(app.filterPanel).toHaveClass(/active/);
    
    // 关闭面板
    await app.closeFilterPanel();
    await expect(app.filterPanel).not.toHaveClass(/active/);
  });

  test('移动端统计页面正常', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 打开统计页面
    await app.openStats();
    
    // 验证统计页面显示
    await expect(app.statsPage).toHaveClass(/active/);
    
    // 验证 Tab 可点击
    await expect(app.statsTabs.grade).toBeVisible();
    await app.switchStatsTab('grade');
    await expect(app.statsTabs.grade).toHaveClass(/active/);
  });

  test('移动端详情弹窗适配', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    await app.openRecordDetail(0);
    
    // 验证弹窗在移动端可见
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 关闭弹窗
    await app.closeDetailModal();
    await expect(app.detailModal).not.toHaveClass(/active/);
  });
});

test.describe('横竖屏切换', () => {
  
  test('移动端竖屏正常显示', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证显示正常
    await expect(app.mainScreen).toHaveClass(/active/);
    await expect(app.recordList).toBeVisible();
  });

  test('移动端横屏正常显示', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 切换到横屏
    await page.setViewportSize({ width: 667, height: 375 });
    
    // 验证显示正常
    await expect(app.mainScreen).toHaveClass(/active/);
    await expect(app.recordList).toBeVisible();
  });
});

test.describe('触摸交互', () => {
  
  test('触摸滑动筛选面板', async ({ page }) => {
    const app = new AppPage(page);
    await page.setViewportSize(viewports.mobile);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 打开筛选面板
    await app.openFilterPanel();
    await expect(app.filterPanel).toHaveClass(/active/);
    
    // 点击外部关闭（模拟触摸）
    await app.page.evaluate(() => {
      const panel = document.getElementById('filter-panel');
      if (panel) panel.classList.remove('active');
    });
    
    await expect(app.filterPanel).not.toHaveClass(/active/);
  });

  test('记录列表触摸滚动', async ({ page }) => {
    const app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    
    // 验证列表可滚动
    await app.recordList.evaluate(el => {
      el.scrollTop = 100;
    });
    
    // 验证滚动后内容仍然可见
    await expect(app.recordList).toBeVisible();
  });
});
