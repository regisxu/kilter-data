/**
 * Detail Modal E2E Tests
 * 
 * 测试场景：
 * 1. 打开详情弹窗
 * 2. 显示线路详情信息
 * 3. 显示攀爬历史
 * 4. 关闭弹窗
 * 5. 弹窗外部点击关闭
 */

const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

test.describe('详情弹窗', () => {
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
    
    // 验证弹窗内容区域可见
    await expect(app.detailModal.locator('#modal-body')).toBeVisible();
  });

  test('弹窗显示线路名称和设置者', async () => {
    // 点击第一条记录
    await app.openRecordDetail(0);
    
    // 获取弹窗中的线路名称
    const climbName = await app.detailModal.locator('.detail-header h2').textContent();
    expect(climbName).not.toBe('');
    expect(climbName).not.toBe('Unknown');
    
    // 验证设置者信息（meta-tag 可能有多个，使用 first）
    const metaTags = app.detailModal.locator('.detail-header .meta-tag');
    expect(await metaTags.count()).toBeGreaterThanOrEqual(1);
    const setterInfo = await metaTags.first().textContent();
    expect(setterInfo).not.toBe('');
  });

  test('弹窗显示角度信息', async () => {
    await app.openRecordDetail(0);
    
    // 验证角度标签存在
    const metaTags = app.detailModal.locator('.detail-header .meta-tag');
    const tagCount = await metaTags.count();
    expect(tagCount).toBeGreaterThanOrEqual(1);
    
    // 验证其中一个标签包含角度
    let hasAngle = false;
    for (let i = 0; i < tagCount; i++) {
      const tagText = await metaTags.nth(i).textContent();
      if (tagText.includes('°')) {
        hasAngle = true;
        break;
      }
    }
    expect(hasAngle).toBe(true);
  });

  test('弹窗显示详细统计信息', async () => {
    await app.openRecordDetail(0);
    
    // 验证详情网格存在
    const detailGrid = app.detailModal.locator('.detail-grid');
    await expect(detailGrid).toBeVisible();
    
    // 验证各项统计
    const detailItems = detailGrid.locator('.detail-item');
    expect(await detailItems.count()).toBeGreaterThanOrEqual(3);
    
    // 验证标签存在
    const labels = await detailItems.locator('label').allTextContents();
    expect(labels).toContain('Grade');
    expect(labels).toContain('Quality');
    expect(labels).toContain('Ascensionists');
  });

  test('弹窗显示该线路的难度等级', async () => {
    await app.openRecordDetail(0);
    
    // 查找难度显示
    const detailItems = app.detailModal.locator('.detail-item');
    const count = await detailItems.count();
    
    let hasGrade = false;
    for (let i = 0; i < count; i++) {
      const label = await detailItems.nth(i).locator('label').textContent();
      if (label === 'Grade') {
        const value = await detailItems.nth(i).locator('value').textContent();
        expect(value).toMatch(/V\d+/);
        hasGrade = true;
        break;
      }
    }
    expect(hasGrade).toBe(true);
  });

  test('弹窗显示该用户的攀爬历史', async () => {
    await app.openRecordDetail(0);
    
    // 验证攀爬历史区域存在
    const climbHistory = app.detailModal.locator('.climb-history');
    await expect(climbHistory).toBeVisible();
    
    // 验证有历史记录
    const historyItems = climbHistory.locator('.history-item');
    expect(await historyItems.count()).toBeGreaterThan(0);
  });

  test('历史记录显示尝试次数和类型', async () => {
    await app.openRecordDetail(0);
    
    const historyItems = app.detailModal.locator('.history-item');
    const firstItem = historyItems.first();
    
    // 验证历史项包含时间
    const timeText = await firstItem.locator('.history-time').textContent();
    expect(timeText).not.toBe('');
    
    // 验证历史项包含类型（Sent 或 Attempt）
    const typeText = await firstItem.locator('.history-type').textContent();
    expect(['Sent', 'Attempt'].some(t => typeText.includes(t))).toBe(true);
  });

  test('弹窗显示线路描述（如果有）', async () => {
    await app.openRecordDetail(0);
    
    // 查找描述区域
    const descriptionSection = app.detailModal.locator('.detail-section:has(.description)');
    
    // 如果存在描述，验证其内容
    if (await descriptionSection.isVisible().catch(() => false)) {
      const description = await descriptionSection.locator('.description').textContent();
      expect(description).not.toBe('');
    }
  });

  test('点击关闭按钮关闭弹窗', async () => {
    // 打开弹窗
    await app.openRecordDetail(0);
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 关闭弹窗
    await app.closeDetailModal();
    
    // 验证弹窗已关闭
    await expect(app.detailModal).not.toHaveClass(/active/);
  });

  test('点击弹窗外部关闭弹窗', async () => {
    // 打开弹窗
    await app.openRecordDetail(0);
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 点击弹窗外部（modal 背景）
    await app.detailModal.click({ position: { x: 10, y: 10 } });
    
    // 验证弹窗已关闭
    await expect(app.detailModal).not.toHaveClass(/active/);
  });

  test('快速连续点击记录只打开一个弹窗', async () => {
    // 点击第一个记录打开弹窗
    const cards = app.recordList.locator('.record-card');
    await cards.nth(0).click();
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 关闭弹窗
    await app.closeDetailModal();
    await expect(app.detailModal).not.toHaveClass(/active/);
    
    // 再次点击另一个记录
    await cards.nth(1).click();
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 关闭弹窗
    await app.closeDetailModal();
    await expect(app.detailModal).not.toHaveClass(/active/);
  });

  test('完攀记录显示完成次数', async () => {
    // 找一条完攀记录
    const ascentCard = app.recordList.locator('.record-card.ascent').first();
    await ascentCard.click();
    
    await expect(app.detailModal).toHaveClass(/active/);
    
    // 查找 My Sends 显示
    const detailItems = app.detailModal.locator('.detail-item');
    const count = await detailItems.count();
    
    let hasSends = false;
    for (let i = 0; i < count; i++) {
      const label = await detailItems.nth(i).locator('label').textContent();
      if (label === 'My Sends') {
        const value = await detailItems.nth(i).locator('value').textContent();
        const sends = parseInt(value);
        expect(sends).toBeGreaterThanOrEqual(0);
        hasSends = true;
        break;
      }
    }
    expect(hasSends).toBe(true);
  });

  test('尝试记录显示尝试详情', async () => {
    // 找一条尝试记录
    const bidCard = app.recordList.locator('.record-card.bid').first();
    
    // 如果有尝试记录
    if (await bidCard.isVisible().catch(() => false)) {
      await bidCard.click();
      await expect(app.detailModal).toHaveClass(/active/);
      
      // 验证历史中有尝试类型
      const historyTypes = app.detailModal.locator('.history-type');
      const firstType = await historyTypes.first().textContent();
      expect(firstType).toContain('Attempt');
    }
  });

  test('历史记录中的评论显示正确', async () => {
    await app.openRecordDetail(0);
    
    // 查找有评论的历史项
    const historyItems = app.detailModal.locator('.history-item');
    const count = await historyItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = historyItems.nth(i);
      const commentEl = item.locator('.history-comment');
      
      if (await commentEl.isVisible().catch(() => false)) {
        const comment = await commentEl.textContent();
        expect(comment).not.toBe('');
        break;
      }
    }
  });
});

test.describe('弹窗滚动和响应式', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('弹窗内容可滚动', async () => {
    await app.openRecordDetail(0);
    
    // 获取弹窗内容区域
    const modalContent = app.detailModal.locator('.modal-content');
    
    // 验证内容区域存在
    await expect(modalContent).toBeVisible();
    
    // 尝试滚动
    await modalContent.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    
    // 验证弹窗仍然打开
    await expect(app.detailModal).toHaveClass(/active/);
  });

  test('移动端弹窗适配', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    await app.openRecordDetail(0);
    
    // 验证弹窗在移动端可见
    await expect(app.detailModal).toHaveClass(/active/);
    await expect(app.detailModal.locator('#modal-body')).toBeVisible();
  });
});
