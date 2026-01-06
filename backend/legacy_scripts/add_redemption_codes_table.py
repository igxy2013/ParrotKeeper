#!/usr/bin/env python3
"""
添加兑换码表
"""

import pymysql
import os
import sys
from dotenv import load_dotenv

# 加载环境变量
# 尝试加载 backend 目录下的 .env 文件
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if not os.path.exists(env_path):
    # 如果不存在，尝试加载项目根目录下的 .env
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')

load_dotenv(env_path)

# 数据库配置 - 从环境变量读取
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'port': int(os.environ.get('DB_PORT') or '3306'),
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'parrot_breeding',
    'charset': 'utf8mb4'
}

def migrate():
    """执行数据库迁移"""
    try:
        # 连接MySQL服务器
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
        
        # 创建 redemption_codes 表
        print("正在创建 redemption_codes 表...")
        try:
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS redemption_codes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                code VARCHAR(32) NOT NULL UNIQUE COMMENT '兑换码',
                tier ENUM('pro', 'team') DEFAULT 'pro' NOT NULL,
                duration_days INT NOT NULL COMMENT '有效天数',
                status ENUM('active', 'used', 'expired') DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                used_at DATETIME DEFAULT NULL,
                used_by_user_id INT COMMENT '使用者ID',
                created_by_user_id INT COMMENT '创建者ID',
                FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_table_sql)
            print("成功创建 redemption_codes 表")
        except Exception as e:
            print(f"创建 redemption_codes 表时出错: {e}")

        conn.commit()
        print("数据库迁移完成！")

    except Exception as e:
        print(f"数据库连接或迁移失败: {e}")
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

if __name__ == "__main__":
    migrate()
