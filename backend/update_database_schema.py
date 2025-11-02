#!/usr/bin/env python3
"""
更新数据库表结构脚本
为现有表添加积分相关字段和新表
"""

import pymysql
import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# 数据库配置 - 从环境变量读取
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'port': int(os.environ.get('DB_PORT') or '3306'),
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'parrot_breeding',
    'charset': 'utf8mb4'
}

def update_database_schema():
    """更新数据库表结构"""
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
        
        # 1. 为users表添加积分相关字段
        print("正在为users表添加积分相关字段...")
        try:
            # 添加points字段
            cursor.execute("ALTER TABLE users ADD COLUMN points INT DEFAULT 0 NOT NULL")
            print("成功添加points字段")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("points字段已存在")
            else:
                print(f"添加points字段时出错: {e}")
        
        try:
            # 添加last_checkin_date字段
            cursor.execute("ALTER TABLE users ADD COLUMN last_checkin_date DATE")
            print("成功添加last_checkin_date字段")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("last_checkin_date字段已存在")
            else:
                print(f"添加last_checkin_date字段时出错: {e}")
        
        # 2. 创建user_points_records表
        print("正在创建user_points_records表...")
        try:
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS user_points_records (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                point_type VARCHAR(50) NOT NULL COMMENT '积分类型：checkin, daily_visit, feeding, health, cleaning, breeding, expense',
                points INT NOT NULL COMMENT '获取的积分数量',
                record_date DATE NOT NULL COMMENT '记录日期',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_points_record (user_id, point_type, record_date),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_table_sql)
            print("成功创建user_points_records表")
        except Exception as e:
            print(f"创建user_points_records表时出错: {e}")
        
        # 3. 创建incomes表（如果不存在）
        print("正在创建incomes表...")
        try:
            create_incomes_table_sql = """
            CREATE TABLE IF NOT EXISTS incomes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                parrot_id INT COMMENT '关联鹦鹉ID（可为空，表示通用收入）',
                category ENUM('breeding_sale', 'bird_sale', 'service', 'competition', 'other') COMMENT '收入类别',
                amount DECIMAL(8,2) NOT NULL COMMENT '金额',
                description VARCHAR(255) COMMENT '描述',
                income_date DATE DEFAULT (CURRENT_DATE) COMMENT '收入日期',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (parrot_id) REFERENCES parrots(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_incomes_table_sql)
            print("成功创建incomes表")
        except Exception as e:
            print(f"创建incomes表时出错: {e}")
        
        # 4. 创建user_statistics表（如果不存在）
        print("正在创建user_statistics表...")
        try:
            create_stats_table_sql = """
            CREATE TABLE IF NOT EXISTS user_statistics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                stats_views INT DEFAULT 0 COMMENT '统计页面查看次数',
                team_id INT COMMENT '团队标识',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_statistics (user_id, team_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
            cursor.execute(create_stats_table_sql)
            print("成功创建user_statistics表")
        except Exception as e:
            print(f"创建user_statistics表时出错: {e}")
        
        # 提交事务
        conn.commit()
        print("数据库表结构更新完成！")
        
    except pymysql.Error as e:
        print(f"数据库错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"其他错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    update_database_schema()