from models import db, Achievement, UserAchievement, UserStatistics
from app import create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    print('开始成就系统数据库迁移...')
    
    # 创建成就相关表
    try:
        db.create_all()
        print('✓ 创建成就相关数据表')
    except Exception as e:
        print(f'创建表失败: {e}')
    
    # 初始化成就数据
    try:
        # 检查是否已有成就数据
        existing_count = Achievement.query.count()
        if existing_count > 0:
            print(f'成就数据已存在 ({existing_count} 个成就)')
        else:
            # 添加默认成就
            achievements = [
                {
                    'key': 'novice',
                    'title': '新手上路',
                    'description': '成功添加第一只鹦鹉',
                    'icon': '🏆',
                    'color': 'bg-yellow',
                    'condition_type': 'parrot_count',
                    'target_value': 1
                },
                {
                    'key': 'caring_feeder',
                    'title': '爱心饲养员',
                    'description': '完成30次喂食记录',
                    'icon': '❤️',
                    'color': 'bg-red',
                    'condition_type': 'feeding_count',
                    'target_value': 30
                },
                {
                    'key': 'health_guardian',
                    'title': '健康守护者',
                    'description': '完成10次健康检查',
                    'icon': '🛡️',
                    'color': 'bg-green',
                    'condition_type': 'health_check_count',
                    'target_value': 10
                },
                {
                    'key': 'data_analyst',
                    'title': '数据分析师',
                    'description': '查看统计数据超过50次',
                    'icon': '📊',
                    'color': 'bg-blue',
                    'condition_type': 'stats_view_count',
                    'target_value': 50
                }
            ]
            
            for achievement_data in achievements:
                achievement = Achievement(**achievement_data)
                db.session.add(achievement)
            
            db.session.commit()
            print(f'✓ 添加了 {len(achievements)} 个默认成就')
    
    except Exception as e:
        print(f'初始化成就数据失败: {e}')
        db.session.rollback()
    
    print('成就系统数据库迁移完成！')