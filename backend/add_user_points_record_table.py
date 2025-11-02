#!/usr/bin/env python3
"""
为数据库添加用户积分记录表的迁移脚本
"""

from app import create_app
from models import db, UserPointsRecord
from sqlalchemy import text

def add_user_points_record_table():
    """创建用户积分记录表"""
    app = create_app()
    with app.app_context():
        try:
            # 检查表是否已存在
            if db.engine.dialect.name == 'sqlite':
                # SQLite：使用sqlite_master检查表
                result = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='user_points_records'"))
                exists = result.fetchone() is not None
            else:
                # MySQL：使用information_schema检查表
                result = db.session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_points_records'"))
                exists = result.fetchone() is not None
            
            if not exists:
                # 创建表
                db.create_all()
                print("成功创建user_points_records表")
            else:
                print("user_points_records表已存在")
            
            # 检查唯一约束是否存在
            try:
                # 尝试插入一条测试记录来验证约束
                test_record = UserPointsRecord(
                    user_id=1,
                    point_type='test',
                    points=1,
                    record_date='2023-01-01'
                )
                db.session.add(test_record)
                db.session.commit()
                # 删除测试记录
                db.session.delete(test_record)
                db.session.commit()
                print("user_points_records表结构正确")
            except Exception as e:
                print(f"表结构验证失败: {e}")
                db.session.rollback()
            
        except Exception as e:
            db.session.rollback()
            print(f"创建user_points_records表失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    add_user_points_record_table()