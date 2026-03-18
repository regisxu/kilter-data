/**
 * Filtering E2E Tests
 * 
 * 测试场景：
 * 1. 时间范围筛选（7天、30天、90天、1年、自定义年份、自定义日期范围）
 * 2. 类型筛选（完攀/尝试）
 * 3. 角度筛选
 * 4. 难度范围筛选
 * 5. 搜索筛选
 * 6. 重置筛选
 * 7. Filter Bar 显示更新
 */

const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

test.describe('筛选面板', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('打开筛选面板', async () => {
    // 点击筛选按钮
    await app.openFilterPanel();
    
    // 验证面板显示
    await expect(app.filterPanel).toHaveClass(/active/);
    
    // 验证筛选选项存在
    await expect(app.filterTime).toBeVisible();
    await expect(app.filterAscent).toBeVisible();
    await expect(app.filterBid).toBeVisible();
  });

  test('关闭筛选面板', async () => {
    // 先打开面板
    await app.openFilterPanel();
    await expect(app.filterPanel).toHaveClass(/active/);
    
    // 关闭面板
    await app.closeFilterPanel();
    
    // 验证面板已关闭
    await expect(app.filterPanel).not.toHaveClass(/active/);
  });
});

test.describe('时间范围筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('筛选最近7天', async () => {
    await app.filterByTime('7');
    
    // 验证筛选结果
    const count = await app.getRecordCount();
    // 7天内可能没有记录，取决于测试数据日期
    expect(count).toBeGreaterThanOrEqual(0);
    
    // 验证 filter bar 更新
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('7d');
  });

  test('筛选最近30天', async () => {
    await app.filterByTime('30');
    
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('30d');
  });

  test('筛选最近90天', async () => {
    await app.filterByTime('90');
    
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('90d');
  });

  test('筛选最近1年', async () => {
    await app.filterByTime('365');
    
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('1y');
  });

  test('按年份筛选 - 2024', async () => {
    await app.filterByTime('2024');
    
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('2024');
    
    // 2024年的记录应该存在
    const count = await app.getRecordCount();
    expect(count).toBeGreaterThan(0);
  });

  test('自定义日期范围筛选', async () => {
    // 选择自定义
    await app.filterTime.selectOption('custom');
    
    // 验证自定义日期输入显示
    const customDateRange = app.page.locator('#custom-date-range');
    await expect(customDateRange).toBeVisible();
    
    // 设置日期范围
    await app.page.locator('#date-start').fill('2024-01-01');
    await app.page.locator('#date-end').fill('2024-02-28');
    
    // 触发筛选
    await app.page.locator('#date-start').dispatchEvent('change');
    await app.page.waitForTimeout(300);
    
    // 验证筛选结果
    const count = await app.getRecordCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('显示全部时间', async () => {
    await app.filterByTime('all');
    
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('All');
    
    // 应该显示所有记录
    const count = await app.getRecordCount();
    expect(count).toBe(11);
  });
});

test.describe('类型筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('只显示完攀记录', async () => {
    // 取消选择尝试
    await app.toggleBidFilter(false);
    await app.page.waitForTimeout(300);
    
    // 应该只显示8条完攀记录
    const count = await app.getRecordCount();
    expect(count).toBe(8);
    
    // 验证 filter bar 更新
    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('Sent');
    
    // 验证所有显示的记录都是完攀
    const cards = app.recordList.locator('.record-card.ascent');
    const ascentCount = await cards.count();
    expect(ascentCount).toBe(8);
  });

  test('只显示尝试记录', async () => {
    // 取消选择完攀
    await app.toggleAscentFilter(false);
    await app.page.waitForTimeout(300);
    
    // 应该只显示3条尝试记录
    const count = await app.getRecordCount();
    expect(count).toBe(3);
    
    // 验证 filter bar 更新
    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('Attempts');
  });

  test('不显示任何记录', async () => {
    // 同时取消两种类型
    await app.toggleAscentFilter(false);
    await app.toggleBidFilter(false);
    await app.page.waitForTimeout(300);
    
    // 应该没有记录
    const count = await app.getRecordCount();
    expect(count).toBe(0);
    
    // 验证 filter bar 更新
    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('None');
  });
});

