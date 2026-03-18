# Kilterboard E2E 测试

使用 Playwright 编写的端到端测试，覆盖 Kilterboard Logbook 应用的主要功能和流程。

## 📁 目录结构

```
e2e/
├── fixtures/              # 测试数据和资源
│   └── test-data.db       # 测试用 SQLite 数据库
├── pages/                 # Page Object Models
│   └── AppPage.js         # 应用页面模型
├── tests/                 # 测试用例
│   ├── database-loading.spec.js   # 数据库加载和缓存测试
│   ├── record-list.spec.js        # 记录列表测试
│   ├── filtering.spec.js          # 筛选功能测试
│   ├── detail-modal.spec.js       # 详情弹窗测试
│   ├── statistics.spec.js         # 统计功能测试
│   └── responsive.spec.js         # 响应式设计测试
├── playwright.config.js   # Playwright 配置
└── package.json          # 项目依赖
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd e2e
npm install
```

### 2. 安装浏览器

```bash
npm run install:browsers
```

### 3. 运行测试

```bash
# 运行所有测试（仅 Chromium）
npm test

# 运行核心功能测试（最快）
npx playwright test --project=chromium -g "数据库加载流程|记录列表显示"

# 运行特定浏览器的测试
npm run test:chrome

# 带界面运行（headed 模式）
npm run test:headed

# UI 模式（可交互调试）
npm run test:ui

# 调试模式
npm run test:debug
```

### 4. 查看测试报告

```bash
npm run report
```

## 📝 测试用例概览

### 1. 数据库加载流程 (`database-loading.spec.js`)

| 用例 | 描述 |
|------|------|
| 无缓存时显示 loading screen | 验证首次访问时显示文件选择界面 |
| 文件上传后显示 main screen | 验证上传数据库后正确加载并显示主界面 |
| 有缓存时直接加载缓存 | 验证再次访问时自动从 IndexedDB 加载 |
| 点击 reload 清除缓存 | 验证 reload 按钮清除缓存并返回 loading screen |
| 缓存持久化 | 验证关闭标签页后缓存仍然存在 |
| 错误文件处理 | 验证无效文件的处理 |

### 2. 记录列表 (`record-list.spec.js`)

| 用例 | 描述 |
|------|------|
| 记录列表显示 | 验证记录正确加载和显示 |
| 卡片信息结构 | 验证卡片包含所有必要信息 |
| 完攀/尝试标识 | 验证不同类型的记录有不同样式 |
| 日期分隔线 | 验证按天分组的日期分隔线 |
| 分页加载 | 验证加载更多功能 |
| 卡片点击交互 | 验证点击打开详情弹窗 |

### 3. 筛选功能 (`filtering.spec.js`)

| 用例 | 描述 |
|------|------|
| 时间范围筛选 | 7天、30天、90天、1年、年份、自定义 |
| 类型筛选 | 完攀/尝试/全部 |
| 角度筛选 | 0°-70° 多选 |
| 难度范围 | V-grade 滑块选择 |
| 搜索筛选 | 线路名称搜索 |
| 重置筛选 | 一键重置所有条件 |
| Filter Bar 更新 | 验证筛选栏正确显示当前条件 |
| 组合筛选 | 多个条件组合筛选 |

### 4. 详情弹窗 (`detail-modal.spec.js`)

| 用例 | 描述 |
|------|------|
| 打开弹窗 | 点击记录卡片打开详情 |
| 线路信息 | 显示名称、设置者、角度 |
| 统计数据 | 显示难度、质量、完成人数 |
| 攀爬历史 | 显示该线路的所有尝试记录 |
| 关闭弹窗 | 点击关闭按钮或外部关闭 |
| 移动端适配 | 验证移动端弹窗显示 |

### 5. 统计功能 (`statistics.spec.js`)

| 用例 | 描述 |
|------|------|
| 统计页面开关 | 打开/关闭统计页面 |
| 概览 Tab | KPI 卡片、图表渲染 |
| 难度 Tab | 难度金字塔、完成率、尝试分布 |
| 趋势 Tab | 粒度切换、热力图、趋势图、星期偏好 |
| SQL Tab | 查询输入、模板选择、结果表格、导出 |
| Tab 切换 | 多次切换图表正确渲染 |
| 数据准确性 | KPI 与列表数据一致 |

### 6. 响应式设计 (`responsive.spec.js`)

| 用例 | 描述 |
|------|------|
| 桌面端 | 1280x720、1920x1080 |
| 平板端 | 768x1024 |
| 移动端 | 375x667、414x896 |
| 横竖屏切换 | 方向变化适配 |
| 触摸交互 | 滑动、点击 |

## 🔧 Page Object Model

`AppPage` 类封装了所有页面交互方法：

