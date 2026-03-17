# Kilterboard 数据库 Schema 设计

## 1. 概述

使用 SQLite 数据库存储 Kilterboard 数据，便于本地分析和查询。

## 2. 表结构设计

### 2.1 climbs - 线路信息表

存储所有攀岩线路的基本信息。

```sql
CREATE TABLE climbs (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    angle INTEGER,
    description TEXT,
    edge_bottom INTEGER,
    edge_left INTEGER,
    edge_right INTEGER,
    edge_top INTEGER,
    frames TEXT,           -- 岩点布局编码
    frames_count INTEGER,
    frames_pace INTEGER,
    hsm INTEGER,
    is_draft BOOLEAN DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_nomatch BOOLEAN DEFAULT 0,
    layout_id INTEGER,
    setter_id INTEGER,
    setter_username TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE INDEX idx_climbs_setter ON climbs(setter_id);
CREATE INDEX idx_climbs_layout ON climbs(layout_id);
CREATE INDEX idx_climbs_updated ON climbs(updated_at);
```

### 2.2 climb_stats - 线路统计表

存储线路的统计数据，包括难度评分、质量评分等。

```sql
CREATE TABLE climb_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    climb_uuid TEXT NOT NULL,
    angle INTEGER NOT NULL,
    ascensionist_count INTEGER DEFAULT 0,
    difficulty_average REAL,
    quality_average REAL,
    benchmark_difficulty INTEGER,
    fa_uid INTEGER,
    fa_username TEXT,
    fa_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE(climb_uuid, angle),
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

CREATE INDEX idx_stats_climb ON climb_stats(climb_uuid);
CREATE INDEX idx_stats_fa ON climb_stats(fa_uid);
```

### 2.3 ascents - 完攀记录表

存储用户成功完成的攀岩记录。

```sql
CREATE TABLE ascents (
    uuid TEXT PRIMARY KEY,
    climb_uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    angle INTEGER,
    attempt_id INTEGER DEFAULT 0,
    bid_count INTEGER DEFAULT 0,      -- 完成前的尝试次数
    difficulty INTEGER,               -- 用户评定的难度
    quality INTEGER,                  -- 用户评定的质量 1-3
    is_benchmark BOOLEAN DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_mirror BOOLEAN DEFAULT 0,
    comment TEXT,
    climbed_at DATETIME,              -- 实际攀爬时间
    created_at DATETIME,              -- 记录创建时间
    updated_at DATETIME,
    wall_uuid TEXT,
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

CREATE INDEX idx_ascents_user ON ascents(user_id);
CREATE INDEX idx_ascents_climb ON ascents(climb_uuid);
CREATE INDEX idx_ascents_climbed ON ascents(climbed_at);
CREATE INDEX idx_ascents_created ON ascents(created_at);
```

### 2.4 bids - 尝试记录表

存储用户尝试但未完成的攀岩记录。

```sql
CREATE TABLE bids (
    uuid TEXT PRIMARY KEY,
    climb_uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    angle INTEGER,
    bid_count INTEGER DEFAULT 0,      -- 尝试次数
    is_listed BOOLEAN DEFAULT 1,
    is_mirror BOOLEAN DEFAULT 0,
    comment TEXT,
    climbed_at DATETIME,              -- 最后尝试时间
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

CREATE INDEX idx_bids_user ON bids(user_id);
CREATE INDEX idx_bids_climb ON bids(climb_uuid);
CREATE INDEX idx_bids_climbed ON bids(climbed_at);
```

### 2.5 users - 用户信息表

