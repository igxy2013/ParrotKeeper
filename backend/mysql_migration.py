#!/usr/bin/env python3
"""
MySQL数据库迁移脚本：为记录表添加创建者字段
"""

from models import db
from app import create_app
from sqlalchemy import text
import sys

def migrate_database():
    """执行MySQL数据库迁移"""
    app = create_app()
    
    with app.app_context():
        try:
            print("开始MySQL数据库迁移...")
            print("检查 parrot_species 表的参考体重字段...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'parrot_species' 
                AND COLUMN_NAME = 'reference_weight_g'
            """)).fetchone()
            if not result:
                print("为 parrot_species 表添加 reference_weight_g 字段...")
                db.session.execute(text("""
                    ALTER TABLE parrot_species 
                    ADD COLUMN reference_weight_g DECIMAL(6,2) NULL
                """))
            
            # 检查并添加 feeding_records 表的 created_by_user_id 字段
            print("检查 feeding_records 表...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'feeding_records' 
                AND COLUMN_NAME = 'created_by_user_id'
            """)).fetchone()
            
            if not result:
                print("为 feeding_records 表添加 created_by_user_id 字段...")
                db.session.execute(text("""
                    ALTER TABLE feeding_records 
                    ADD COLUMN created_by_user_id INT,
                    ADD FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                """))
                
                # 为现有记录设置创建者（通过鹦鹉的拥有者）
                print("更新 feeding_records 现有记录的创建者信息...")
                db.session.execute(text("""
                    UPDATE feeding_records 
                    SET created_by_user_id = (
                        SELECT user_id FROM parrots 
                        WHERE parrots.id = feeding_records.parrot_id
                    )
                    WHERE created_by_user_id IS NULL
                """))
            else:
                print("feeding_records 表已有 created_by_user_id 字段")
            
            # 检查并添加 health_records 表的 created_by_user_id 字段
            print("检查 health_records 表...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'health_records' 
                AND COLUMN_NAME = 'created_by_user_id'
            """)).fetchone()
            
            if not result:
                print("为 health_records 表添加 created_by_user_id 字段...")
                db.session.execute(text("""
                    ALTER TABLE health_records 
                    ADD COLUMN created_by_user_id INT,
                    ADD FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                """))
                
                # 为现有记录设置创建者
                print("更新 health_records 现有记录的创建者信息...")
                db.session.execute(text("""
                    UPDATE health_records 
                    SET created_by_user_id = (
                        SELECT user_id FROM parrots 
                        WHERE parrots.id = health_records.parrot_id
                    )
                    WHERE created_by_user_id IS NULL
                """))
            else:
                print("health_records 表已有 created_by_user_id 字段")
            
            # 检查并添加 cleaning_records 表的 created_by_user_id 字段
            print("检查 cleaning_records 表...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'cleaning_records' 
                AND COLUMN_NAME = 'created_by_user_id'
            """)).fetchone()
            
            if not result:
                print("为 cleaning_records 表添加 created_by_user_id 字段...")
                db.session.execute(text("""
                    ALTER TABLE cleaning_records 
                    ADD COLUMN created_by_user_id INT,
                    ADD FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                """))
                
                # 为现有记录设置创建者
                print("更新 cleaning_records 现有记录的创建者信息...")
                db.session.execute(text("""
                    UPDATE cleaning_records 
                    SET created_by_user_id = (
                        SELECT user_id FROM parrots 
                        WHERE parrots.id = cleaning_records.parrot_id
                    )
                    WHERE created_by_user_id IS NULL
                """))
            else:
                print("cleaning_records 表已有 created_by_user_id 字段")
            
            # 检查并添加 breeding_records 表的 created_by_user_id 字段
            print("检查 breeding_records 表...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'breeding_records' 
                AND COLUMN_NAME = 'created_by_user_id'
            """)).fetchone()
            
            if not result:
                print("为 breeding_records 表添加 created_by_user_id 字段...")
                db.session.execute(text("""
                    ALTER TABLE breeding_records 
                    ADD COLUMN created_by_user_id INT,
                    ADD FOREIGN KEY (created_by_user_id) REFERENCES users(id)
                """))
                
                # 为现有记录设置创建者
                print("更新 breeding_records 现有记录的创建者信息...")
                db.session.execute(text("""
                    UPDATE breeding_records 
                    SET created_by_user_id = (
                        SELECT user_id FROM parrots 
                        WHERE parrots.id = breeding_records.male_parrot_id
                    )
                    WHERE created_by_user_id IS NULL
                """))
            else:
                print("breeding_records 表已有 created_by_user_id 字段")
            print("检查 feed_types 表的 unit 字段...")
            result = db.session.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'feed_types' 
                AND COLUMN_NAME = 'unit'
            """)).fetchone()
            if not result:
                print("为 feed_types 表添加 unit 字段...")
                db.session.execute(text("""
                    ALTER TABLE feed_types 
                    ADD COLUMN unit ENUM('g','ml') DEFAULT 'g'
                """))
            
            db.session.commit()
            print("MySQL数据库迁移完成！")
            
        except Exception as e:
            db.session.rollback()
            print(f"迁移失败: {e}")
            sys.exit(1)

if __name__ == '__main__':
    migrate_database()
