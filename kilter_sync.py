#!/usr/bin/env python3
"""
Kilterboard 数据同步工具
自动抓取和同步 Kilterboard 数据到本地 SQLite 数据库
"""

import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any


class KilterClient:
    """Kilterboard API 客户端"""
    
    BASE_URL = "https://kilterboardapp.com"
    
    def __init__(self):
        self.token: Optional[str] = None
        self.user_id: Optional[int] = None
    
    def login(self, username: str, password: str) -> bool:
        """登录并获取 token"""
        url = f"{self.BASE_URL}/sessions"
        data = urllib.parse.urlencode({
            "username": username,
            "password": password,
            "tou": "accepted",
            "pp": "accepted",
            "ua": "app"
        }).encode()
        
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "KilterBoard/1.0"
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode())
                self.token = result["session"]["token"]
                self.user_id = result["session"]["user_id"]
                print(f"登录成功，用户ID: {self.user_id}")
                return True
        except urllib.error.HTTPError as e:
            print(f"登录失败: {e.code} - {e.read().decode()}")
            return False
        except Exception as e:
            print(f"登录错误: {e}")
            return False
    
    def sync(self, sync_params: Dict[str, str]) -> Dict[str, Any]:
        """
        增量同步数据
        
        Args:
            sync_params: 资源名称 -> 上次同步时间的字典
        
        Returns:
            API 响应数据
        """
        url = f"{self.BASE_URL}/sync"
        data = urllib.parse.urlencode(sync_params).encode()
        
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "Cookie": f"token={self.token}",
                "User-Agent": "KilterBoard/1.0"
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                return json.loads(response.read().decode())
        except urllib.error.HTTPError as e:
            print(f"同步失败: {e.code} - {e.read().decode()}")
            raise
        except Exception as e:
            print(f"同步错误: {e}")
            raise


