# Kilterboard 数据同步工具

自动抓取和同步 Kilterboard 攀岩数据到本地 SQLite 数据库。

## 功能特性

- 🔐 自动登录获取认证令牌
- 📊 增量同步线路数据（climbs）
- 📈 同步线路统计数据（climb_stats）
- ✅ 同步完攀记录（ascents）
- 🔄 同步尝试记录（bids）
- 💾 本地 SQLite 存储，支持离线分析
- 📅 支持按年份筛选数据

## 项目结构

```
.
├── API_SPEC.md           # API 规范文档
├── DATABASE_SCHEMA.md    # 数据库 Schema 设计
├── kilter_sync.py        # 核心同步模块
├── fetch_2026.py         # 2026 年数据抓取脚本
├── requirements.md       # 项目需求文档
└── rest/                 # API 示例数据
    ├── kilter            # API 请求示例
    ├── *.json            # API 响应示例
```

## 快速开始

### 1. 安装依赖

本项目仅使用 Python 标准库，无需额外安装依赖。

要求: Python 3.7+

### 2. 抓取 2026 年数据

```bash
python fetch_2026.py --username YOUR_USERNAME --password YOUR_PASSWORD
```

或使用环境变量：

```bash
export KILTER_USERNAME=your_username
export KILTER_PASSWORD=your_password
python fetch_2026.py
```

### 3. 通用同步工具

```bash
# 同步所有数据
python kilter_sync.py -u YOUR_USERNAME -p YOUR_PASSWORD

# 指定数据库路径
python kilter_sync.py -u USERNAME -p PASSWORD -d my_data.db

# 交互式输入凭据
python kilter_sync.py
```

## 数据库说明

数据存储在 SQLite 数据库中，主要包含以下表：

| 表名 | 说明 |
|------|------|
| `climbs` | 线路信息（名称、角度、岩点布局等） |
| `climb_stats` | 线路统计（完攀人数、平均难度/质量等） |
| `ascents` | 完攀记录（用户成功完成的线路） |
| `bids` | 尝试记录（用户尝试但未完成的线路） |
| `sync_state` | 同步状态（记录上次同步时间） |

### 查询示例

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

-- 查询平均难度分布
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

## API 文档

详细的 API 规范请参考 [API_SPEC.md](API_SPEC.md)。

### 主要 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/sessions` | POST | 登录获取 token |
| `/sync` | POST | 增量同步数据 |
| `/climbs/{uuid}/info` | GET | 获取线路详情 |
| `/climbs/{uuid}/logbook` | GET | 获取用户在该线路的记录 |

## 数据库 Schema

详细的数据库设计请参考 [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)。

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

## 开发计划

- [x] 分析 Kilterboard API 并生成 Spec 文档
- [x] 设计数据库 Schema
- [x] 实现基础同步功能
- [x] 实现 2026 年数据抓取
- [ ] 添加数据可视化功能
- [ ] 支持增量备份
- [ ] 添加数据导出功能（CSV/Excel）

## 注意事项

1. **隐私**: 本工具仅供个人备份和分析使用，请勿分享他人数据
2. **频率限制**: API 可能有频率限制，请勿过于频繁地同步
3. **数据完整性**: 首次同步可能需要较长时间，请耐心等待

## License

MIT License
