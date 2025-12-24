#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import create_app, db
from sqlalchemy import text

def update_cleaning_type_to_enum():
    """将cleaning_type字段从varchar更改为enum类型，并包含disinfection值"""
    app = create_app()
    
    with app.app_context():
        try:
            with db.engine.connect() as connection:
                # 开始事务
                trans = connection.begin()
                
                try:
                    print("开始更新 cleaning_type 字段...")
                    
                    # 1. 首先检查当前数据中的值
                    print("\n1. 检查当前数据中的cleaning_type值:")
                    result = connection.execute(text("SELECT DISTINCT cleaning_type FROM cleaning_records WHERE cleaning_type IS NOT NULL"))
                    current_values = [row[0] for row in result]
                    print(f"当前值: {current_values}")
                    
                    # 2. 将字段类型更改为ENUM
                    print("\n2. 更新字段类型为ENUM...")
                    alter_sql = """
                    ALTER TABLE cleaning_records 
                    MODIFY COLUMN cleaning_type ENUM('cage', 'toys', 'perches', 'food_water', 'disinfection') 
                    COLLATE utf8mb4_unicode_ci DEFAULT NULL
                    """
                    connection.execute(text(alter_sql))
                    print("✅ 字段类型更新成功")
                    
                    # 3. 验证更新结果
                    print("\n3. 验证更新结果:")
                    result = connection.execute(text("SHOW COLUMNS FROM cleaning_records WHERE Field = 'cleaning_type'"))
                    for row in result:
                        print(f"字段: {row[0]}")
                        print(f"类型: {row[1]}")
                        print(f"允许NULL: {row[2]}")
                    
                    # 4. 检查表结构
                    print("\n4. 检查更新后的表结构:")
                    result2 = connection.execute(text("SHOW CREATE TABLE cleaning_records"))
                    for row in result2:
                        create_statement = row[1]
                        # 只显示cleaning_type相关的部分
                        import re
                        enum_match = re.search(r"`cleaning_type`[^,]+", create_statement)
                        if enum_match:
                            print(f"cleaning_type定义: {enum_match.group(0)}")
                    
                    # 提交事务
                    trans.commit()
                    print("\n✅ 数据库更新完成！")
                    
                except Exception as e:
                    # 回滚事务
                    trans.rollback()
                    print(f"❌ 更新失败，已回滚: {e}")
                    raise
                    
        except Exception as e:
            print(f"❌ 操作失败: {e}")

if __name__ == "__main__":
    update_cleaning_type_to_enum()