# Kilterboard 数据同步工具

自动抓取和同步 Kilterboard 攀岩数据到本地 SQLite 数据库。

## 功能特性

- 🔐 自动登录获取认证令牌
- 📊 **增量同步** - 只同步新增/更新的数据，支持断点续传
- 📈 同步线路统计数据（climb_stats）
- ✅ 同步完攀记录（ascents）
- 🔄 同步尝试记录（bids）
- 💾 本地 SQLite 存储，支持离线分析
- 📱 支持全量同步（35万+条线路）

## 项目结构

```
.
├── API_SPEC.md           # API 规范文档
├── DATABASE_SCHEMA.md    # 数据库 Schema 设计
├── kilter_sync.py        # 核心同步模块
└── rest/                 # API 示例数据
    ├── kilter            # API 请求示例
    └── *.json            # API 响应示例
```

## 快速开始

### 要求

- Python 3.7+
- 仅使用 Python 标准库，无需额外依赖

### 首次全量同步

首次同步会下载所有数据（约 35万+ 条线路，可能需要 10-30 分钟）：

```bash
python kilter_sync.py -u YOUR_USERNAME -p YOUR_PASSWORD
```

### 增量同步

后续同步只会下载新增或更新的数据（通常几秒钟完成）：

```bash
# 使用相同命令，自动检测增量数据
python kilter_sync.py -u YOUR_USERNAME -p YOUR_PASSWORD

# 或使用环境变量
export KILTER_USERNAME=your_username
export KILTER_PASSWORD=your_password
python kilter_sync.py
```

### 交互式输入

```bash
python kilter_sync.py
# 然后根据提示输入用户名和密码
```

## 增量同步原理

工具使用 `sync_state` 表记录每个资源的最后同步时间：

| 资源 | 说明 |
|------|------|
| `climbs` | 线路信息 |
| `climb_stats` | 线路统计数据 |
| `ascents` | 你的完攀记录 |
| `bids` | 你的尝试记录 |

每次同步时：
1. 查询上次同步时间
2. 只请求该时间之后更新的数据
3. 更新同步时间戳

### 强制全量同步

如果需要重新同步所有数据，删除数据库即可：

```bash
# Windows
del kilter.db

# Linux/Mac
rm kilter.db

# 然后重新运行同步
python kilter_sync.py -u USERNAME -p PASSWORD
```

## 数据库说明

数据存储在 SQLite 数据库 `kilter.db` 中：

| 表名 | 说明 | 记录数（参考） |
|------|------|---------------|
| `climbs` | 线路信息（名称、角度、岩点布局等） | ~355,000 |
| `climb_stats` | 线路统计（完攀人数、平均难度/质量等） | ~363,000 |
| `ascents` | 完攀记录（你成功完成的线路） | ~400+ |
| `bids` | 尝试记录（你尝试但未完成的线路） | ~200+ |
| `sync_state` | 同步状态（记录上次同步时间） | 4 |

### 常用查询示例

```sql
-- 查询 2026 年的完攀记录
SELECT * FROM ascents 
WHERE climbed_at >= '2026-01-01' AND climbed_at < '2027-01-01'
ORDER BY climbed_at DESC;

-- 查询最常尝试的线路
SELECT c.name, SUM(b.bid_count) as total_attempts
FROM bids b
JOIN climbs c ON b.climb_uuid = c.uuid
GROUP BY b.climb_uuid
ORDER BY total_attempts DESC
LIMIT 10;

-- 查询平均难度分布（基于数据分析的 V-grade 映射）
SELECT 
    CASE 
        WHEN difficulty < 16 THEN 'V0-V2'
        WHEN difficulty < 17.5 THEN 'V3'
        WHEN difficulty < 19.5 THEN 'V4'
        WHEN difficulty < 21.5 THEN 'V5'
        WHEN difficulty < 22.5 THEN 'V6'
        WHEN difficulty < 23.5 THEN 'V7'
        WHEN difficulty < 25 THEN 'V8'
        ELSE 'V9+'
    END as grade_range,
    COUNT(*) as count
FROM ascents
GROUP BY grade_range;

-- 查询你的攀爬统计（按年份）
SELECT 
    strftime('%Y', climbed_at) as year,
    COUNT(*) as ascents,
    AVG(difficulty) as avg_difficulty
FROM ascents
WHERE climbed_at IS NOT NULL
GROUP BY year
ORDER BY year DESC;
```

## API 文档

详细的 API 规范请参考 [API_SPEC.md](API_SPEC.md)。

### 主要 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/sessions` | POST | 登录获取 token |
| `/sync` | POST | 增量同步数据 |
| `/climbs/{uuid}/info` | GET | 获取线路详情 |
| `/climbs/{uuid}/logbook` | GET | 获取用户在该线路的记录 |

## Difficulty 数值与 V-grade 对照表

基于 **Gumby Soup** 线路数据分析（对比不同角度的 `difficulty_average` 与 App 显示的 V-grade）：

| difficulty 范围 | V-grade | 示例角度 |
|----------------|---------|----------|
| < 16 | V0-V2 | 10° (~16.7) |
| 16 - 17.5 | V3 | 15° (17.0) |
| 17.5 - 19.5 | V4 | 20-30° (~18.2) |
| 19.5 - 21.5 | V5 | 35-55° (~20-21) |
| 21.5 - 22.5 | V6 | 50° (22.1) |
| 22.5 - 23.5 | V7 | 60° (23.0) |
| 23.5 - 25 | V8 | 70° (~24) |
| >= 25 | V9+ | - |

**参考数据**（Gumby Soup 线路统计）：
```
角度 | difficulty | V-grade
-----|-----------|---------
10°  | 16.67     | V2
15°  | 17.00     | V3
20°  | 18.17     | V4
30°  | 18.33     | V4
40°  | 20.89     | V5
50°  | 22.08     | V6
60°  | 23.00     | V7
70°  | ~24       | V8
```

## 数据字段说明

### climbs（线路）
- `uuid`: 线路唯一标识
- `name`: 线路名称
- `angle`: 角度（0-70度）
- `frames`: 岩点布局编码
- `setter_username`: 定线员用户名

### climb_stats（线路统计）
- `climb_uuid`: 线路UUID
- `angle`: 角度
- `ascensionist_count`: 完攀人数
- `difficulty_average`: 平均难度
- `quality_average`: 平均质量（1-3）

### ascents（完攀记录）
- `uuid`: 记录唯一标识
- `climb_uuid`: 线路UUID
- `difficulty`: 用户评定的难度
- `quality`: 用户评定的质量
- `bid_count`: 完成前的尝试次数
- `climbed_at`: 攀爬时间

### bids（尝试记录）
- `uuid`: 记录唯一标识
- `climb_uuid`: 线路UUID
- `bid_count`: 尝试次数
- `climbed_at`: 最后尝试时间

## 注意事项

1. **隐私**: 本工具仅供个人备份和分析使用，请勿分享他人数据
2. **频率限制**: API 可能有频率限制，请勿过于频繁地同步
3. **首次同步**: 首次同步可能需要较长时间（10-30分钟），请耐心等待
4. **增量同步**: 日常同步通常只需几秒钟

## License

MIT License
