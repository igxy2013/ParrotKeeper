#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本
"""

import pymysql
import os
import sys
from dotenv import load_dotenv

# 加载环境变量
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

# 数据库配置 - 从环境变量读取
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'port': int(os.environ.get('DB_PORT') or '3306'),
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'charset': 'utf8mb4',
    'auth_plugin_map': {
        'mysql_native_password': 'mysql_native_password'
    }
}

def init_database():
    """初始化数据库"""
    try:
        # 连接MySQL服务器
        print(f"正在连接MySQL服务器 {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 读取并执行schema.sql
        print("正在创建数据库结构...")
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # 分割SQL语句并执行
        statements = schema_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    cursor.execute(statement)
                except Exception as e:
                    # 忽略某些可以接受的错误，比如表已存在
                    if "already exists" not in str(e) and "Duplicate column name" not in str(e):
                        print(f"执行SQL语句时出错: {e}")
                        print(f"SQL语句: {statement[:100]}...")
        
        # 读取并执行init_data.sql
        print("正在插入初始数据...")
        init_data_path = os.path.join(os.path.dirname(__file__), 'init_data.sql')
        if os.path.exists(init_data_path):
            with open(init_data_path, 'r', encoding='utf-8') as f:
                data_sql = f.read()
            
            # 分割SQL语句并执行
            statements = data_sql.split(';')
            for statement in statements:
                statement = statement.strip()
                if statement:
                    try:
                        cursor.execute(statement)
                    except Exception as e:
                        # 忽略某些可以接受的错误，比如重复数据
                        if "Duplicate entry" not in str(e):
                            print(f"执行SQL语句时出错: {e}")
                            print(f"SQL语句: {statement[:100]}...")
        else:
            print("未找到init_data.sql文件，跳过初始数据插入")
        
        # 提交事务
        conn.commit()
        print("数据库初始化完成！")
        
        # 验证数据
        try:
            cursor.execute("USE parrot_breeding")
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            print(f"用户表中有 {user_count} 条记录")
            
            cursor.execute("SELECT COUNT(*) FROM parrots")
            parrot_count = cursor.fetchone()[0]
            print(f"鹦鹉表中有 {parrot_count} 条记录")
        except Exception as e:
            print(f"验证数据时出错: {e}")
        
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
    init_database()