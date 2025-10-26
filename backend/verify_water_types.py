#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证饮用水相关清洁类型是否正确添加到数据库
"""

from app import create_app
from models import db
from sqlalchemy import text

def verify_water_cleaning_types():
    """验证饮用水相关清洁类型"""
    app = create_app()
    
    with app.app_context():
        try:
            print("=== 验证饮用水相关清洁类型 ===")
            
            # 查询 cleaning_records 表的 cleaning_type 字段定义
            result = db.session.execute(text("""
                SELECT COLUMN_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'cleaning_records' 
                AND COLUMN_NAME = 'cleaning_type'
            """)).fetchone()
            
            if result:
                column_type = result[0]
                print(f"✓ cleaning_type 字段类型: {column_type}")
                
                # 检查是否包含新的清洁类型
                required_types = ['water_change', 'water_bowl_clean']
                missing_types = []
                
                for cleaning_type in required_types:
                    if cleaning_type in column_type:
                        print(f"✓ 找到清洁类型: {cleaning_type}")
                    else:
                        print(f"✗ 缺少清洁类型: {cleaning_type}")
                        missing_types.append(cleaning_type)
                
                if not missing_types:
                    print("\n🎉 所有饮用水相关清洁类型都已正确添加到数据库！")
                    
                    # 显示完整的枚举值列表
                    print(f"\n完整的清洁类型枚举值:")
                    enum_values = column_type.replace("enum(", "").replace(")", "").replace("'", "").split(",")
                    for i, value in enumerate(enum_values, 1):
                        print(f"  {i}. {value.strip()}")
                    
                    return True
                else:
                    print(f"\n❌ 缺少以下清洁类型: {', '.join(missing_types)}")
                    return False
            else:
                print("✗ 无法获取 cleaning_type 字段信息")
                return False
                
        except Exception as e:
            print(f"✗ 验证过程中发生错误: {str(e)}")
            return False

if __name__ == "__main__":
    success = verify_water_cleaning_types()
    if success:
        print("\n✅ 数据库验证通过！饮用水更换记录功能的数据库支持已就绪。")
    else:
        print("\n❌ 数据库验证失败！")