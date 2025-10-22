#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库初始化脚本
"""

import pymysql
import os
import sys

# 数据库配置
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'charset': 'utf8mb4',
    'auth_plugin_map': {
        'mysql_native_password': 'mysql_native_password'
    }
}

def init_database():
    """初始化数据库"""
    try:
        # 连接MySQL服务器
        print("正在连接MySQL服务器...")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # 读取并执行schema.sql
        print("正在创建数据库结构...")
        with open('schema.sql', 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        # 分割SQL语句并执行
        statements = schema_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                cursor.execute(statement)
        
        # 读取并执行init_data.sql
        print("正在插入初始数据...")
        with open('init_data.sql', 'r', encoding='utf-8') as f:
            data_sql = f.read()
        
        # 分割SQL语句并执行
        statements = data_sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                cursor.execute(statement)
        
        # 提交事务
        conn.commit()
        print("数据库初始化完成！")
        
        # 验证数据
        cursor.execute("USE parrot_breeding")
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"用户表中有 {user_count} 条记录")
        
        cursor.execute("SELECT COUNT(*) FROM parrots")
        parrot_count = cursor.fetchone()[0]
        print(f"鹦鹉表中有 {parrot_count} 条记录")
        
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