#!/usr/bin/env python3
"""
抓取 2026 年 Kilterboard 数据的专用脚本
用法: python fetch_2026.py --username YOUR_USERNAME --password YOUR_PASSWORD
"""

import os
import sys
import json
from datetime import datetime
from kilter_sync import KilterSync


def fetch_2026_data(username: str, password: str, db_path: str = "kilter_2026.db"):
    """
    抓取 2026 年的 Kilterboard 数据
    
    Args:
        username: Kilterboard 用户名
        password: Kilterboard 密码
        db_path: 数据库文件路径
    """
    
    print("=" * 60)
    print("Kilterboard 2026 年数据抓取工具")
    print("=" * 60)
    
    # 创建同步器
    sync = KilterSync(db_path)
    
    try:
        # 登录
        print(f"\n正在登录用户: {username}")
        if not sync.login(username, password):
            print("登录失败，请检查用户名和密码")
            return False
        
        # 同步所有数据
        print("\n开始同步数据...")
        sync.sync_all()
        
        # 显示 2026 年的详细统计
        print("\n" + "=" * 60)
        print("2026 年数据汇总")
        print("=" * 60)
        
        cursor = sync.db.conn.cursor()
        
        # 2026 年完攀记录
        cursor.execute("""
            SELECT 
                COUNT(*) as total_ascents,
                AVG(difficulty) as avg_difficulty,
                SUM(bid_count) as total_attempts
            FROM ascents 
            WHERE climbed_at >= '2026-01-01' AND climbed_at < '2027-01-01'
        """)
        row = cursor.fetchone()
        print(f"\n【2026 年完攀记录】")
        print(f"  完攀次数: {row[0] or 0}")
        print(f"  平均难度: {row[1]:.1f}" if row[1] else "  平均难度: N/A")
        print(f"  总尝试次数: {row[2] or 0}")
        
        # 2026 年尝试记录
        cursor.execute("""
            SELECT 
                COUNT(*) as total_bids,
                SUM(bid_count) as total_attempts
            FROM bids 
            WHERE climbed_at >= '2026-01-01' AND climbed_at < '2027-01-01'
        """)
        row = cursor.fetchone()
        print(f"\n【2026 年尝试记录】")
        print(f"  尝试线路数: {row[0] or 0}")
        print(f"  总尝试次数: {row[1] or 0}")
        
        # 按月份统计
        print(f"\n【2026 年按月统计】")
        cursor.execute("""
            SELECT 
                strftime('%Y-%m', climbed_at) as month,
                COUNT(*) as count,
                AVG(difficulty) as avg_diff
            FROM ascents 
            WHERE climbed_at >= '2026-01-01' AND climbed_at < '2027-01-01'
            GROUP BY month
            ORDER BY month
        """)
        print("  月份      | 完攀次数 | 平均难度")
        print("  " + "-" * 35)
        for row in cursor.fetchall():
            month = row[0] or "Unknown"
            count = row[1] or 0
            avg_diff = f"{row[2]:.1f}" if row[2] else "N/A"
            print(f"  {month} | {count:8d} | {avg_diff}")
        
        # 最常攀爬的线路
        print(f"\n【2026 年最常完成的线路 Top 10】")
        cursor.execute("""
            SELECT 
                c.name,
                c.setter_username,
                a.angle,
                COUNT(*) as count,
                AVG(a.difficulty) as avg_diff
            FROM ascents a
            JOIN climbs c ON a.climb_uuid = c.uuid
            WHERE a.climbed_at >= '2026-01-01' AND a.climbed_at < '2027-01-01'
            GROUP BY a.climb_uuid, a.angle
            ORDER BY count DESC
            LIMIT 10
        """)
        print("  排名 | 线路名称                | 定线员           | 角度 | 次数 | 难度")
        print("  " + "-" * 75)
        for idx, row in enumerate(cursor.fetchall(), 1):
            name = (row[0] or "Unknown")[:22].ljust(22)
            setter = (row[1] or "Unknown")[:15].ljust(15)
            angle = f"{row[2] or 0}°".rjust(3)
            count = f"{row[3] or 0}".rjust(4)
            diff = f"{row[4]:.1f}" if row[4] else "N/A"
            print(f"  {idx:4d} | {name} | {setter} | {angle} | {count} | {diff}")
        
        # 最难完成的线路
        print(f"\n【2026 年完成的最难线路 Top 10】")
        cursor.execute("""
            SELECT 
                c.name,
                c.setter_username,
                a.angle,
                a.difficulty,
                a.climbed_at
            FROM ascents a
            JOIN climbs c ON a.climb_uuid = c.uuid
            WHERE a.climbed_at >= '2026-01-01' AND a.climbed_at < '2027-01-01'
              AND a.difficulty IS NOT NULL
            ORDER BY a.difficulty DESC
            LIMIT 10
        """)
        print("  排名 | 线路名称                | 定线员           | 角度 | 难度 | 日期")
        print("  " + "-" * 80)
        for idx, row in enumerate(cursor.fetchall(), 1):
            name = (row[0] or "Unknown")[:22].ljust(22)
            setter = (row[1] or "Unknown")[:15].ljust(15)
            angle = f"{row[2] or 0}°".rjust(3)
            diff = f"{row[3] or 0}".rjust(4)
            date = (row[4] or "")[:10]
            print(f"  {idx:4d} | {name} | {setter} | {angle} | {diff} | {date}")
        
        # 尝试但未完成的线路
        print(f"\n【2026 年尝试但未完成的线路】")
        cursor.execute("""
            SELECT 
                c.name,
                c.setter_username,
                b.angle,
                b.bid_count,
                cs.difficulty_average
            FROM bids b
            JOIN climbs c ON b.climb_uuid = c.uuid
            LEFT JOIN climb_stats cs ON b.climb_uuid = cs.climb_uuid AND b.angle = cs.angle
            WHERE b.climbed_at >= '2026-01-01' AND b.climbed_at < '2027-01-01'
            ORDER BY b.bid_count DESC
            LIMIT 10
        """)
        print("  线路名称                | 定线员           | 角度 | 尝试次数 | 平均难度")
        print("  " + "-" * 70)
        for row in cursor.fetchall():
            name = (row[0] or "Unknown")[:22].ljust(22)
            setter = (row[1] or "Unknown")[:15].ljust(15)
            angle = f"{row[2] or 0}°".rjust(3)
            bids = f"{row[3] or 0}".rjust(8)
            avg_diff = f"{row[4]:.1f}" if row[4] else "N/A"
            print(f"  {name} | {setter} | {angle} | {bids} | {avg_diff}")
        
        print("\n" + "=" * 60)
        print(f"数据已保存到: {db_path}")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        sync.close()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="抓取 2026 年 Kilterboard 数据")
    parser.add_argument("--username", "-u", help="Kilterboard 用户名")
    parser.add_argument("--password", "-p", help="Kilterboard 密码")
    parser.add_argument("--db", "-d", help="数据库路径", default="kilter_2026.db")
    
    args = parser.parse_args()
    
    # 获取凭据
    username = args.username or os.environ.get("KILTER_USERNAME")
    password = args.password or os.environ.get("KILTER_PASSWORD")
    
    if not username:
        username = input("请输入 Kilterboard 用户名: ")
    if not password:
        password = input("请输入 Kilterboard 密码: ")
    
    # 抓取数据
    success = fetch_2026_data(username, password, args.db)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
