# Kilterboard Data

本项目用于同步、存储和分析 Kilterboard 攀岩训练数据。

## 项目结构

```
├── app/              # 攀岩记录查看和统计分析工具（前端应用）
├── sync/             # 数据同步脚本和 API 文档
├── kilter.db         # 本地 SQLite 数据库（同步后生成）
└── .gitignore        # Git 忽略配置
```

| 目录 | 说明 |
|------|------|
| [`app/`](app/) | 基于浏览器的攀岩记录查看器，支持统计分析和 SQL 查询 |
| [`sync/`](sync/) | Python 同步脚本和 API 文档 |

## 快速开始

### 1. 数据同步

```bash
cd sync
python kilter_sync.py -u <用户名> -p <密码>
```

同步完成后在项目根目录生成 `kilter.db` 文件。

详见 [sync/README.md](sync/)

### 2. 查看记录

双击 `app/index.html` 在浏览器中打开，选择同步好的数据库文件即可。

详见 [app/README.md](app/)

## 功能亮点

- **🔄 增量同步** - 只传输新数据，节省时间和流量
- **📊 统计分析** - 难度金字塔、趋势分析、热力图
- **🔍 SQL 探索** - 自定义查询和可视化
- **📱 移动友好** - 响应式设计，支持手机浏览器

## 流程示意

```
Kilterboard API 
       ↓
[sync/kilter_sync.py] 同步数据
       ↓
   kilter.db (SQLite)
       ↓
[app/index.html] 查看和分析
```

## 开发技术

- **后端**: Python 3.11+
- **前端**: 原生 HTML5 + ECharts + sql.js
- **数据库**: SQLite 3

## License

MIT
