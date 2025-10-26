"""
数据库枚举值迁移脚本
将中文枚举值改回英文枚举值
"""
from flask import Flask
from models import db
from config import config
import os
import pymysql

def create_app():
    app = Flask(__name__)
    config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    db.init_app(app)
    return app

def migrate_enum_values():
    """迁移枚举值从中文到英文"""
    app = create_app()
    
    with app.app_context():
        # 获取数据库连接
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("开始迁移枚举值...")
            
            # 1. 迁移 users 表的 login_type 字段
            print("1. 迁移 users.login_type 字段...")
            cursor.execute("UPDATE users SET login_type = 'wechat' WHERE login_type = '微信'")
            cursor.execute("UPDATE users SET login_type = 'account' WHERE login_type = '账号'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 login_type 数据")
            
            # 2. 迁移 users 表的 user_mode 字段
            print("2. 迁移 users.user_mode 字段...")
            cursor.execute("UPDATE users SET user_mode = 'personal' WHERE user_mode = '个人模式'")
            cursor.execute("UPDATE users SET user_mode = 'team' WHERE user_mode = '团队模式'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 user_mode 数据")
            
            # 3. 迁移 parrots 表的 gender 字段
            print("3. 迁移 parrots.gender 字段...")
            cursor.execute("UPDATE parrots SET gender = 'male' WHERE gender = '雄性'")
            cursor.execute("UPDATE parrots SET gender = 'female' WHERE gender = '雌性'")
            cursor.execute("UPDATE parrots SET gender = 'unknown' WHERE gender = '未知'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 gender 数据")
            
            # 4. 迁移 parrots 表的 health_status 字段
            print("4. 迁移 parrots.health_status 字段...")
            cursor.execute("UPDATE parrots SET health_status = 'healthy' WHERE health_status = '健康'")
            cursor.execute("UPDATE parrots SET health_status = 'sick' WHERE health_status = '生病'")
            cursor.execute("UPDATE parrots SET health_status = 'recovering' WHERE health_status = '康复中'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 health_status 数据")
            
            # 5. 迁移 parrot_species 表的 care_level 字段
            print("5. 迁移 parrot_species.care_level 字段...")
            cursor.execute("UPDATE parrot_species SET care_level = 'easy' WHERE care_level = '简单'")
            cursor.execute("UPDATE parrot_species SET care_level = 'medium' WHERE care_level = '中等'")
            cursor.execute("UPDATE parrot_species SET care_level = 'hard' WHERE care_level = '困难'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 care_level 数据")
            
            # 6. 迁移 feed_types 表的 type 字段
            print("6. 迁移 feed_types.type 字段...")
            cursor.execute("UPDATE feed_types SET type = 'seed' WHERE type = '种子'")
            cursor.execute("UPDATE feed_types SET type = 'pellet' WHERE type = '颗粒'")
            cursor.execute("UPDATE feed_types SET type = 'fruit' WHERE type = '水果'")
            cursor.execute("UPDATE feed_types SET type = 'vegetable' WHERE type = '蔬菜'")
            cursor.execute("UPDATE feed_types SET type = 'supplement' WHERE type = '营养品'")
            cursor.execute("UPDATE feed_types SET type = 'milk_powder' WHERE type = '奶粉'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 feed_types.type 数据")
            
            # 7. 迁移 health_records 表的 record_type 字段
            print("7. 迁移 health_records.record_type 字段...")
            cursor.execute("UPDATE health_records SET record_type = 'checkup' WHERE record_type = '体检'")
            cursor.execute("UPDATE health_records SET record_type = 'illness' WHERE record_type = '疾病'")
            cursor.execute("UPDATE health_records SET record_type = 'treatment' WHERE record_type = '治疗'")
            cursor.execute("UPDATE health_records SET record_type = 'vaccination' WHERE record_type = '疫苗'")
            cursor.execute("UPDATE health_records SET record_type = 'weight' WHERE record_type = '称重'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 health_records.record_type 数据")
            
            # 8. 迁移 cleaning_records 表的 cleaning_type 字段
            print("8. 迁移 cleaning_records.cleaning_type 字段...")
            cursor.execute("UPDATE cleaning_records SET cleaning_type = 'cage' WHERE cleaning_type = '笼子'")
            cursor.execute("UPDATE cleaning_records SET cleaning_type = 'toys' WHERE cleaning_type = '玩具'")
            cursor.execute("UPDATE cleaning_records SET cleaning_type = 'perches' WHERE cleaning_type = '栖木'")
            cursor.execute("UPDATE cleaning_records SET cleaning_type = 'food_water' WHERE cleaning_type = '食水'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 cleaning_records.cleaning_type 数据")
            
            # 9. 迁移 expenses 表的 category 字段
            print("9. 迁移 expenses.category 字段...")
            cursor.execute("UPDATE expenses SET category = 'food' WHERE category = '食物'")
            cursor.execute("UPDATE expenses SET category = 'medical' WHERE category = '医疗'")
            cursor.execute("UPDATE expenses SET category = 'toys' WHERE category = '玩具'")
            cursor.execute("UPDATE expenses SET category = 'cage' WHERE category = '笼具'")
            cursor.execute("UPDATE expenses SET category = 'baby_bird' WHERE category = '幼鸟'")
            cursor.execute("UPDATE expenses SET category = 'breeding_bird' WHERE category = '种鸟'")
            cursor.execute("UPDATE expenses SET category = 'other' WHERE category = '其他'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 expenses.category 数据")
            
            # 10. 迁移 reminders 表的 reminder_type 字段
            print("10. 迁移 reminders.reminder_type 字段...")
            cursor.execute("UPDATE reminders SET reminder_type = 'feeding' WHERE reminder_type = '喂食'")
            cursor.execute("UPDATE reminders SET reminder_type = 'cleaning' WHERE reminder_type = '清洁'")
            cursor.execute("UPDATE reminders SET reminder_type = 'checkup' WHERE reminder_type = '体检'")
            cursor.execute("UPDATE reminders SET reminder_type = 'medication' WHERE reminder_type = '用药'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 reminders.reminder_type 数据")
            
            # 11. 迁移 reminders 表的 frequency 字段
            print("11. 迁移 reminders.frequency 字段...")
            cursor.execute("UPDATE reminders SET frequency = 'daily' WHERE frequency = '每日'")
            cursor.execute("UPDATE reminders SET frequency = 'weekly' WHERE frequency = '每周'")
            cursor.execute("UPDATE reminders SET frequency = 'monthly' WHERE frequency = '每月'")
            cursor.execute("UPDATE reminders SET frequency = 'once' WHERE frequency = '一次'")
            affected_rows = cursor.rowcount
            print(f"   更新了 {affected_rows} 行 reminders.frequency 数据")
            
            # 提交事务
            connection.commit()
            print("\n✅ 所有枚举值迁移完成！")
            
        except Exception as e:
            print(f"❌ 迁移过程中出现错误: {e}")
            connection.rollback()
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    migrate_enum_values()