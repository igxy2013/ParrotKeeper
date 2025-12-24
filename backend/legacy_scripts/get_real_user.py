#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, User

def get_real_users():
    """获取数据库中真实存在的用户"""
    with app.app_context():
        print("=== 数据库中的真实用户 ===")
        
        # 获取所有用户
        users = User.query.all()
        
        if not users:
            print("数据库中没有用户")
            return
        
        print(f"总共找到 {len(users)} 个用户:")
        
        for user in users:
            print(f"ID: {user.id}")
            print(f"OpenID: {user.openid}")
            print(f"昵称: {user.nickname}")
            print(f"登录类型: {user.login_type}")
            print(f"创建时间: {user.created_at}")
            print("-" * 40)

if __name__ == "__main__":
    get_real_users()