"""
检查数据库中剩余的中文枚举值
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

def check_remaining_chinese():
    """检查剩余的中文枚举值"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("检查剩余的中文枚举值...")
            print("=" * 50)
            
            # 检查 health_records 表的 record_type 字段
            print("1. 检查 health_records.record_type:")
            cursor.execute("SELECT DISTINCT record_type FROM health_records WHERE record_type IS NOT NULL")
            record_types = [row[0] for row in cursor.fetchall()]
            print(f"   当前值: {record_types}")
            
            # 检查是否有中文值
            chinese_health_types = ['体检', '疾病', '治疗', '疫苗', '体重']
            for chinese_type in chinese_health_types:
                cursor.execute("SELECT COUNT(*) FROM health_records WHERE record_type = %s", (chinese_type,))
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"   ❌ 发现 {count} 条中文值 '{chinese_type}'")
            
            # 检查 cleaning_records 表的 cleaning_type 字段
            print("\n2. 检查 cleaning_records.cleaning_type:")
            cursor.execute("SELECT DISTINCT cleaning_type FROM cleaning_records WHERE cleaning_type IS NOT NULL")
            cleaning_types = [row[0] for row in cursor.fetchall()]
            print(f"   当前值: {cleaning_types}")
            
            # 检查是否有中文值
            chinese_cleaning_types = ['笼子', '玩具', '栖木', '食物和水']
            for chinese_type in chinese_cleaning_types:
                cursor.execute("SELECT COUNT(*) FROM cleaning_records WHERE cleaning_type = %s", (chinese_type,))
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"   ❌ 发现 {count} 条中文值 '{chinese_type}'")
            
            # 检查 reminders 表的 reminder_type 字段
            print("\n3. 检查 reminders.reminder_type:")
            cursor.execute("SELECT DISTINCT reminder_type FROM reminders WHERE reminder_type IS NOT NULL")
            reminder_types = [row[0] for row in cursor.fetchall()]
            print(f"   当前值: {reminder_types}")
            
            # 检查是否有中文值
            chinese_reminder_types = ['喂食', '清洁', '体检', '用药']
            for chinese_type in chinese_reminder_types:
                cursor.execute("SELECT COUNT(*) FROM reminders WHERE reminder_type = %s", (chinese_type,))
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"   ❌ 发现 {count} 条中文值 '{chinese_type}'")
            
            # 检查 reminders 表的 frequency 字段
            print("\n4. 检查 reminders.frequency:")
            cursor.execute("SELECT DISTINCT frequency FROM reminders WHERE frequency IS NOT NULL")
            frequencies = [row[0] for row in cursor.fetchall()]
            print(f"   当前值: {frequencies}")
            
            # 检查是否有中文值
            chinese_frequencies = ['每日', '每周', '每月', '一次']
            for chinese_freq in chinese_frequencies:
                cursor.execute("SELECT COUNT(*) FROM reminders WHERE frequency = %s", (chinese_freq,))
                count = cursor.fetchone()[0]
                if count > 0:
                    print(f"   ❌ 发现 {count} 条中文值 '{chinese_freq}'")
            
            print("\n" + "=" * 50)
            print("✅ 检查完成")
                
        except Exception as e:
            print(f"❌ 检查过程中出现错误: {e}")
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    check_remaining_chinese()