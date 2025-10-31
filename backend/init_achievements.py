#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
初始化成就数据脚本
"""

from app import create_app
from models import db, Achievement

def init_achievements():
    """初始化成就数据"""
    app = create_app()
    
    with app.app_context():
        # 检查是否已经有成就数据
        if Achievement.query.count() > 0:
            print("成就数据已存在，跳过初始化")
            return
        
        # 创建默认成就
        achievements = [
            {
                'key': 'novice',
                'title': '新手上路',
                'description': '添加第一只鹦鹉',
                'icon': 'star',
                'color': 'green',
                'condition_type': 'parrot_count',
                'target_value': 1
            },
            {
                'key': 'caring_feeder',
                'title': '爱心饲养员',
                'description': '完成10次喂食记录',
                'icon': 'heart',
                'color': 'red',
                'condition_type': 'feeding_count',
                'target_value': 10
            },
            {
                'key': 'health_guardian',
                'title': '健康守护者',
                'description': '完成5次健康检查',
                'icon': 'shield',
                'color': 'orange',
                'condition_type': 'health_check_count',
                'target_value': 5
            },
            {
                'key': 'data_analyst',
                'title': '数据分析师',
                'description': '查看统计数据超过50次',
                'icon': 'bar-chart',
                'color': 'blue',
                'condition_type': 'stats_view_count',
                'target_value': 50
            }
        ]
        
        for achievement_data in achievements:
            achievement = Achievement(**achievement_data)
            db.session.add(achievement)
        
        db.session.commit()
        print(f"成功初始化 {len(achievements)} 个成就")

if __name__ == '__main__':
    init_achievements()