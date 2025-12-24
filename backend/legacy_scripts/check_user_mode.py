from flask import Flask
from models import db, User
from config import config
import os

def create_app():
    app = Flask(__name__)
    config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    db.init_app(app)
    return app

if __name__ == '__main__':
    app = create_app()
    
    with app.app_context():
        users = User.query.all()
        print('当前数据库中的user_mode值:')
        for user in users:
            print(f'用户ID: {user.id}, user_mode: {user.user_mode}')
        
        # 统计各种模式的用户数量
        personal_count = User.query.filter_by(user_mode='personal').count()
        team_count = User.query.filter_by(user_mode='team').count()
        chinese_personal_count = User.query.filter_by(user_mode='个人模式').count()
        chinese_team_count = User.query.filter_by(user_mode='团队模式').count()
        
        print(f'\n统计结果:')
        print(f'personal模式用户: {personal_count}')
        print(f'team模式用户: {team_count}')
        print(f'个人模式用户: {chinese_personal_count}')
        print(f'团队模式用户: {chinese_team_count}')