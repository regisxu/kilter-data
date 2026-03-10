# Kilterboard API 规范文档

## 1. 概述

Kilterboard API 是一个 RESTful API，用于获取攀岩线路、用户攀爬记录等数据。

- **基础 URL**: `https://kilterboardapp.com`
- **认证方式**: Cookie 中的 `token`
- **数据格式**: JSON

## 2. 认证相关

### 2.1 登录 - POST /sessions

**请求**:
```http
POST /sessions
Content-Type: application/x-www-form-urlencoded

username={username}&password={password}&tou=accepted&pp=accepted&ua=app
```

**响应**:
```json
{
  "session": {
    "token": "a96778f97cb3ece15fd3c718c3fa5350666b243d",
    "user_id": 116255
  }
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| session.token | string | 会话令牌，用于后续请求的 Cookie |
| session.user_id | integer | 用户ID |

---

## 3. 增量同步 API

### 3.1 同步数据 - POST /sync

**请求**:
```http
POST /sync
Content-Type: application/x-www-form-urlencoded
Cookie: token={token}

{resource_name}={last_sync_time}&...
```

**参数说明**:
- 资源名称 + 上次同步时间（格式: `YYYY-MM-DD HH:MM:SS.microseconds`）
- 可用资源: `climbs`, `climb_stats`, `ascents`, `bids`, `users`, `circuits`, 等

**响应结构**:
```json
{
  "_complete": true|false,
  "{resource_name}": [...],
  "shared_syncs": [...],
  "user_syncs": [...]
}
```

**同步元数据**:
- `shared_syncs`: 公共资源同步状态
- `user_syncs`: 用户特定资源同步状态

---

## 4. 线路相关 API

### 4.1 获取线路列表（通过 Sync）

资源名称: `climbs`

**数据模型**:
```json
{
  "uuid": "A375A5D8AED848D0B485D442B36462F6",
  "name": "Korean Board Account",
  "angle": 40,
  "description": "Matching allowed on blue rows...",
  "edge_bottom": 48,
  "edge_left": 40,
  "edge_right": 104,
  "edge_top": 152,
  "frames": "p1162r13p1163r13...",
  "frames_count": 1,
  "frames_pace": 0,
  "hsm": 1,
  "is_draft": false,
  "is_listed": true,
  "is_nomatch": false,
  "layout_id": 1,
  "setter_id": 376476,
  "setter_username": "dlai27",
  "created_at": "2026-02-03 15:33:20.872710",
  "updated_at": "2026-02-06 03:46:03.449161"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| uuid | string | 线路唯一标识符 |
| name | string | 线路名称 |
| angle | integer | 角度（0-70度） |
| description | string | 线路描述/说明 |
| edge_bottom | integer | 底部边界坐标 |
| edge_left | integer | 左侧边界坐标 |
| edge_right | integer | 右侧边界坐标 |
| edge_top | integer | 顶部边界坐标 |
| frames | string | 岩点布局编码（格式: p{hole_id}r{role_id}...） |
| frames_count | integer | 帧数 |
| frames_pace | integer | 帧间隔 |
| hsm | integer | 手点/脚点配置 |
| is_draft | boolean | 是否为草稿 |
| is_listed | boolean | 是否公开列出 |
| is_nomatch | boolean | 是否禁止匹配 |
| layout_id | integer | 布局ID |
| setter_id | integer | 定线员ID |
| setter_username | string | 定线员用户名 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 4.2 获取线路统计 - POST /sync (climb_stats)

资源名称: `climb_stats`

**数据模型**:
```json
{
  "climb_uuid": "bf1d4cb441b84c698212bc068964c98f",
  "angle": 40,
  "ascensionist_count": 88,
  "difficulty_average": 21.2841,
  "quality_average": 2.78409,
  "benchmark_difficulty": 24,
  "fa_uid": 129199,
  "fa_username": "gunz914",
  "fa_at": "2023-06-10 08:35:38",
  "created_at": "2023-06-10 08:35:37.523847",
  "updated_at": "2026-03-06 08:23:41.530327"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| climb_uuid | string | 线路UUID |
| angle | integer | 角度 |
| ascensionist_count | integer | 完攀人数 |
| difficulty_average | float | 平均难度评分 |
| quality_average | float | 平均质量评分（1-3） |
| benchmark_difficulty | integer | 基准难度（可选） |
| fa_uid | integer | 首攀用户ID |
| fa_username | string | 首攀用户名 |
| fa_at | datetime | 首攀时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### 4.3 获取线路详细信息 - GET /climbs/{uuid}/info

**请求**:
```http
GET /climbs/{uuid}/info?angle=40&_version=2
Cookie: token={token}
```

**响应**:
```json
{
  "uuid": "22E8FFFCE67A40EEBF8A7AF5645A7F48",
  "name": "Grunt Style",
  "angle": null,
  "ascent_count": 9513,
  "description": "",
  "is_nomatch": false,
  "fa": {
    "created_at": "2019-02-23 00:33:27",
    "user": {
      "id": 2652,
      "username": "will_avelar",
      "name": "Will Avelar",
      "is_verified": true,
      "avatar_image": null
    }
  },
  "user": {
    "id": 3094,
    "username": "ThatClimbingPanda",
    "name": null,
    "is_verified": false,
    "avatar_image": null
  },
  "stats": {
    "difficulty": [
      {"difficulty": 24, "count": 8166},
      {"difficulty": 23, "count": 370}
    ],
    "quality": [
      {"quality": 3, "count": 8441},
      {"quality": 2, "count": 330}
    ]
  }
}
```

### 4.4 获取线路评论 - GET /climbs/{uuid}/notifications

**请求**:
```http
GET /climbs/{uuid}/notifications?climbs=1&ascents=1
Cookie: token={token}
```

**响应**:
```json
{
  "notifications": [
    {
      "_type": "ascent",
      "uuid": "7c5482abd9704185a6b3dff6f75724d9",
      "angle": 40,
      "attempt_id": 0,
      "quality": 3,
      "difficulty": 24,
      "difficulty_name": "7b/V8",
      "is_mirror": false,
      "comment": "Solide",
      "created_at": "2026-02-08 14:51:34",
      "climb": {
        "uuid": "22E8FFFCE67A40EEBF8A7AF5645A7F48",
        "name": "Grunt Style",
        "type": "boulder"
      },
      "user": {
        "id": 298348,
        "username": "weakfingerz",
        "name": "",
        "is_verified": false,
        "avatar_image": "avatars/298348-20260117002121.jpg"
      }
    }
  ]
}
```

### 4.5 获取线路 Logbook - GET /climbs/{uuid}/logbook

**请求**:
```http
GET /climbs/{uuid}/logbook?climbs=1&ascents=1&bids=1
Cookie: token={token}
```

**响应**: 同 notifications 结构，但只包含当前用户的记录

---

## 5. 用户攀爬记录 API

### 5.1 获取完攀记录 - POST /sync (ascents)

资源名称: `ascents`

**数据模型**:
```json
{
  "uuid": "7cc25675696b42bcab67f7438f433fbd",
  "climb_uuid": "708D4A4C5E454E559E48AC057BDCEC25",
  "user_id": 116255,
  "angle": 40,
  "attempt_id": 0,
  "bid_count": 6,
  "difficulty": 20,
  "quality": 3,
  "is_benchmark": false,
  "is_listed": true,
  "is_mirror": false,
  "comment": "",
  "climbed_at": "2026-02-09 11:18:54",
  "created_at": "2026-02-09 03:19:08.564338",
  "updated_at": "2026-02-09 03:19:08.564338",
  "wall_uuid": null
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| uuid | string | 记录唯一标识符 |
| climb_uuid | string | 线路UUID |
| user_id | integer | 用户ID |
| angle | integer | 攀爬角度 |
| attempt_id | integer | 尝试ID |
| bid_count | integer | 尝试次数 |
| difficulty | integer | 用户评定的难度 |
| quality | integer | 用户评定的质量（1-3） |
| is_benchmark | boolean | 是否为基准线 |
| is_listed | boolean | 是否公开 |
| is_mirror | boolean | 是否为镜像模式 |
| comment | string | 评论 |
| climbed_at | datetime | 攀爬时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| wall_uuid | string | 岩壁UUID（可选） |

### 5.2 获取尝试记录 - POST /sync (bids)

资源名称: `bids`

**数据模型**:
```json
{
  "uuid": "dd1c2d62e010411a9b11e02d9d8d9504",
  "climb_uuid": "956C1FDA1C3E4B4AA95B4D381F49AAA2",
  "user_id": 116255,
  "angle": 40,
  "bid_count": 4,
  "is_listed": true,
  "is_mirror": false,
  "comment": "",
  "climbed_at": "2026-02-28 12:27:48",
  "created_at": "2026-02-28 04:28:06.714873",
  "updated_at": "2026-02-28 04:28:06.714873"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| uuid | string | 记录唯一标识符 |
| climb_uuid | string | 线路UUID |
| user_id | integer | 用户ID |
| angle | integer | 攀爬角度 |
| bid_count | integer | 尝试次数 |
| is_listed | boolean | 是否公开 |
| is_mirror | boolean | 是否为镜像模式 |
| comment | string | 评论 |
| climbed_at | datetime | 攀爬时间 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

## 6. 用户相关 API

### 6.1 获取用户信息 - GET /users/{user_id}

**请求**:
```http
GET /users/{user_id}
Accept: application/json
Cookie: token={token}
```

**响应**:
```json
{
  "users": [
    {
      "id": 116255,
      "username": "RegisXu",
      "name": "RegisXu",
      "email_address": "xu.regis@gmail.com",
      "avatar_image": null,
      "is_public": true,
      "is_verified": false,
      "created_at": "2022-01-10 15:11:45.354338",
      "updated_at": "2026-03-06 06:44:38.590737",
      "instagram_username": null,
      "logbook": {"count": 449},
      "circuits": [...],
      "social": {
        "followees_accepted": 4,
        "followers_accepted": 0,
        "followers_pending": 0
      }
    }
  ]
}
```

---

## 7. Circuit（线路集合）

### 7.1 Circuit 数据模型

```json
{
  "uuid": "f4af1c507c524e14ac28914819e94e8f",
  "name": "40",
  "color": "00CC00",
  "count": 280,
  "is_listed": true,
  "is_public": false,
  "description": "",
  "user_id": 116255,
  "created_at": "2022-08-04 11:13:51.268583",
  "updated_at": "2026-03-06 03:34:14.139254"
}
```

---

## 8. 错误处理

API 可能返回以下 HTTP 状态码:
- `200` - 成功
- `401` - 未授权（token 无效或过期）
- `404` - 资源不存在
- `500` - 服务器错误

---

## 9. 限制与注意事项

1. **同步限制**: Sync API 可能返回 `_complete: false`，表示数据量太大，需要再次请求
2. **时间格式**: 所有时间戳使用 `YYYY-MM-DD HH:MM:SS.microseconds` 格式
3. **URL 编码**: POST 请求参数需要 URL 编码
4. **Cookie**: 所有请求需要携带 `token` Cookie
