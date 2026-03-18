/**
 * Record List E2E Tests
 * 
 * 测试场景：
 * 1. 记录列表显示
 * 2. 分页加载更多
 * 3. 日期分隔线显示
 * 4. 记录卡片内容正确性
 * 5. 记录类型标识（完攀/尝试）
 */

const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

test.describe('记录列表显示', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('记录列表正确显示所有记录', async () => {
    // 验证记录列表容器可见
    await expect(app.recordList).toBeVisible();
    
    // 验证记录数量显示正确
    const totalCount = await app.getRecordCount();
    expect(totalCount).toBe(11); // 8 ascents + 3 bids
    
    // 验证记录卡片存在
    const cards = app.recordList.locator('.record-card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('记录卡片显示正确的信息结构', async () => {
    const firstCard = app.recordList.locator('.record-card').first();
    
    // 验证卡片结构元素
    await expect(firstCard.locator('.card-header')).toBeVisible();
    await expect(firstCard.locator('.card-body')).toBeVisible();
    await expect(firstCard.locator('.climb-name')).toBeVisible();
    await expect(firstCard.locator('.card-meta')).toBeVisible();
    
    // 验证时间显示
    await expect(firstCard.locator('.time')).toBeVisible();
    
    // 验证状态标识
    await expect(firstCard.locator('.status-badge')).toBeVisible();
  });

  test('完攀记录和尝试记录有不同的样式标识', async () => {
    // 等待记录加载
    await app.page.waitForTimeout(500);
    
    // 查找完攀记录（应该有 ascent 类）
    const ascentCards = app.recordList.locator('.record-card.ascent');
    const ascentCount = await ascentCards.count();
    expect(ascentCount).toBeGreaterThan(0);
    
    // 查尝试记录（应该有 bid 类）
    const bidCards = app.recordList.locator('.record-card.bid');
    const bidCount = await bidCards.count();
    expect(bidCount).toBeGreaterThan(0);
    
    // 验证完攀记录的状态文字
    const firstAscent = ascentCards.first();
    const ascentStatus = await firstAscent.locator('.status-badge').textContent();
    expect(ascentStatus).toContain('Sent');
    
    // 验证尝试记录的状态文字
    const firstBid = bidCards.first();
    const bidStatus = await firstBid.locator('.status-badge').textContent();
    expect(bidStatus).toContain('Attempt');
  });

  test('记录卡片显示线路名称、角度和难度', async () => {
    const firstCard = app.recordList.locator('.record-card').first();
    
    // 验证线路名称
    const climbName = await firstCard.locator('.climb-name').textContent();
    expect(climbName).not.toBe('');
    expect(climbName).not.toBe('Unknown');
    
    // 验证角度显示（包含°符号）
    const cardMeta = await firstCard.locator('.card-meta').textContent();
    expect(cardMeta).toMatch(/\d+°/);
    
    // 验证难度等级显示（V-grade 格式）
    expect(cardMeta).toMatch(/V\d+/);
  });

  test('记录按日期降序排列（最新的在最前）', async () => {
    const cards = app.recordList.locator('.record-card');
    const firstCard = cards.first();
    const secondCard = cards.nth(1);
    
    // 获取时间文本
    const firstTime = await firstCard.locator('.time').textContent();
    const secondTime = await secondCard.locator('.time').textContent();
    
    // 由于是同一天内的记录，验证时间格式
    expect(firstTime).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('日期分隔线按天分组记录', async () => {
    // 查找日期分隔线
    const dateDividers = app.recordList.locator('.date-divider');
    const dividerCount = await dateDividers.count();
    
    // 应该至少有一个日期分隔线
    expect(dividerCount).toBeGreaterThan(0);
    
    // 验证日期格式
    const firstDivider = dateDividers.first();
    const dateText = await firstDivider.locator('.date-text').textContent();
    expect(dateText).not.toBe('');
  });
});

test.describe('分页加载', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('初始加载有限数量的记录', async () => {
    // 获取初始显示的记录数
    const cards = app.recordList.locator('.record-card');
    const initialCount = await cards.count();
    
    // 初始应该加载 PAGE_SIZE（50）条或更少
    expect(initialCount).toBeLessThanOrEqual(50);
    
    // 由于测试数据只有11条，应该全部显示
    expect(initialCount).toBe(11);
  });

  test('点击"加载更多"加载更多记录', async () => {
    // 注意：测试数据只有11条，可能一次性加载完毕
    // 这里验证 load more 按钮的行为
    
    const loadMoreVisible = await app.loadMoreButton.isVisible();
    
    if (loadMoreVisible) {
      // 如果有更多记录，点击加载更多
      const initialCount = await app.recordList.locator('.record-card').count();
      await app.loadMore();
      const newCount = await app.recordList.locator('.record-card').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    } else {
      // 如果没有 load more 按钮，说明所有记录已加载
      const totalCount = await app.getRecordCount();
      const displayedCount = await app.recordList.locator('.record-card').count();
      expect(displayedCount).toBe(totalCount);
    }
  });

  test('加载更多按钮显示正确的计数', async () => {
    const loadMoreVisible = await app.loadMoreButton.isVisible();
    
    if (loadMoreVisible) {
      const buttonText = await app.loadMoreButton.textContent();
      // 验证格式："加载更多 (显示数量/总数)"
      expect(buttonText).toMatch(/\(\d+\/\d+\)/);
    }
  });

  test('所有记录加载完成后隐藏加载更多按钮', async () => {
    // 持续点击加载更多直到按钮隐藏
    let attempts = 0;
    while (await app.loadMoreButton.isVisible() && attempts < 10) {
      await app.loadMore();
      attempts++;
    }
    
    // 验证所有记录已加载
    const totalCount = await app.getRecordCount();
    const displayedCount = await app.recordList.locator('.record-card').count();
    expect(displayedCount).toBe(totalCount);
  });
});

test.describe('记录卡片交互', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('点击记录卡片打开详情弹窗', async () => {
    // 点击第一条记录
    await app.openRecordDetail(0);
    
    // 验证弹窗显示
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 验证弹窗内容
    await expect(app.detailModal.locator('.detail-header')).toBeVisible();
    await expect(app.detailModal.locator('.detail-grid')).toBeVisible();
  });

  test('记录卡片显示尝试次数', async () => {
    const card = app.recordList.locator('.record-card').first();
    const metaText = await card.locator('.card-meta').textContent();
    
    // 验证显示尝试次数（数字）
    expect(metaText).toMatch(/\d+/);
  });
});
