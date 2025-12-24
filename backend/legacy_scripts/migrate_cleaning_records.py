"""
补充迁移脚本：处理cleaning_records表中的中文枚举值
"""
from flask import Flask
from models import db
from config import config
import os

def create_app():
    app = Flask(__name__)
    config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    db.init_app(app)
    return app

def migrate_cleaning_records():
    """迁移cleaning_records表中的中文枚举值"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("开始迁移cleaning_records表中的中文枚举值...")
            print("=" * 50)
            
            # 检查当前的cleaning_type值
            cursor.execute("SELECT DISTINCT cleaning_type FROM cleaning_records WHERE cleaning_type IS NOT NULL")
            current_types = [row[0] for row in cursor.fetchall()]
            print(f"当前cleaning_type值: {current_types}")
            
            # 迁移中文值到英文
            migrations = [
                ('笼子清洁', 'cage'),
                ('玩具清洁', 'toys'),
                ('栖木清洁', 'perches'),
                ('食物和水清洁', 'food_water'),
                # 处理可能的其他变体
                ('笼子', 'cage'),
                ('玩具', 'toys'),
                ('栖木', 'perches'),
                ('食物和水', 'food_water')
            ]
            
            total_updated = 0
            for chinese_value, english_value in migrations:
                cursor.execute("UPDATE cleaning_records SET cleaning_type = %s WHERE cleaning_type = %s", 
                             (english_value, chinese_value))
                updated_count = cursor.rowcount
                if updated_count > 0:
                    print(f"   '{chinese_value}' → '{english_value}': {updated_count} 条记录")
                    total_updated += updated_count
            
            # 提交更改
            connection.commit()
            
            # 验证迁移结果
            print("\n验证迁移结果:")
            cursor.execute("SELECT DISTINCT cleaning_type FROM cleaning_records WHERE cleaning_type IS NOT NULL")
            final_types = [row[0] for row in cursor.fetchall()]
            print(f"迁移后cleaning_type值: {final_types}")
            
            # 检查是否还有中文值
            chinese_patterns = ['清洁', '笼子', '玩具', '栖木', '食物', '水']
            remaining_chinese = []
            for pattern in chinese_patterns:
                cursor.execute("SELECT COUNT(*) FROM cleaning_records WHERE cleaning_type LIKE %s", (f'%{pattern}%',))
                count = cursor.fetchone()[0]
                if count > 0:
                    remaining_chinese.append(f"{pattern}: {count}条")
            
            print("\n" + "=" * 50)
            if remaining_chinese:
                print(f"❌ 仍有中文值: {', '.join(remaining_chinese)}")
            else:
                print(f"✅ 迁移完成！共更新 {total_updated} 条记录")
                print("✅ 所有cleaning_type值已成功迁移为英文")
                
        except Exception as e:
            print(f"❌ 迁移过程中出现错误: {e}")
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    migrate_cleaning_records()