存储用户基本信息（可选，主要用于缓存用户信息）。

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    name TEXT,
    email_address TEXT,
    avatar_image TEXT,
    is_public BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    instagram_username TEXT,
    created_at DATETIME,
    updated_at DATETIME
);
```

### 2.6 circuits - 线路集合表

存储用户的线路集合（如 "TODO", "Project" 等）。

```sql
CREATE TABLE circuits (
    uuid TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    count INTEGER DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_public BOOLEAN DEFAULT 0,
    description TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE INDEX idx_circuits_user ON circuits(user_id);
```

### 2.7 sync_state - 同步状态表

记录各资源的最后同步时间，用于增量同步。

```sql
CREATE TABLE sync_state (
    resource_name TEXT PRIMARY KEY,
    last_sync_at DATETIME NOT NULL,
    sync_count INTEGER DEFAULT 0
);
```

## 3. 视图设计

### 3.1 用户攀爬统计视图

```sql
CREATE VIEW user_climb_summary AS
SELECT 
    a.climb_uuid,
    c.name as climb_name,
    c.setter_username,
    a.angle,
    a.difficulty,
    a.quality,
    a.bid_count,
    a.climbed_at,
    a.comment,
    cs.difficulty_average,
    cs.quality_average,
    cs.ascensionist_count
FROM ascents a
JOIN climbs c ON a.climb_uuid = c.uuid
LEFT JOIN climb_stats cs ON a.climb_uuid = cs.climb_uuid AND a.angle = cs.angle;
```

### 3.2 尝试但未完成的线路视图

```sql
CREATE VIEW user_bids_summary AS
SELECT 
    b.climb_uuid,
    c.name as climb_name,
    c.setter_username,
    b.angle,
    b.bid_count,
    b.climbed_at,
    b.comment,
    cs.difficulty_average,
    cs.quality_average
FROM bids b
JOIN climbs c ON b.climb_uuid = c.uuid
LEFT JOIN climb_stats cs ON b.climb_uuid = cs.climb_uuid AND b.angle = cs.angle;
```

## 4. 数据关系图

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   users     │       │     climbs      │       │   circuits  │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │       │ uuid (PK)       │       │ uuid (PK)   │
│ username    │       │ name            │       │ user_id(FK) │
│ ...         │       │ setter_id(FK)   │       │ name        │
└─────────────┘       │ ...             │       │ ...         │
       │              └────────┬────────┘       └─────────────┘
       │                       │
       │              ┌────────┴────────┐
       │              │                 │
       │       ┌──────┴──────┐   ┌──────┴──────┐
       │       │climb_stats  │   │   ascents   │   ┌─────────┐
       │       ├─────────────┤   ├─────────────┤   │  bids   │
       │       │ id (PK)     │   │ uuid (PK)   │   ├─────────┤
       │       │climb_uuid   │   │climb_uuid   │   │uuid(PK) │
       └──────►│  (FK)       │   │  (FK)       │   │climb_uuid
               │ angle       │   │ user_id(FK) │   │ (FK)    │
               │ ...         │   │ ...         │   │ ...     │
               └─────────────┘   └─────────────┘   └─────────┘
```

## 5. 索引策略

1. **主键索引**: 所有表的主键自动创建索引
2. **外键索引**: 在 climb_uuid、user_id 等外键上创建索引，加速 JOIN 操作
3. **时间索引**: 在 climbed_at、created_at、updated_at 上创建索引，加速时间范围查询
4. **复合索引**: climb_stats 表在 (climb_uuid, angle) 上创建唯一索引

## 6. 数据类型说明

| SQLite 类型 | 说明 | 示例 |
|-------------|------|------|
| TEXT | 字符串 | UUID、用户名、描述 |
| INTEGER | 整数 | ID、计数、角度、难度 |
| REAL | 浮点数 | 平均评分 |
| DATETIME | 日期时间 | 时间戳 |
| BOOLEAN | 布尔值 | 0/1 |

## 7. 难度等级对照表

数据库中 `difficulty` 字段为整数，表示 Fontainebleau 等级（法国难度系统）。以下为 difficulty 值与 Fontainebleau / V-grade 的对照表：

| difficulty | Fontainebleau | V-grade |
|------------|---------------|---------|
| ≤ 10 | 4a | V0 |
| 11 | 4b | V0 |
| 12 | 4c | V0 |
| 13 | 5a | V1 |
| 14 | 5b | V1 |
| 15 | 5c | V2 |
| 16 | 6a | V3 |
| 17 | 6a+ | V3 |
| 18 | 6b | V4 |
| 19 | 6b+ | V4 |
| 20 | 6c | V5 |
| 21 | 6c+ | V5 |
| 22 | 7a | V6 |
| 23 | 7a+ | V7 |
| 24 | 7b | V8 |
| 25 | 7b+ | V8 |
| 26 | 7c | V9 |
| 27 | 7c+ | V10 |
| 28 | 8a | V11 |
| 29 | 8a+ | V12 |
| 30 | 8b | V13 |
| 31 | 8b+ | V14 |
| 32 | 8c | V15 |
| ≥ 33 | 8c+ | V16+ |

**使用说明：**
- difficulty 值在显示前会先四舍五入到最接近的整数
- 此对照表用于 `ascents` 表的 `difficulty` 字段和 `climb_stats` 表的 `difficulty_average` 字段
- 例如：difficulty=16 表示 6a/V3 难度的线路

## 8. 完整建表脚本

```sql
-- 启用外键支持
PRAGMA foreign_keys = ON;

-- 1. 创建 climbs 表
CREATE TABLE IF NOT EXISTS climbs (
    uuid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    angle INTEGER,
    description TEXT,
    edge_bottom INTEGER,
    edge_left INTEGER,
    edge_right INTEGER,
    edge_top INTEGER,
    frames TEXT,
    frames_count INTEGER,
    frames_pace INTEGER,
    hsm INTEGER,
    is_draft BOOLEAN DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_nomatch BOOLEAN DEFAULT 0,
    layout_id INTEGER,
    setter_id INTEGER,
    setter_username TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

-- 2. 创建 climb_stats 表
CREATE TABLE IF NOT EXISTS climb_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    climb_uuid TEXT NOT NULL,
    angle INTEGER NOT NULL,
    ascensionist_count INTEGER DEFAULT 0,
    difficulty_average REAL,
    quality_average REAL,
    benchmark_difficulty INTEGER,
    fa_uid INTEGER,
    fa_username TEXT,
    fa_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE(climb_uuid, angle),
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

-- 3. 创建 ascents 表
CREATE TABLE IF NOT EXISTS ascents (
    uuid TEXT PRIMARY KEY,
    climb_uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    angle INTEGER,
    attempt_id INTEGER DEFAULT 0,
    bid_count INTEGER DEFAULT 0,
    difficulty INTEGER,
    quality INTEGER,
    is_benchmark BOOLEAN DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_mirror BOOLEAN DEFAULT 0,
    comment TEXT,
    climbed_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    wall_uuid TEXT,
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

-- 4. 创建 bids 表
CREATE TABLE IF NOT EXISTS bids (
    uuid TEXT PRIMARY KEY,
    climb_uuid TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    angle INTEGER,
    bid_count INTEGER DEFAULT 0,
    is_listed BOOLEAN DEFAULT 1,
    is_mirror BOOLEAN DEFAULT 0,
    comment TEXT,
    climbed_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (climb_uuid) REFERENCES climbs(uuid)
);

-- 5. 创建 sync_state 表
CREATE TABLE IF NOT EXISTS sync_state (
    resource_name TEXT PRIMARY KEY,
    last_sync_at DATETIME NOT NULL,
    sync_count INTEGER DEFAULT 0
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_climbs_updated ON climbs(updated_at);
CREATE INDEX IF NOT EXISTS idx_stats_climb ON climb_stats(climb_uuid);
CREATE INDEX IF NOT EXISTS idx_ascents_climb ON ascents(climb_uuid);
CREATE INDEX IF NOT EXISTS idx_ascents_climbed ON ascents(climbed_at);
CREATE INDEX IF NOT EXISTS idx_bids_climb ON bids(climb_uuid);
CREATE INDEX IF NOT EXISTS idx_bids_climbed ON bids(climbed_at);
```

## 9. 使用示例

### 查询某年完成的线路
```sql
SELECT * FROM ascents 
WHERE climbed_at >= '2026-01-01' AND climbed_at < '2027-01-01'
ORDER BY climbed_at DESC;
```

### 查询最常尝试的线路
```sql
SELECT c.name, SUM(b.bid_count) as total_attempts
FROM bids b
JOIN climbs c ON b.climb_uuid = c.uuid
GROUP BY b.climb_uuid
ORDER BY total_attempts DESC
LIMIT 10;
```

### 查询平均难度分布
```sql
SELECT 
    CASE 
        WHEN difficulty < 10 THEN 'V0-V2'
        WHEN difficulty < 15 THEN 'V3-V4'
        WHEN difficulty < 20 THEN 'V5-V6'
        WHEN difficulty < 25 THEN 'V7-V8'
        ELSE 'V9+'
    END as grade_range,
    COUNT(*) as count
FROM ascents
GROUP BY grade_range;
```
