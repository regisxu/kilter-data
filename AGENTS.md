# Kilterboard Data - Agent Guide

本文件为 AI 编程助手提供项目背景、技术栈、开发规范和操作指南。

## 项目概述

**Kilterboard Data** 是一个用于同步、存储和分析 Kilterboard 攀岩训练数据的项目。

### 核心功能
- **数据同步**: 从 Kilterboard API 抓取攀岩记录到本地 SQLite 数据库
- **记录查看**: 基于 Web 的攀岩记录浏览器，支持列表展示和详情查看
- **统计分析**: 难度金字塔、趋势分析、活动热力图、SQL 探索
- **响应式设计**: 支持桌面端和移动端浏览器

### 数据流程
```
Kilterboard API 
       ↓
[sync/kilter_sync.py] 增量同步
       ↓
   kilter.db (SQLite)
       ↓
[app/index.html] 浏览器中查看和分析
```

## 项目结构

```
├── app/                  # 前端应用 (纯 HTML/CSS/JS)
│   ├── index.html        # 主页面入口
│   ├── app.js            # 业务逻辑 (~57KB)
│   ├── style.css         # 样式表 (~33KB)
│   ├── README.md         # 前端说明文档
│   └── tests/            # 前端测试套件
│
├── sync/                 # 数据同步脚本 (Python)
│   ├── kilter_sync.py    # 主同步脚本
│   ├── API_SPEC.md       # API 规范文档
│   ├── DATABASE_SCHEMA.md # 数据库 Schema 说明
│   └── README.md         # 同步工具说明
│
├── e2e/                  # E2E 测试 (Playwright)
│   ├── tests/            # 测试用例
│   ├── pages/            # Page Object Models
│   ├── fixtures/         # 测试数据
│   ├── playwright.config.js
│   └── package.json
│
├── rest/                 # API 响应示例 (JSON 文件)
├── kilter.db             # 本地 SQLite 数据库 (自动生成)
└── README.md             # 项目主文档
```

## 技术栈

### 后端/数据同步
- **Python**: 3.11+
- **标准库**: `urllib`, `sqlite3`, `json`, `datetime`
- **无第三方依赖**: 仅使用 Python 标准库

