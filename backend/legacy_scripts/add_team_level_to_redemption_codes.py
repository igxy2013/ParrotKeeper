#!/usr/bin/env python3
"""
数据库迁移：为 redemption_codes 表添加 team_level 字段
"""

import os
import pymysql
from dotenv import load_dotenv

# 加载环境变量（优先 backend/.env，其次项目根目录 .env）
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
load_dotenv(env_path)

DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'port': int(os.environ.get('DB_PORT') or '3306'),
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'parrot_breeding',
    'charset': 'utf8mb4'
}

def column_exists(cursor, db_name, table_name, column_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = %s 
          AND TABLE_NAME = %s 
          AND COLUMN_NAME = %s
        """,
        (db_name, table_name, column_name)
    )
    return cursor.fetchone() is not None

def migrate():
    conn = None
    try:
        print(f"正在连接MySQL服务器 {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
        conn = pymysql.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset=DB_CONFIG['charset']
        )
        cursor = conn.cursor()

        # 检查并添加 team_level 字段
        print("检查 redemption_codes.team_level 字段...")
        if column_exists(cursor, DB_CONFIG['database'], 'redemption_codes', 'team_level'):
            print("team_level 字段已存在，跳过迁移")
        else:
            print("正在为 redemption_codes 表添加 team_level 字段...")
            cursor.execute(
                """
                ALTER TABLE redemption_codes 
                ADD COLUMN team_level ENUM('basic','advanced') NULL AFTER tier
                """
            )
            conn.commit()
            print("✅ 已添加 team_level 字段")

        print("迁移完成！")
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"迁移失败: {e}")
        raise
    finally:
        try:
            if conn:
                conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    migrate()

