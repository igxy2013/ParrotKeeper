#!/usr/bin/env python3
"""
为现有users表添加积分相关字段的更新脚本
"""

from app import create_app
from models import db
from sqlalchemy import text

def update_users_table():
    """为现有users表添加积分相关字段"""
    app = create_app()
    with app.app_context():
        try:
            # 检查数据库类型
            is_sqlite = db.engine.dialect.name == 'sqlite'
            
            # 检查points字段是否存在
            if is_sqlite:
                result = db.session.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
            else:
                result = db.session.execute(text("SHOW COLUMNS FROM users"))
                columns = [row[0] for row in result.fetchall()]
            
            # 添加points字段（如果不存在）
            if 'points' not in columns:
                if is_sqlite:
                    db.session.execute(text("ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0"))
                else:
                    db.session.execute(text("ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0"))
                print("成功为users表添加points字段")
            else:
                print("points字段已存在")
            
            # 添加last_checkin_date字段（如果不存在）
            if 'last_checkin_date' not in columns:
                if is_sqlite:
                    db.session.execute(text("ALTER TABLE users ADD COLUMN last_checkin_date DATE"))
                else:
                    db.session.execute(text("ALTER TABLE users ADD COLUMN last_checkin_date DATE"))
                print("成功为users表添加last_checkin_date字段")
            else:
                print("last_checkin_date字段已存在")
            
            # 初始化现有用户的积分
            db.session.execute(text("UPDATE users SET points=0 WHERE points IS NULL"))
            
            # 提交更改
            db.session.commit()
            print("users表更新完成")
            
        except Exception as e:
            db.session.rollback()
            print(f"更新users表失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    update_users_table()