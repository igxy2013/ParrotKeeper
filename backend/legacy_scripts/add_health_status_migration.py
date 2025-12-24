#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本：为 health_records 表添加 health_status 字段
"""

import pymysql
from config import Config

def add_health_status_column():
    """为 health_records 表添加 health_status 字段"""
    
    # 连接数据库
    connection = pymysql.connect(
        host=Config.DB_HOST,
        port=int(Config.DB_PORT),
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset='utf8mb4'
    )
    
    try:
        with connection.cursor() as cursor:
            # 检查字段是否已存在
            cursor.execute("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'health_records' 
                AND COLUMN_NAME = 'health_status'
            """, (Config.DB_NAME,))
            
            if cursor.fetchone():
                print("health_status 字段已存在，跳过迁移")
                return
            
            # 添加 health_status 字段
            print("正在添加 health_status 字段...")
            cursor.execute("""
                ALTER TABLE health_records 
                ADD COLUMN health_status ENUM('healthy', 'sick', 'recovering', 'observation') 
                DEFAULT 'healthy' 
                AFTER record_type
            """)
            
            # 提交更改
            connection.commit()
            print("✅ health_status 字段添加成功")
            
            # 验证字段是否添加成功
            cursor.execute("""
                SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s 
                AND TABLE_NAME = 'health_records' 
                AND COLUMN_NAME = 'health_status'
            """, (Config.DB_NAME,))
            
            result = cursor.fetchone()
            if result:
                print(f"✅ 验证成功: {result}")
            else:
                print("❌ 验证失败: 字段未找到")
                
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    print("开始执行 health_status 字段迁移...")
    add_health_status_column()
    print("迁移完成！")