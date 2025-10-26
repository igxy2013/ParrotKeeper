#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
添加饮用水相关的清洁类型到 cleaning_records 表的 cleaning_type 枚举中
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db
from sqlalchemy import text

def add_water_cleaning_types():
    """添加饮用水相关的清洁类型"""
    
    app = create_app()
    with app.app_context():
        try:
            # 检查当前枚举值
            print("检查当前 cleaning_type 枚举值...")
            result = db.engine.connect().execute(text("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'cleaning_records' 
                AND COLUMN_NAME = 'cleaning_type'
            """))
            
            current_enum = result.fetchone()
            if current_enum:
                print(f"当前枚举类型: {current_enum[0]}")
            
            # 检查是否已经包含新的枚举值
            if 'water_change' in str(current_enum[0]) and 'water_bowl_clean' in str(current_enum[0]):
                print("饮用水相关的清洁类型已存在，无需更新")
                return
            
            print("开始更新 cleaning_type 枚举...")
            
            # 更新枚举类型，添加新的饮用水相关类型
            db.engine.connect().execute(text("""
                ALTER TABLE cleaning_records 
                MODIFY COLUMN cleaning_type 
                ENUM('cage', 'toys', 'perches', 'food_water', 'disinfection', 'water_change', 'water_bowl_clean')
            """))
            
            print("✅ 成功添加饮用水相关的清洁类型:")
            print("   - water_change: 饮用水更换")
            print("   - water_bowl_clean: 水碗清洁")
            
            # 验证更新结果
            print("\n验证更新结果...")
            result = db.engine.connect().execute(text("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'cleaning_records' 
                AND COLUMN_NAME = 'cleaning_type'
            """))
            
            updated_enum = result.fetchone()
            if updated_enum:
                print(f"更新后的枚举类型: {updated_enum[0]}")
            
            # 检查表结构
            print("\n检查 cleaning_records 表结构:")
            result = db.engine.connect().execute(text("DESCRIBE cleaning_records"))
            for row in result:
                if row[0] == 'cleaning_type':
                    print(f"  {row[0]}: {row[1]} (允许NULL: {row[2]})")
            
        except Exception as e:
            print(f"❌ 更新失败: {str(e)}")
            raise

if __name__ == '__main__':
    print("开始添加饮用水相关的清洁类型...")
    add_water_cleaning_types()
    print("完成!")