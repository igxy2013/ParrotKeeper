#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
数据库迁移：
1) 创建 team_groups 表
2) 为 team_members 添加 group_id 字段
3) 为 parrots、feeding_records、health_records、cleaning_records、breeding_records、expenses、incomes 添加 group_id 字段
"""

import os
import sys
from sqlalchemy import text

# 保证能导入后端模块
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from app import create_app
from models import db

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # 1) 创建 team_groups 表（若不存在）
            create_table_sql = text(
                """
                CREATE TABLE IF NOT EXISTS team_groups (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  team_id INT NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  description VARCHAR(255) NULL,
                  permission_scope ENUM('group','team') DEFAULT 'group',
                  is_active TINYINT(1) DEFAULT 1,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                  INDEX idx_team (team_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            db.session.execute(create_table_sql)
            db.session.commit()
            print('✅ team_groups 表检查/创建完成')

            # 若已有表但缺少 permission_scope，则补齐
            try:
                check_sql = text("""
                    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'team_groups'
                      AND COLUMN_NAME = 'permission_scope'
                """)
                exists = db.session.execute(check_sql).fetchone()
                if not exists:
                    db.session.execute(text("""
                        ALTER TABLE team_groups
                        ADD COLUMN permission_scope ENUM('group','team') DEFAULT 'group'
                    """))
                    db.session.commit()
                    print('✅ 为 team_groups 添加 permission_scope 字段')
                else:
                    print('ℹ️ team_groups.permission_scope 已存在，跳过')
            except Exception as e:
                print(f'ℹ️ 检查/添加 permission_scope 字段失败: {e}')

            # 2) team_members 添加 group_id
            try:
                db.session.execute(text("ALTER TABLE team_members ADD COLUMN group_id INT NULL"))
                db.session.commit()
                print('✅ team_members.group_id 添加完成')
            except Exception as e:
                print(f'ℹ️ 跳过 team_members.group_id: {e}')

            # 3) 为业务表添加 group_id
            tables = ['parrots','feeding_records','health_records','cleaning_records','breeding_records','expenses','incomes']
            for t in tables:
                try:
                    db.session.execute(text(f"ALTER TABLE {t} ADD COLUMN group_id INT NULL"))
                    db.session.commit()
                    print(f'✅ {t}.group_id 添加完成')
                except Exception as e:
                    print(f'ℹ️ 跳过 {t}.group_id: {e}')

            print('✅ 数据库迁移完成')
            return True
        except Exception as e:
            db.session.rollback()
            print(f'❌ 迁移失败: {e}')
            return False

if __name__ == '__main__':
    migrate()
