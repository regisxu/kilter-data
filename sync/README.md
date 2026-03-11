# Kilterboard 数据同步工具

该目录包含 Kilterboard 数据同步相关的脚本和文档。

## 文件说明

| 文件 | 说明 |
|------|------|
| `kilter_sync.py` | 主同步脚本，支持增量同步攀岩记录到本地 SQLite 数据库 |
| `API_SPEC.md` | Kilterboard API 规范文档 |
| `DATABASE_SCHEMA.md` | 数据库结构说明 |

## 快速开始

### 1. 配置环境

```powershell
# 设置环境变量
$env:KILTER_USERNAME="your_username"
$env:KILTER_PASSWORD="your_password"
```

### 2. 执行同步

```bash
# 同步所有数据
python kilter_sync.py --env

# 同步指定年份
python kilter_sync.py --env --year 2025

# 指定用户名密码
python kilter_sync.py -u username -p password
```

## 数据库输出

默认输出为 `kilter.db`（SQLite 格式），包含以下表：

- `ascents` - 完攀记录
- `bids` - 尝试记录
- `climbs` - 线路信息
- `climb_stats` - 线路统计
- `users` - 用户信息
- `circuits` - 线路集合

详见 `DATABASE_SCHEMA.md`。

## 注意事项

- 首次同步可能需要较长时间（取决于记录数量）
- 后续同步会自动增量更新，只传输新数据
- 建议定期同步以保持数据最新