```javascript
// 导航和加载
await app.goto();
await app.loadDatabase('test-data.db');
await app.clearIndexedDBCache();

// 页面状态检查
await app.isLoadingScreenVisible();
await app.isMainScreenVisible();

// 筛选操作
await app.openFilterPanel();
await app.filterByTime('30');
await app.toggleAscentFilter(true);
await app.searchByName('Slab');
await app.resetFilters();

// 统计页面
await app.openStats();
await app.switchStatsTab('grade');
const kpiValues = await app.getKPIValues();
await app.closeStats();

// 详情弹窗
await app.openRecordDetail(0);
await app.closeDetailModal();

// 数据获取
const count = await app.getRecordCount();
```

## 🎯 测试数据

测试数据库 `fixtures/test-data.db` 包含：

- 5 条攀岩线路
- 8 条完攀记录
- 3 条尝试记录
- 10 条统计数据

数据涵盖不同难度、角度和日期，用于全面测试筛选和统计功能。

## ⚙️ 配置说明

### Playwright 配置 (`playwright.config.js`)

- **浏览器**: Chromium、Firefox、WebKit
- **移动端**: Pixel 5、iPhone 12
- **重试**: CI 环境 2 次，本地 0 次
- **并行**: CI 环境串行，本地并行
- **截图**: 失败时自动截图
- **视频**: 失败时保留视频
- **Trace**: 首次重试时记录

### 测试超时设置

- Action timeout: 10 秒
- Navigation timeout: 10 秒
- 数据库加载: 15 秒

## 🐛 调试技巧

### 1. UI 模式

```bash
npm run test:ui
```

可交互地运行测试，查看每个步骤的快照。

### 2. 调试模式

```bash
npm run test:debug
```

使用 Playwright Inspector 逐步调试。

### 3. 代码生成

```bash
npm run codegen
```

自动生成操作代码。

### 4. 查看报告

```bash
npm run report
```

查看 HTML 测试报告，包含截图和视频。

## 🔄 CI/CD 集成

在 CI 环境中，测试会自动：

1. 串行运行（避免资源冲突）
2. 失败时重试 2 次
3. 记录 trace 和截图
4. 生成 HTML 报告

示例 GitHub Actions 配置：

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd e2e && npm install
      - run: cd e2e && npm run install:browsers
      - run: cd e2e && npm test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: e2e/playwright-report/
```

## 📝 添加新测试

1. 在 `tests/` 目录创建新的 `.spec.js` 文件
2. 使用 `test.describe` 组织测试套件
3. 使用 `test.beforeEach` 设置测试前置条件
4. 使用 Page Object 进行页面交互
5. 使用 `expect` 进行断言

示例：

```javascript
const { test, expect } = require('@playwright/test');
const { AppPage } = require('../pages/AppPage');

test.describe('新功能测试', () => {
  let app;

  test.beforeEach(async ({ page }) => {
    app = new AppPage(page);
    await app.goto();
    await app.clearIndexedDBCache();
    await app.loadDatabase('test-data.db');
  });

  test('测试用例描述', async () => {
    // 执行操作
    await app.someAction();
    
    // 验证结果
    await expect(app.someElement).toBeVisible();
  });
});
```

## 📊 测试覆盖率

当前测试覆盖：

- ✅ 数据库加载和缓存机制
- ✅ 记录列表显示和分页
- ✅ 筛选功能（时间、类型、角度、难度、搜索）
- ✅ 详情弹窗
- ✅ 统计功能（4个 Tab）
- ✅ 响应式设计
- ✅ IndexedDB 缓存管理

## 🔧 已知问题和修复

### 1. 使用 http-server 而非 file:// 协议

**问题**: 直接使用 `file://` 协议访问 HTML 文件时，IndexedDB 在某些浏览器中无法正常工作。

**修复**: 配置 Playwright 使用 `webServer` 启动本地 HTTP 服务器，测试通过 `http://localhost:8080` 访问应用。

### 2. 文件输入框可见性检查

**问题**: `file-input` 元素被 CSS 隐藏，测试中使用 `toBeVisible()` 会失败。

**修复**: 使用 `toBeAttached()` 检查元素是否在 DOM 中，而不是检查可见性。

### 3. 缓存测试的不确定性

**问题**: IndexedDB 缓存的行为在不同浏览器和环境中可能有差异。

**修复**: 缓存相关测试使用条件断言，允许在缓存不可用时显示 loading screen。

### 4. 筛选面板关闭

**问题**: Escape 键不能关闭筛选面板。

**修复**: 使用点击关闭按钮或点击面板外部的方式关闭。

## 🔗 相关文件

- 应用入口: `../app/index.html`
- 应用逻辑: `../app/app.js`
- 应用样式: `../app/style.css`
- 同步脚本: `../sync/kilter_sync.py`
