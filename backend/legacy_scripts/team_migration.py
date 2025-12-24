#!/usr/bin/env python3
"""
团队功能数据库迁移脚本
添加团队相关的表和字段
"""

from models import db, User, Parrot, Expense, Reminder
from team_models import Team, TeamMember, TeamParrot, TeamInvitation
from app import create_app
import random
import string

def generate_invite_code(length=8):
    """生成邀请码"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def migrate_team_tables():
    """创建团队相关表"""
    app = create_app()
    
    with app.app_context():
        try:
            print("开始创建团队相关表...")
            
            # 创建团队相关表
            db.create_all()
            
            print("✅ 团队相关表创建成功！")
            
            # 检查表是否创建成功
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            team_tables = ['teams', 'team_members', 'team_parrots', 'team_invitations']
            for table in team_tables:
                if table in tables:
                    print(f"✅ 表 {table} 创建成功")
                    columns = inspector.get_columns(table)
                    for col in columns:
                        print(f"   - {col['name']}: {col['type']}")
                else:
                    print(f"❌ 表 {table} 创建失败")
            
            print("\n团队功能数据库迁移完成！")
            
        except Exception as e:
            print(f"❌ 迁移失败: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    migrate_team_tables()