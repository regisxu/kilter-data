/**
 * Filter Bar Popover E2E Tests
 *
 * 测试场景：
 * 1. Time popover 选择预设时间
 * 2. Time popover Custom 自定义日期
 * 3. Type popover 切换类型
 * 4. Angle popover 选择角度
 * 5. Grade popover 调整难度
 * 6. Name inline 搜索
 * 7. 点击外部关闭 popover
 * 8. Filter 按钮仍打开完整 panel
 */

const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

test.describe('Filter Bar Popover - Time', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('从 Time popover 选择 All', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);
    await app.selectTimeFromPopover('all');
    await expect(app.timePopover).not.toHaveClass(/active/);

    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('All');
    const count = await app.getRecordCount();
    expect(count).toBe(11);
  });

  test('从 Time popover 选择 7d', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);
    await app.selectTimeFromPopover('7');
    await expect(app.timePopover).not.toHaveClass(/active/);

    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('7d');
  });

  test('从 Time popover 选择 30d', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);
    await app.selectTimeFromPopover('30');
    await expect(app.timePopover).not.toHaveClass(/active/);

    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('30d');
  });

  test('从 Time popover 选择 Custom 日期范围', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);

    // 选择 Custom，popover 保持打开
    await app.page.locator('#time-popover button[data-value="custom"]').click();
    await expect(app.timePopover).toHaveClass(/active/);

    // 设置日期范围
    await app.page.locator('#popover-date-start').fill('2024-01-01');
    await app.page.locator('#popover-date-end').fill('2024-12-31');
    await app.page.waitForTimeout(300);

    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('01-01-12-31');

    // 关闭 popover
    await app.page.click('body', { position: { x: 10, y: 300 } });
    await expect(app.timePopover).not.toHaveClass(/active/);
  });
});

test.describe('Filter Bar Popover - Type', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('从 Type popover 选择 Sent', async () => {
    await app.typeFilterBarItem.click();
    await expect(app.typePopover).toHaveClass(/active/);
    await app.selectTypeFromPopover('ascent');
    await expect(app.typePopover).not.toHaveClass(/active/);

    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('Sent');
    const count = await app.getRecordCount();
    expect(count).toBe(8);
  });

  test('从 Type popover 选择 Attempts', async () => {
    await app.typeFilterBarItem.click();
    await expect(app.typePopover).toHaveClass(/active/);
    await app.selectTypeFromPopover('bid');
    await expect(app.typePopover).not.toHaveClass(/active/);

    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('Attempts');
    const count = await app.getRecordCount();
    expect(count).toBe(3);
  });

  test('从 Type popover 选择 All', async () => {
    await app.typeFilterBarItem.click();
    await expect(app.typePopover).toHaveClass(/active/);
    await app.selectTypeFromPopover('all');
    await expect(app.typePopover).not.toHaveClass(/active/);

    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('All');
    const count = await app.getRecordCount();
    expect(count).toBe(11);
  });
});

test.describe('Filter Bar Popover - Angle', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('从 Angle popover 选择 30°', async () => {
    await app.angleFilterBarItem.click();
    await expect(app.anglePopover).toHaveClass(/active/);

    // 先取消所有角度（同时同步 panel 和 popover）
    await app.page.evaluate(() => {
      document.querySelectorAll('.angles input[type="checkbox"], .angles-popover input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
    await app.toggleAngleInPopover('30');

    const angleText = await app.page.locator('#filter-bar-angle').textContent();
    expect(angleText).toBe('30°');
  });

  test('从 Angle popover 选择多个连续角度显示范围', async () => {
    await app.angleFilterBarItem.click();
    await expect(app.anglePopover).toHaveClass(/active/);

    await app.page.evaluate(() => {
      document.querySelectorAll('.angles input[type="checkbox"], .angles-popover input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
    await app.toggleAngleInPopover('15');
    await app.toggleAngleInPopover('20');
    await app.toggleAngleInPopover('25');
    await app.toggleAngleInPopover('30');

    await app.page.click('body', { position: { x: 10, y: 300 } });
    await expect(app.anglePopover).not.toHaveClass(/active/);

    const angleText = await app.page.locator('#filter-bar-angle').textContent();
    expect(angleText).toBe('15°-30°');
  });
});

test.describe('Filter Bar Popover - Grade', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('从 Grade popover 调整最小难度', async () => {
    await app.gradeFilterBarItem.click();
    await expect(app.gradePopover).toHaveClass(/active/);

    await app.page.locator('#grade-popover-min').fill('16');
    await app.page.locator('#grade-popover-min').dispatchEvent('input');
    await app.page.waitForTimeout(300);

    const diffText = await app.page.locator('#filter-bar-diff').textContent();
    expect(diffText).not.toBe('All');

    await app.page.click('body', { position: { x: 10, y: 300 } });
    await expect(app.gradePopover).not.toHaveClass(/active/);
  });
});

test.describe('Filter Bar Popover - Name', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('从 Name filter bar 内联搜索', async () => {
    await app.searchNameInline('Slab');

    const nameText = await app.page.locator('#filter-bar-name').textContent();
    expect(nameText).toBe('Slab');

    const count = await app.getRecordCount();
    expect(count).toBeGreaterThan(0);

    const firstCard = app.recordList.locator('.record-card').first();
    const climbName = await firstCard.locator('.climb-name').textContent();
    expect(climbName.toLowerCase()).toContain('slab');
  });

  test('从 Name filter bar 搜索不存在的线路', async () => {
    await app.searchNameInline('NonExistentRoute');

    const count = await app.getRecordCount();
    expect(count).toBe(0);
  });
});

test.describe('Filter Bar Popover - 通用交互', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('点击外部关闭 popover', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);

    await app.page.click('body', { position: { x: 10, y: 300 } });
    await expect(app.timePopover).not.toHaveClass(/active/);
  });

  test('点击另一个 filter bar item 切换 popover', async () => {
    await app.timeFilterBarItem.click();
    await expect(app.timePopover).toHaveClass(/active/);
    await expect(app.typePopover).not.toHaveClass(/active/);

    await app.typeFilterBarItem.click();
    await expect(app.timePopover).not.toHaveClass(/active/);
    await expect(app.typePopover).toHaveClass(/active/);
  });

  test('Filter 按钮仍打开完整 panel', async () => {
    await app.filterButton.click();
    await expect(app.filterPanel).toHaveClass(/active/);
  });
});
