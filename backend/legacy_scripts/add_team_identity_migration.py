"""
数据库迁移脚本：为数据表添加团队标识字段
用于区分个人数据和团队数据，基于数据创建时用户的模式而非创建者身份
"""
from models import db, User, Parrot, Expense, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, Reminder
from app import create_app
from sqlalchemy import text

def add_team_identity_fields():
    """为相关数据表添加团队标识字段"""
    app = create_app()
    with app.app_context():
        print('开始添加团队标识字段...')
        
        try:
            # 为鹦鹉表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE parrots ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为parrots表添加team_id字段')
        except Exception as e:
            print(f'parrots表team_id字段可能已存在: {e}')
        
        try:
            # 为费用表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE expenses ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为expenses表添加team_id字段')
        except Exception as e:
            print(f'expenses表team_id字段可能已存在: {e}')
        
        try:
            # 为喂食记录表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE feeding_records ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为feeding_records表添加team_id字段')
        except Exception as e:
            print(f'feeding_records表team_id字段可能已存在: {e}')
        
        try:
            # 为健康记录表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE health_records ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为health_records表添加team_id字段')
        except Exception as e:
            print(f'health_records表team_id字段可能已存在: {e}')
        
        try:
            # 为清洁记录表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE cleaning_records ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为cleaning_records表添加team_id字段')
        except Exception as e:
            print(f'cleaning_records表team_id字段可能已存在: {e}')
        
        try:
            # 为繁殖记录表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE breeding_records ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为breeding_records表添加team_id字段')
        except Exception as e:
            print(f'breeding_records表team_id字段可能已存在: {e}')
        
        try:
            # 为提醒表添加团队ID字段
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE reminders ADD COLUMN team_id INT NULL'))
                conn.commit()
            print('✓ 为reminders表添加team_id字段')
        except Exception as e:
            print(f'reminders表team_id字段可能已存在: {e}')
        
        print('团队标识字段添加完成！')

def migrate_existing_data():
    """迁移现有数据，将所有现有数据标记为个人数据（team_id为NULL）"""
    app = create_app()
    with app.app_context():
        print('开始迁移现有数据...')
        
        # 现有数据默认都是个人数据，team_id保持为NULL
        # 这样可以确保现有数据在个人模式下可见，在团队模式下不可见
        
        print('现有数据迁移完成！所有现有数据默认为个人数据（team_id=NULL）')

if __name__ == '__main__':
    print('数据库迁移：添加团队标识字段')
    print('=' * 50)
    
    # 添加团队标识字段
    add_team_identity_fields()
    
    # 迁移现有数据
    migrate_existing_data()
    
    print('=' * 50)
    print('迁移完成！')
    print()
    print('说明：')
    print('- team_id为NULL：个人数据，只在个人模式下可见')
    print('- team_id为具体值：团队数据，只在对应团队模式下可见')