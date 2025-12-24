"""
修复expenses表中剩余的中文值'繁殖鸟'
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

def fix_breeding_bird():
    """修复繁殖鸟中文值"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("修复expenses表中的'繁殖鸟'值...")
            
            # 检查当前值
            cursor.execute("SELECT COUNT(*) FROM expenses WHERE category = '繁殖鸟'")
            count_before = cursor.fetchone()[0]
            print(f"修复前'繁殖鸟'记录数: {count_before}")
            
            # 更新中文值
            cursor.execute("UPDATE expenses SET category = 'breeding_bird' WHERE category = '繁殖鸟'")
            updated_count = cursor.rowcount
            
            # 提交更改
            connection.commit()
            
            # 验证结果
            cursor.execute("SELECT COUNT(*) FROM expenses WHERE category = '繁殖鸟'")
            count_after = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM expenses WHERE category = 'breeding_bird'")
            breeding_bird_count = cursor.fetchone()[0]
            
            print(f"成功更新 {updated_count} 条记录：'繁殖鸟' → 'breeding_bird'")
            print(f"修复后'繁殖鸟'记录数: {count_after}")
            print(f"当前'breeding_bird'记录数: {breeding_bird_count}")
            
            if count_after == 0:
                print("✅ 修复成功！")
            else:
                print("❌ 仍有未修复的记录")
                
        except Exception as e:
            print(f"❌ 修复过程中出现错误: {e}")
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    fix_breeding_bird()