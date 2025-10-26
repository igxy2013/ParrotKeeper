"""
最终验证脚本：检查所有表的枚举字段是否已完全迁移为英文
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

def final_verification():
    """最终验证所有枚举字段"""
    app = create_app()
    
    with app.app_context():
        connection = db.engine.raw_connection()
        cursor = connection.cursor()
        
        try:
            print("最终验证所有枚举字段迁移结果...")
            print("=" * 60)
            
            # 定义所有需要检查的表和字段
            enum_fields = [
                # 表名, 字段名, 预期英文值, 可能的中文值
                ('users', 'login_type', ['wechat', 'account'], ['微信', '账号']),
                ('users', 'user_mode', ['personal', 'team'], ['个人模式', '团队模式']),
                ('parrots', 'gender', ['male', 'female', 'unknown'], ['雄性', '雌性', '未知']),
                ('parrots', 'health_status', ['healthy', 'sick', 'recovering'], ['健康', '生病', '康复中']),
                ('parrot_species', 'care_level', ['easy', 'medium', 'hard'], ['简单', '中等', '困难']),
                ('feed_types', 'type', ['seed', 'pellet', 'fruit', 'vegetable', 'supplement', 'milk_powder'], 
                 ['种子', '颗粒', '水果', '蔬菜', '营养品', '奶粉']),
                ('health_records', 'record_type', ['checkup', 'illness', 'treatment', 'vaccination', 'weight'], 
                 ['体检', '疾病', '治疗', '疫苗', '体重']),
                ('cleaning_records', 'cleaning_type', ['cage', 'toys', 'perches', 'food_water'], 
                 ['笼子', '玩具', '栖木', '食物和水', '笼子清洁', '玩具清洁', '栖木清洁', '食物和水清洁']),
                ('expenses', 'category', ['food', 'medical', 'toys', 'cage', 'baby_bird', 'breeding_bird', 'other'], 
                 ['食物', '医疗', '玩具', '笼具', '幼鸟', '种鸟', '其他']),
                ('reminders', 'reminder_type', ['feeding', 'cleaning', 'checkup', 'medication'], 
                 ['喂食', '清洁', '体检', '用药']),
                ('reminders', 'frequency', ['daily', 'weekly', 'monthly', 'once'], 
                 ['每日', '每周', '每月', '一次'])
            ]
            
            all_passed = True
            
            for table, field, expected_english, possible_chinese in enum_fields:
                print(f"\n{table}.{field}:")
                
                # 获取当前实际值
                try:
                    cursor.execute(f"SELECT DISTINCT {field} FROM {table} WHERE {field} IS NOT NULL")
                    actual_values = [row[0] for row in cursor.fetchall()]
                    print(f"   当前值: {actual_values}")
                    
                    # 检查是否还有中文值
                    chinese_found = []
                    for chinese_value in possible_chinese:
                        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE {field} = %s", (chinese_value,))
                        count = cursor.fetchone()[0]
                        if count > 0:
                            chinese_found.append(f"'{chinese_value}': {count}条")
                    
                    if chinese_found:
                        print(f"   ❌ 仍有中文值: {', '.join(chinese_found)}")
                        all_passed = False
                    else:
                        # 检查是否所有值都是预期的英文值
                        unexpected_values = [v for v in actual_values if v not in expected_english]
                        if unexpected_values:
                            print(f"   ⚠️  发现非预期值: {unexpected_values}")
                        else:
                            print(f"   ✅ 所有值均为英文: {actual_values}")
                            
                except Exception as e:
                    print(f"   ❌ 检查失败: {e}")
                    all_passed = False
            
            print("\n" + "=" * 60)
            if all_passed:
                print("🎉 最终验证通过！所有枚举字段已成功迁移为英文")
                print("✅ 数据库枚举值与models.py中的定义完全一致")
            else:
                print("❌ 最终验证失败！仍有部分字段需要处理")
                
        except Exception as e:
            print(f"❌ 验证过程中出现错误: {e}")
            raise
        finally:
            cursor.close()
            connection.close()

if __name__ == '__main__':
    final_verification()