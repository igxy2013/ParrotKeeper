#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
添加团队头像字段的数据库迁移脚本
"""

from flask import Flask
from models import db
from team_models import Team
import sys
import os

# 将项目根目录添加到Python路径中
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    app = Flask(__name__)
    
    # 数据库配置 - 需要根据实际环境调整
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:password@localhost/parrotkeeper'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        try:
            # 添加avatar_url字段到teams表
            db.engine.execute('ALTER TABLE teams ADD COLUMN avatar_url VARCHAR(255)')
            print("✅ 成功添加avatar_url字段到teams表")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("⚠️  avatar_url字段已存在，跳过添加")
            else:
                print(f"❌ 添加avatar_url字段时出错: {e}")
                return False
        
        # 更新团队信息接口以返回avatar_url字段
        print("✅ 数据库迁移完成")
        return True

if __name__ == '__main__':
    migrate()