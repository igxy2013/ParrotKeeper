#!/usr/bin/env python3
"""
数据库迁移脚本：为记录表添加创建者字段
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """执行数据库迁移"""
    db_path = 'parrot_keeper.db'
    
    if not os.path.exists(db_path):
        print("数据库文件不存在，跳过迁移")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("开始数据库迁移...")
        
        # 检查并添加 feeding_records 表的 created_by_user_id 字段
        cursor.execute("PRAGMA table_info(feeding_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by_user_id' not in columns:
            print("为 feeding_records 表添加 created_by_user_id 字段...")
            cursor.execute("""
                ALTER TABLE feeding_records 
                ADD COLUMN created_by_user_id INTEGER 
                REFERENCES users(id)
            """)
            
            # 为现有记录设置创建者（通过鹦鹉的拥有者）
            cursor.execute("""
                UPDATE feeding_records 
                SET created_by_user_id = (
                    SELECT user_id FROM parrots 
                    WHERE parrots.id = feeding_records.parrot_id
                )
                WHERE created_by_user_id IS NULL
            """)
        
        # 检查并添加 health_records 表的 created_by_user_id 字段
        cursor.execute("PRAGMA table_info(health_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by_user_id' not in columns:
            print("为 health_records 表添加 created_by_user_id 字段...")
            cursor.execute("""
                ALTER TABLE health_records 
                ADD COLUMN created_by_user_id INTEGER 
                REFERENCES users(id)
            """)
            
            # 为现有记录设置创建者
            cursor.execute("""
                UPDATE health_records 
                SET created_by_user_id = (
                    SELECT user_id FROM parrots 
                    WHERE parrots.id = health_records.parrot_id
                )
                WHERE created_by_user_id IS NULL
            """)
        
        # 检查并添加 cleaning_records 表的 created_by_user_id 字段
        cursor.execute("PRAGMA table_info(cleaning_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by_user_id' not in columns:
            print("为 cleaning_records 表添加 created_by_user_id 字段...")
            cursor.execute("""
                ALTER TABLE cleaning_records 
                ADD COLUMN created_by_user_id INTEGER 
                REFERENCES users(id)
            """)
            
            # 为现有记录设置创建者
            cursor.execute("""
                UPDATE cleaning_records 
                SET created_by_user_id = (
                    SELECT user_id FROM parrots 
                    WHERE parrots.id = cleaning_records.parrot_id
                )
                WHERE created_by_user_id IS NULL
            """)
        
        # 检查并添加 breeding_records 表的 created_by_user_id 字段
        cursor.execute("PRAGMA table_info(breeding_records)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_by_user_id' not in columns:
            print("为 breeding_records 表添加 created_by_user_id 字段...")
            cursor.execute("""
                ALTER TABLE breeding_records 
                ADD COLUMN created_by_user_id INTEGER 
                REFERENCES users(id)
            """)
            
            # 为现有记录设置创建者
            cursor.execute("""
                UPDATE breeding_records 
                SET created_by_user_id = (
                    SELECT user_id FROM parrots 
                    WHERE parrots.id = breeding_records.male_parrot_id
                )
                WHERE created_by_user_id IS NULL
            """)
        
        conn.commit()
        print("数据库迁移完成！")
        
    except Exception as e:
        conn.rollback()
        print(f"迁移失败: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database()