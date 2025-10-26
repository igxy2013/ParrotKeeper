#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from app import create_app, db
from sqlalchemy import text

def check_cleaning_type_enum():
    """检查数据库中cleaning_type字段的枚举定义"""
    app = create_app()
    
    with app.app_context():
        try:
            # 检查字段信息
            with db.engine.connect() as connection:
                result = connection.execute(text("SHOW COLUMNS FROM cleaning_records WHERE Field = 'cleaning_type'"))
                print("=== cleaning_type 字段信息 ===")
                for row in result:
                    print(f"字段: {row[0]}")
                    print(f"类型: {row[1]}")
                    print(f"允许NULL: {row[2]}")
                    print(f"键: {row[3]}")
                    print(f"默认值: {row[4]}")
                    print(f"额外信息: {row[5]}")
                
                print("\n=== 表结构 ===")
                # 检查表结构
                result2 = connection.execute(text("SHOW CREATE TABLE cleaning_records"))
                for row in result2:
                    create_statement = row[1]
                    print(create_statement)
                    
                    # 提取cleaning_type的枚举值
                    import re
                    enum_match = re.search(r"`cleaning_type`\s+enum\(([^)]+)\)", create_statement)
                    if enum_match:
                        enum_values = enum_match.group(1)
                        print(f"\n当前枚举值: {enum_values}")
                        
                        # 检查是否包含disinfection
                        if "'disinfection'" in enum_values:
                            print("✅ 数据库已包含 'disinfection' 枚举值")
                        else:
                            print("❌ 数据库不包含 'disinfection' 枚举值")
                            print("需要更新数据库枚举定义")
                
        except Exception as e:
            print(f"检查失败: {e}")

if __name__ == "__main__":
    check_cleaning_type_enum()