#!/usr/bin/env python3
"""
为users表添加role字段的迁移脚本
角色枚举：super_admin、admin、user；默认值为user
"""

from app import create_app
from models import db
from sqlalchemy import text

def add_user_role_column():
    """为users表添加role字段"""
    app = create_app()
    with app.app_context():
        try:
            # 检查字段是否已存在
            result = db.session.execute(text("SHOW COLUMNS FROM users LIKE 'role'"))
            if result.fetchone():
                print("role字段已存在")
                return

            # 添加字段为ENUM，并设置默认值
            db.session.execute(text(
                """
                ALTER TABLE users 
                ADD COLUMN role ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user'
                """
            ))

            # 将现有记录的role统一设为'user'
            db.session.execute(text("UPDATE users SET role='user' WHERE role IS NULL"))
            db.session.commit()
            print("成功为users表添加role字段，并初始化为'user'")
        
        except Exception as e:
            db.session.rollback()
            print(f"添加role字段失败: {e}")

if __name__ == '__main__':
    add_user_role_column()

