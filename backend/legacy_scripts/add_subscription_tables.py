#!/usr/bin/env python3
"""
添加会员订阅相关表和字段
1. users 表添加会员状态字段
2. 创建 subscription_orders 表
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
        
        # 1. 为 users 表添加会员相关字段
        print("正在为 users 表添加会员相关字段...")
        
        # subscription_tier
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_tier ENUM('free', 'pro', 'team') DEFAULT 'free' NOT NULL")
            print("成功添加 subscription_tier 字段")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("subscription_tier 字段已存在")
            else:
                print(f"添加 subscription_tier 字段时出错: {e}")
                
        # subscription_expire_at
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN subscription_expire_at DATETIME DEFAULT NULL")
            print("成功添加 subscription_expire_at 字段")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("subscription_expire_at 字段已存在")
            else:
                print(f"添加 subscription_expire_at 字段时出错: {e}")
                
        # is_auto_renew
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN is_auto_renew BOOLEAN DEFAULT FALSE")
            print("成功添加 is_auto_renew 字段")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("is_auto_renew 字段已存在")
            else:
                print(f"添加 is_auto_renew 字段时出错: {e}")

        # 2. 创建 subscription_orders 表
        print("正在创建 subscription_orders 表...")
        try:
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS subscription_orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                order_no VARCHAR(64) NOT NULL UNIQUE COMMENT '内部订单号',
                transaction_id VARCHAR(64) COMMENT '第三方支付流水号',
                plan_id VARCHAR(32) NOT NULL COMMENT '套餐ID: pro_monthly, pro_yearly 等',
                amount DECIMAL(10, 2) NOT NULL COMMENT '支付金额',
                status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                paid_at DATETIME DEFAULT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_table_sql)
            print("成功创建 subscription_orders 表")
        except Exception as e:
            print(f"创建 subscription_orders 表时出错: {e}")

        conn.commit()
        print("数据库迁移完成！")

    except Exception as e:
        print(f"数据库连接或迁移失败: {e}")
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

if __name__ == "__main__":
    migrate()