class KilterDatabase:
    """Kilterboard SQLite 数据库管理"""
    
    def __init__(self, db_path: str = "kilter.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_tables()
    
    def _init_tables(self):
        """初始化数据库表结构"""
        cursor = self.conn.cursor()
        
        # 启用外键
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # 1. climbs 表
        cursor.execute("""
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
            )
        """)
        
        # 2. climb_stats 表
        cursor.execute("""
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
            )
        """)
        
        # 3. ascents 表
        cursor.execute("""
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
            )
        """)
        
        # 4. bids 表
        cursor.execute("""
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
            )
        """)
        
        # 5. sync_state 表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sync_state (
                resource_name TEXT PRIMARY KEY,
                last_sync_at DATETIME NOT NULL,
                sync_count INTEGER DEFAULT 0
            )
        """)
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_climbs_updated ON climbs(updated_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_stats_climb ON climb_stats(climb_uuid)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ascents_climb ON ascents(climb_uuid)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ascents_climbed ON ascents(climbed_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bids_climb ON bids(climb_uuid)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bids_climbed ON bids(climbed_at)")
        
        self.conn.commit()
    
    def get_last_sync_time(self, resource_name: str) -> str:
        """获取资源的上次同步时间"""
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT last_sync_at FROM sync_state WHERE resource_name = ?",
            (resource_name,)
        )
        row = cursor.fetchone()
        if row:
            return row[0]
        # 默认从很久以前开始
        return "1970-01-01 00:00:00.000000"
    
    def update_sync_time(self, resource_name: str, sync_time: str):
        """更新资源的同步时间"""
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO sync_state (resource_name, last_sync_at, sync_count)
            VALUES (?, ?, 1)
            ON CONFLICT(resource_name) DO UPDATE SET
                last_sync_at = excluded.last_sync_at,
                sync_count = sync_count + 1
        """, (resource_name, sync_time))
        self.conn.commit()
    
    def insert_climbs(self, climbs: List[Dict]):
        """批量插入或更新线路数据"""
        if not climbs:
            return
        
        cursor = self.conn.cursor()
        for climb in climbs:
            cursor.execute("""
                INSERT INTO climbs (
                    uuid, name, angle, description,
                    edge_bottom, edge_left, edge_right, edge_top,
                    frames, frames_count, frames_pace, hsm,
                    is_draft, is_listed, is_nomatch, layout_id,
                    setter_id, setter_username, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(uuid) DO UPDATE SET
                    name = excluded.name,
                    angle = excluded.angle,
                    description = excluded.description,
                    edge_bottom = excluded.edge_bottom,
                    edge_left = excluded.edge_left,
                    edge_right = excluded.edge_right,
                    edge_top = excluded.edge_top,
                    frames = excluded.frames,
                    frames_count = excluded.frames_count,
                    frames_pace = excluded.frames_pace,
                    hsm = excluded.hsm,
                    is_draft = excluded.is_draft,
                    is_listed = excluded.is_listed,
                    is_nomatch = excluded.is_nomatch,
                    layout_id = excluded.layout_id,
                    setter_id = excluded.setter_id,
                    setter_username = excluded.setter_username,
                    updated_at = excluded.updated_at
            """, (
                climb.get("uuid"),
                climb.get("name"),
                climb.get("angle"),
                climb.get("description"),
                climb.get("edge_bottom"),
                climb.get("edge_left"),
                climb.get("edge_right"),
                climb.get("edge_top"),
                climb.get("frames"),
                climb.get("frames_count"),
                climb.get("frames_pace"),
                climb.get("hsm"),
                climb.get("is_draft", False),
                climb.get("is_listed", True),
                climb.get("is_nomatch", False),
                climb.get("layout_id"),
                climb.get("setter_id"),
                climb.get("setter_username"),
                climb.get("created_at"),
                climb.get("updated_at")
            ))
        self.conn.commit()
        print(f"  已同步 {len(climbs)} 条线路")
    
    def insert_climb_stats(self, stats: List[Dict]):
        """批量插入或更新线路统计数据"""
        if not stats:
            return
        
        cursor = self.conn.cursor()
        success_count = 0
        skip_count = 0
        for stat in stats:
            try:
                cursor.execute("""
                    INSERT INTO climb_stats (
                        climb_uuid, angle, ascensionist_count,
                        difficulty_average, quality_average, benchmark_difficulty,
                        fa_uid, fa_username, fa_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(climb_uuid, angle) DO UPDATE SET
                        ascensionist_count = excluded.ascensionist_count,
                        difficulty_average = excluded.difficulty_average,
                        quality_average = excluded.quality_average,
                        benchmark_difficulty = excluded.benchmark_difficulty,
                        fa_uid = excluded.fa_uid,
                        fa_username = excluded.fa_username,
                        fa_at = excluded.fa_at,
                        updated_at = excluded.updated_at
                """, (
                    stat.get("climb_uuid"),
                    stat.get("angle"),
                    stat.get("ascensionist_count", 0),
                    stat.get("difficulty_average"),
                    stat.get("quality_average"),
                    stat.get("benchmark_difficulty"),
                    stat.get("fa_uid"),
                    stat.get("fa_username"),
                    stat.get("fa_at"),
                    stat.get("created_at"),
                    stat.get("updated_at")
                ))
                success_count += 1
            except sqlite3.IntegrityError:
                skip_count += 1  # 外键约束失败，跳过
        self.conn.commit()
        if skip_count > 0:
            print(f"  已同步 {success_count} 条线路统计 (跳过 {skip_count} 条)")
        else:
            print(f"  已同步 {success_count} 条线路统计")
    
    def insert_ascents(self, ascents: List[Dict]):
        """批量插入或更新完攀记录"""
        if not ascents:
            return
        
        cursor = self.conn.cursor()
        success_count = 0
        skip_count = 0
        for ascent in ascents:
            try:
                cursor.execute("""
                    INSERT INTO ascents (
                        uuid, climb_uuid, user_id, angle, attempt_id, bid_count,
                        difficulty, quality, is_benchmark, is_listed, is_mirror,
                        comment, climbed_at, created_at, updated_at, wall_uuid
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(uuid) DO UPDATE SET
                        climb_uuid = excluded.climb_uuid,
                        user_id = excluded.user_id,
                        angle = excluded.angle,
                        attempt_id = excluded.attempt_id,
                        bid_count = excluded.bid_count,
                        difficulty = excluded.difficulty,
                        quality = excluded.quality,
                        is_benchmark = excluded.is_benchmark,
                        is_listed = excluded.is_listed,
                        is_mirror = excluded.is_mirror,
                        comment = excluded.comment,
                        climbed_at = excluded.climbed_at,
                        updated_at = excluded.updated_at,
                        wall_uuid = excluded.wall_uuid
                """, (
                    ascent.get("uuid"),
                    ascent.get("climb_uuid"),
                    ascent.get("user_id"),
                    ascent.get("angle"),
                    ascent.get("attempt_id", 0),
                    ascent.get("bid_count", 0),
                    ascent.get("difficulty"),
                    ascent.get("quality"),
                    ascent.get("is_benchmark", False),
                    ascent.get("is_listed", True),
                    ascent.get("is_mirror", False),
                    ascent.get("comment", ""),
                    ascent.get("climbed_at"),
                    ascent.get("created_at"),
                    ascent.get("updated_at"),
                    ascent.get("wall_uuid")
                ))
                success_count += 1
            except sqlite3.IntegrityError:
                skip_count += 1  # 外键约束失败，跳过
        self.conn.commit()
        if skip_count > 0:
            print(f"  已同步 {success_count} 条完攀记录 (跳过 {skip_count} 条)")
        else:
            print(f"  已同步 {success_count} 条完攀记录")
    
    def insert_bids(self, bids: List[Dict]):
        """批量插入或更新尝试记录"""
        if not bids:
            return
        
        cursor = self.conn.cursor()
        success_count = 0
        skip_count = 0
        for bid in bids:
            try:
                cursor.execute("""
                    INSERT INTO bids (
                        uuid, climb_uuid, user_id, angle, bid_count,
                        is_listed, is_mirror, comment, climbed_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(uuid) DO UPDATE SET
                        climb_uuid = excluded.climb_uuid,
                        user_id = excluded.user_id,
                        angle = excluded.angle,
                        bid_count = excluded.bid_count,
                        is_listed = excluded.is_listed,
                        is_mirror = excluded.is_mirror,
                        comment = excluded.comment,
                        climbed_at = excluded.climbed_at,
                        updated_at = excluded.updated_at
                """, (
                    bid.get("uuid"),
                    bid.get("climb_uuid"),
                    bid.get("user_id"),
                    bid.get("angle"),
                    bid.get("bid_count", 0),
                    bid.get("is_listed", True),
                    bid.get("is_mirror", False),
                    bid.get("comment", ""),
                    bid.get("climbed_at"),
                    bid.get("created_at"),
                    bid.get("updated_at")
                ))
                success_count += 1
            except sqlite3.IntegrityError:
                skip_count += 1  # 外键约束失败，跳过
        self.conn.commit()
        if skip_count > 0:
            print(f"  已同步 {success_count} 条尝试记录 (跳过 {skip_count} 条)")
        else:
            print(f"  已同步 {success_count} 条尝试记录")
    
    def get_stats(self) -> Dict[str, int]:
        """获取数据库统计信息"""
        cursor = self.conn.cursor()
        stats = {}
        
        tables = ["climbs", "climb_stats", "ascents", "bids"]
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """关闭数据库连接"""
        self.conn.close()