### 前端
- **原生技术**: HTML5 + CSS3 + JavaScript (无框架)
- **数据库引擎**: [sql.js](https://github.com/sql-js/sql.js) (WebAssembly SQLite)
- **图表库**: [ECharts 5.4.3](https://echarts.apache.org/) (CDN)
- **本地存储**: IndexedDB (缓存数据库文件)

### 测试
- **E2E 测试**: Playwright (@playwright/test ^1.40.0)
- **HTTP 服务器**: http-server (^14.1.1) 用于测试
- **测试浏览器**: Chromium (主要), Firefox, WebKit 支持

### 数据库
- **SQLite 3**: 本地数据存储
- **主要表**: climbs, ascents, bids, climb_stats, users, circuits, sync_state

## 常用命令

### 数据同步

```bash
# 进入同步目录
cd sync

# 使用环境变量登录
$env:KILTER_USERNAME="your_username"
$env:KILTER_PASSWORD="your_password"
python kilter_sync.py --env

# 直接指定用户名密码
python kilter_sync.py -u <用户名> -p <密码>

# 同步指定年份
python kilter_sync.py --env --year 2025
```

### 运行前端

```bash
# 方法1: 直接打开 (开发)
start app/index.html

# 方法2: 使用 HTTP 服务器 (推荐用于测试)
npx http-server app -p 8080
```

### E2E 测试

```bash
cd e2e

# 安装依赖
npm install

# 安装浏览器
npm run install:browsers

# 运行所有测试
npm test

# 运行特定浏览器测试
npm run test:chrome

# UI 模式 (交互式调试)
npm run test:ui

# 查看测试报告
npm run report
```

### 前端测试 (Node.js 方式)

```bash
cd app/tests
npm install
npm test
```

## 开发规范

### 代码风格
- **前端**: 原生 JavaScript, ES6+ 语法
- **Python**: 使用类型注解 (typing)
- **中文注释**: 项目主要使用中文注释和文档

### 文件命名
- JavaScript: 驼峰式 (e.g., `app.js`, `testFramework.js`)
- CSS: 小写 (e.g., `style.css`)
- Python: 下划线分隔 (e.g., `kilter_sync.py`)
- 测试文件: `*.spec.js` (Playwright)

### 数据库 Schema 约定

**核心表**:
- `climbs`: 线路信息 (uuid, name, angle, setter_username, ...)
- `ascents`: 完攀记录 (climb_uuid, user_id, angle, difficulty, climbed_at, ...)
- `bids`: 尝试记录 (climb_uuid, bid_count, ...)
- `climb_stats`: 线路统计 (ascensionist_count, difficulty_average, quality_average, ...)
- `sync_state`: 同步状态 (resource_name, last_sync_at)

**难度等级**: 使用 Fontainebleau 数值 (10=V0, 20=V5, 24=V8 等)

### API 调用

**Kilterboard API**:
- 基础 URL: `https://kilterboardapp.com`
- 认证: Cookie-based token
- 同步端点: `POST /sync` (增量同步)

## 测试策略

### E2E 测试覆盖

| 测试文件 | 覆盖功能 |
|---------|---------|
| `database-loading.spec.js` | 数据库加载、IndexedDB 缓存 |
| `record-list.spec.js` | 记录列表显示、分页、卡片交互 |
| `filtering.spec.js` | 时间/类型/角度/难度筛选、搜索 |
| `detail-modal.spec.js` | 详情弹窗、线路信息、攀爬历史 |
| `statistics.spec.js` | 统计页面、4个 Tab、SQL 探索 |
| `responsive.spec.js` | 响应式布局、多分辨率适配 |

### 测试数据
- 测试数据库: `e2e/fixtures/test-data.db`
- 包含: 5条线路, 8条完攀, 3条尝试记录
- Playwright 使用 Page Object 模式 (`AppPage` 类)

### 测试配置要点
- 使用 HTTP 服务器 (非 file:// 协议) 避免 IndexedDB 限制
- CI 环境串行运行，本地可并行
- 失败时自动截图和录制视频

## 架构说明

### 前端架构

**单页应用 (SPA) 结构**:
- Loading Screen: 文件选择和数据库加载
- Main Screen: 记录列表和筛选面板
- Stats Page: 统计分析页面 (4个 Tab)
- Detail Modal: 线路详情弹窗

**核心模块**:
- 数据库初始化 (sql.js)
- IndexedDB 缓存管理
- 数据查询和筛选逻辑
- ECharts 图表渲染
- 响应式布局处理

### 同步架构

**增量同步机制**:
1. 读取 `sync_state` 表获取上次同步时间
2. 调用 `/sync` API 获取增量数据
3. 更新本地数据库
4. 记录新的同步时间

**资源类型**: climbs, climb_stats, ascents, bids, users, circuits

## 安全注意事项

1. **凭证管理**: 
   - 使用环境变量传递密码 (`KILTER_USERNAME`, `KILTER_PASSWORD`)
   - 不要将凭证硬编码到脚本中

2. **数据隐私**:
   - `kilter.db` 已添加到 `.gitignore`
   - 数据库文件包含个人攀岩数据，不要提交到 Git

3. **API Token**:
   - Token 存储在内存中，不持久化
   - Token 过期后需要重新登录

## 常见问题

### IndexedDB 缓存问题
- 清除缓存: 点击应用中的 🔄 按钮
- 测试时: 调用 `app.clearIndexedDBCache()`

### 数据库加载失败
- 确保使用 HTTP 服务器而非 file:// 协议
- 检查 SQL.js CDN 可访问性

### 同步失败
- 检查用户名密码
- 检查网络连接
- 检查 API 服务状态

## 外部依赖

**CDN 资源** (app/index.html):
- sql-wasm.js: `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js`
- echarts.min.js: `https://cdnjs.cloudflare.com/ajax/libs/echarts/5.4.3/echarts.min.js`

**开发依赖**:
- Node.js 18+ (仅用于测试)
- Python 3.11+ (用于数据同步)

## License

MIT
