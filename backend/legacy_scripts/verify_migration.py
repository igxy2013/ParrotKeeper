"""
验证数据库迁移结果
检查所有枚举字段是否已正确迁移为英文值
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

def verify_migration():
    """验证迁移结果"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("验证数据库迁移结果...")
            print("=" * 50)
            
            # 1. 检查 users 表
            print("1. 检查 users 表:")
            cursor.execute("SELECT DISTINCT login_type FROM users")
            login_types = [row[0] for row in cursor.fetchall()]
            print(f"   login_type 值: {login_types}")
            
            cursor.execute("SELECT DISTINCT user_mode FROM users")
            user_modes = [row[0] for row in cursor.fetchall()]
            print(f"   user_mode 值: {user_modes}")
            
            # 2. 检查 parrots 表
            print("\n2. 检查 parrots 表:")
            cursor.execute("SELECT DISTINCT gender FROM parrots WHERE gender IS NOT NULL")
            genders = [row[0] for row in cursor.fetchall()]
            print(f"   gender 值: {genders}")
            
            cursor.execute("SELECT DISTINCT health_status FROM parrots WHERE health_status IS NOT NULL")
            health_statuses = [row[0] for row in cursor.fetchall()]
            print(f"   health_status 值: {health_statuses}")
            
            # 3. 检查 parrot_species 表
            print("\n3. 检查 parrot_species 表:")
            cursor.execute("SELECT DISTINCT care_level FROM parrot_species WHERE care_level IS NOT NULL")
            care_levels = [row[0] for row in cursor.fetchall()]
            print(f"   care_level 值: {care_levels}")
            
            # 4. 检查 feed_types 表
            print("\n4. 检查 feed_types 表:")
            cursor.execute("SELECT DISTINCT type FROM feed_types WHERE type IS NOT NULL")
            feed_types = [row[0] for row in cursor.fetchall()]
            print(f"   type 值: {feed_types}")
            
            # 5. 检查 expenses 表
            print("\n5. 检查 expenses 表:")
            cursor.execute("SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL")
            categories = [row[0] for row in cursor.fetchall()]
            print(f"   category 值: {categories}")
            
            # 6. 检查是否还有中文值
            print("\n6. 检查是否还有中文枚举值:")
            chinese_found = False
            
            # 检查各个表是否还有中文值
            tables_to_check = [
                ("users", "login_type", ["微信", "账号"]),
                ("users", "user_mode", ["个人模式", "团队模式"]),
                ("parrots", "gender", ["雄性", "雌性", "未知"]),
                ("parrots", "health_status", ["健康", "生病", "康复中"]),
                ("parrot_species", "care_level", ["简单", "中等", "困难"]),
                ("feed_types", "type", ["种子", "颗粒", "水果", "蔬菜", "营养品", "奶粉"]),
                ("expenses", "category", ["食物", "医疗", "玩具", "笼具", "幼鸟", "种鸟", "其他"])
            ]
            
            for table, column, chinese_values in tables_to_check:
                for value in chinese_values:
                    cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {column} = %s", (value,))
                    count = cursor.fetchone()[0]
                    if count > 0:
                        print(f"   ❌ {table}.{column} 仍有 {count} 条中文值 '{value}'")
                        chinese_found = True
            
            if not chinese_found:
                print("   ✅ 未发现中文枚举值")
            
            print("\n" + "=" * 50)
            if chinese_found:
                print("❌ 迁移验证失败：仍有中文枚举值存在")
            else:
                print("✅ 迁移验证成功：所有枚举值已成功迁移为英文")
                
        except Exception as e:
            print(f"❌ 验证过程中出现错误: {e}")
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    verify_migration()