class KilterSync:
    """Kilterboard 数据同步主类"""
    
    # 主要关注的资源类型
    SYNC_RESOURCES = ["climbs", "climb_stats", "ascents", "bids"]
    
    def __init__(self, db_path: str = "kilter.db"):
        self.client = KilterClient()
        self.db = KilterDatabase(db_path)
    
    def login(self, username: str, password: str) -> bool:
        """登录"""
        return self.client.login(username, password)
    
    def sync_resource(self, resource_name: str) -> bool:
        """同步单个资源，支持分页"""
        print(f"\n正在同步 {resource_name}...")
        
        total_count = 0
        attempt = 0
        max_attempts = 200  # 足够同步 40万+ 条数据 (2000 * 200)
        
        while attempt < max_attempts:
            attempt += 1
            
            # 获取上次同步时间
            last_sync = self.db.get_last_sync_time(resource_name)
            if attempt == 1:
                print(f"  上次同步时间: {last_sync}")
            
            # 构建同步参数
            sync_params = {resource_name: last_sync}
            
            try:
                # 调用 API
                result = self.client.sync(sync_params)
                
                # 保存数据
                data_count = 0
                if resource_name in result:
                    data = result[resource_name]
                    data_count = len(data)
                    if resource_name == "climbs":
                        self.db.insert_climbs(data)
                    elif resource_name == "climb_stats":
                        self.db.insert_climb_stats(data)
                    elif resource_name == "ascents":
                        self.db.insert_ascents(data)
                    elif resource_name == "bids":
                        self.db.insert_bids(data)
                else:
                    print(f"  没有新的 {resource_name} 数据")
                
                total_count += data_count
                
                # 更新同步时间
                sync_time = None
                if "user_syncs" in result:
                    for sync in result["user_syncs"]:
                        if sync.get("table_name") == resource_name:
                            sync_time = sync.get("last_synchronized_at")
                            break
                if "shared_syncs" in result:
                    for sync in result["shared_syncs"]:
                        if sync.get("table_name") == resource_name:
                            sync_time = sync.get("last_synchronized_at")
                            break
                
                if sync_time:
                    self.db.update_sync_time(resource_name, sync_time)
                    if attempt == 1:
                        print(f"  同步时间已更新: {sync_time}")
                
                # 检查是否还有更多数据
                if result.get("_complete", True):
                    break
                else:
                    print(f"  数据不完整，继续同步... ({attempt}/{max_attempts})")
                    
            except Exception as e:
                print(f"  同步 {resource_name} 失败: {e}")
                return False
        
        print(f"  共同步 {total_count} 条 {resource_name} 记录")
        return True
    
    def sync_all(self):
        """同步所有资源"""
        print("=" * 50)
        print("开始同步 Kilterboard 数据")
        print("=" * 50)
        
        success_count = 0
        for resource in self.SYNC_RESOURCES:
            if self.sync_resource(resource):
                success_count += 1
        
        print("\n" + "=" * 50)
        print(f"同步完成: {success_count}/{len(self.SYNC_RESOURCES)} 个资源同步成功")
        
        # 显示统计
        stats = self.db.get_stats()
        print("\n数据库统计:")
        for table, count in stats.items():
            print(f"  {table}: {count} 条记录")
    
    def sync_year(self, year: int):
        """同步指定年份的数据"""
        print(f"\n同步 {year} 年的数据...")
        
        # 对于 ascents 和 bids，我们可以根据时间筛选
        # 但 sync API 是基于 updated_at 的，所以我们还是需要全量同步后筛选
        self.sync_all()
        
        # 显示该年的统计
        cursor = self.db.conn.cursor()
        start_date = f"{year}-01-01"
        end_date = f"{year + 1}-01-01"
        
        print(f"\n{year} 年数据汇总:")
        
        cursor.execute("""
            SELECT COUNT(*) FROM ascents 
            WHERE climbed_at >= ? AND climbed_at < ?
        """, (start_date, end_date))
        print(f"  完攀记录: {cursor.fetchone()[0]} 条")
        
        cursor.execute("""
            SELECT COUNT(*) FROM bids 
            WHERE climbed_at >= ? AND climbed_at < ?
        """, (start_date, end_date))
        print(f"  尝试记录: {cursor.fetchone()[0]} 条")
    
    def close(self):
        """清理资源"""
        self.db.close()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Kilterboard 数据同步工具")
    parser.add_argument("--username", "-u", help="用户名", default=None)
    parser.add_argument("--password", "-p", help="密码", default=None)
    parser.add_argument("--db", "-d", help="数据库路径", default="kilter.db")
    parser.add_argument("--year", "-y", type=int, help="同步指定年份的数据", default=None)
    parser.add_argument("--env", "-e", action="store_true", help="从环境变量读取凭据")
    
    args = parser.parse_args()
    
    # 获取凭据
    username = args.username
    password = args.password
    
    if args.env or not username or not password:
        username = os.environ.get("KILTER_USERNAME", username)
        password = os.environ.get("KILTER_PASSWORD", password)
    
    if not username or not password:
        username = input("用户名: ")
        password = input("密码: ")
    
    # 创建同步器
    sync = KilterSync(args.db)
    
    try:
        # 登录
        if not sync.login(username, password):
            sys.exit(1)
        
        # 同步数据
        if args.year:
            sync.sync_year(args.year)
        else:
            sync.sync_all()
            
    except KeyboardInterrupt:
        print("\n操作已取消")
    finally:
        sync.close()


if __name__ == "__main__":
    main()