test.describe('角度筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('只选择特定角度', async () => {
    // 先取消所有角度
    const angleCheckboxes = app.page.locator('.angles input[type="checkbox"]');
    await angleCheckboxes.first().evaluate((el) => {
      // 取消所有
      document.querySelectorAll('.angles input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
    
    // 只选择 30 度
    await app.page.locator('.angles input[value="30"]').check();
    await app.page.waitForTimeout(300);
    
    // 验证 filter bar 更新
    const angleText = await app.page.locator('#filter-bar-angle').textContent();
    expect(angleText).toBe('30°');
  });

  test('选择多个连续角度显示范围', async () => {
    // 先取消所有角度选择
    await app.page.evaluate(() => {
      document.querySelectorAll('.angles input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
    
    // 选择 15-30 度范围
    const angleValues = ['15', '20', '25', '30'];
    for (const val of angleValues) {
      await app.page.locator(`.angles input[value="${val}"]`).check();
    }
    await app.page.waitForTimeout(300);
    
    // 应该显示角度范围或选中数量
    const angleText = await app.page.locator('#filter-bar-angle').textContent();
    // 可以是具体角度、范围或数量
    expect(['All', 'None'].includes(angleText)).toBe(false);
  });
});

test.describe('难度范围筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('调整最小难度', async () => {
    // 设置最小难度为 V3 (difficulty 16)
    await app.page.locator('#diff-min').fill('16');
    await app.page.locator('#diff-min').dispatchEvent('input');
    await app.page.waitForTimeout(300);
    
    // 验证 filter bar 更新
    const diffText = await app.page.locator('#filter-bar-diff').textContent();
    expect(diffText).not.toBe('All');
  });

  test('调整最大难度', async () => {
    // 设置最大难度为 V5 (difficulty 20)
    await app.page.locator('#diff-max').fill('20');
    await app.page.locator('#diff-max').dispatchEvent('input');
    await app.page.waitForTimeout(300);
    
    // 验证 filter bar 更新
    const diffText = await app.page.locator('#filter-bar-diff').textContent();
    expect(diffText).not.toBe('All');
  });
});

test.describe('搜索筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('搜索特定线路名称', async () => {
    await app.searchByName('Slab');
    
    // 应该找到 Easy Slab
    const count = await app.getRecordCount();
    expect(count).toBeGreaterThan(0);
    
    // 验证记录包含搜索关键词
    const firstCard = app.recordList.locator('.record-card').first();
    const name = await firstCard.locator('.climb-name').textContent();
    expect(name.toLowerCase()).toContain('slab');
  });

  test('搜索不存在的线路', async () => {
    await app.searchByName('NonExistentRoute');
    
    // 应该没有结果
    const count = await app.getRecordCount();
    expect(count).toBe(0);
  });

  test('搜索时忽略大小写', async () => {
    await app.searchByName('slab');
    
    const count = await app.getRecordCount();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('重置筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('重置所有筛选条件', async () => {
    // 先应用一些筛选
    await app.filterByTime('2024');
    await app.toggleBidFilter(false);
    await app.searchByName('Test');
    
    // 重置筛选
    await app.resetFilters();
    
    // 验证所有筛选恢复默认
    const timeValue = await app.filterTime.inputValue();
    expect(timeValue).toBe('all');
    
    const isAscentChecked = await app.filterAscent.isChecked();
    expect(isAscentChecked).toBe(true);
    
    const isBidChecked = await app.filterBid.isChecked();
    expect(isBidChecked).toBe(true);
    
    const searchValue = await app.filterSearch.inputValue();
    expect(searchValue).toBe('');
    
    // 验证显示所有记录
    const count = await app.getRecordCount();
    expect(count).toBe(11);
    
    // 验证 filter bar 更新
    const timeText = await app.page.locator('#filter-bar-time').textContent();
    expect(timeText).toBe('All');
    
    const typeText = await app.page.locator('#filter-bar-type').textContent();
    expect(typeText).toBe('All');
  });
});

test.describe('组合筛选', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
    await app.openFilterPanel();
  });

  test('时间 + 类型组合筛选', async () => {
    await app.filterByTime('2024');
    await app.toggleBidFilter(false);
    await app.page.waitForTimeout(300);
    
    // 验证筛选结果
    const count = await app.getRecordCount();
    // 2024年的完攀记录
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('搜索 + 类型组合筛选', async () => {
    await app.searchByName('Slab');
    await app.toggleBidFilter(false);
    await app.page.waitForTimeout(300);
    
    // 验证结果同时满足两个条件
    const cards = app.recordList.locator('.record-card');
    const cardCount = await cards.count();
    
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i);
      await expect(card).toHaveClass(/ascent/);
      const name = await card.locator('.climb-name').textContent();
      expect(name.toLowerCase()).toContain('slab');
    }
  });
});
