#!/usr/bin/env python3
"""
为users表添加积分相关字段的迁移脚本
- points: 用户积分，默认值为0
- last_checkin_date: 最后签到日期，用于每日签到判断
"""

from app import create_app
from models import db
from sqlalchemy import text

def add_user_points_fields():
    """为users表添加积分相关字段"""
    app = create_app()
    with app.app_context():
        try:
            # 检查数据库类型（SQLite或MySQL）
            is_sqlite = db.engine.dialect.name == 'sqlite'
            
            if is_sqlite:
                # SQLite：使用PRAGMA table_info检查字段
                result = db.session.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
            else:
                # MySQL：使用SHOW COLUMNS检查字段
                result = db.session.execute(text("SHOW COLUMNS FROM users"))
                columns = [row[0] for row in result.fetchall()]
            
            if 'points' not in columns:
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0"
                ))
                print("成功为users表添加points字段")
            else:
                print("points字段已存在")

            if 'last_checkin_date' not in columns:
                db.session.execute(text(
                    "ALTER TABLE users ADD COLUMN last_checkin_date DATE"
                ))
                print("成功为users表添加last_checkin_date字段")
            else:
                print("last_checkin_date字段已存在")

            # 将现有记录的points初始化为0（如果为NULL）
            db.session.execute(text("UPDATE users SET points=0 WHERE points IS NULL"))
            
            db.session.commit()
            print("积分字段迁移完成")
        
        except Exception as e:
            db.session.rollback()
            print(f"添加积分字段失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    add_user_points_fields()

