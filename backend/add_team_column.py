#!/usr/bin/env python3
"""
为users表添加current_team_id字段的迁移脚本
"""

from app import create_app
from models import db
from sqlalchemy import text

def add_current_team_id_column():
    """为users表添加current_team_id字段"""
    app = create_app()
    
    with app.app_context():
        try:
            # 检查字段是否已存在
            result = db.session.execute(text("SHOW COLUMNS FROM users LIKE 'current_team_id'"))
            if result.fetchone():
                print("current_team_id字段已存在")
                return
            
            # 添加字段
            db.session.execute(text("ALTER TABLE users ADD COLUMN current_team_id INT NULL"))
            db.session.commit()
            print("成功为users表添加current_team_id字段")
            
        except Exception as e:
            db.session.rollback()
            print(f"添加字段失败: {e}")

if __name__ == '__main__':
    add_current_team_id_column()