#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
为 teams 表添加 subscription_level 字段（ENUM('basic','advanced')，默认 'basic'）
"""

from flask import Flask
from sqlalchemy import text
import os
import sys

# 将后端目录加入 Python 路径，确保可以导入 app 和 models
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from app import create_app
from models import db

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # 检查字段是否已存在
            check_sql = text(
                """
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'teams'
                  AND COLUMN_NAME = 'subscription_level'
                """
            )
            exists = db.session.execute(check_sql).fetchone()
            if exists:
                print("subscription_level 字段已存在，跳过迁移")
                return True

            # 添加字段
            alter_sql = text(
                """
                ALTER TABLE teams
                ADD COLUMN subscription_level ENUM('basic','advanced') DEFAULT 'basic'
                """
            )
            db.session.execute(alter_sql)
            db.session.commit()
            print("✅ 成功为 teams 表添加 subscription_level 字段")
            return True
        except Exception as e:
            db.session.rollback()
            print(f"❌ 迁移失败: {e}")
            return False

if __name__ == '__main__':
    migrate()
