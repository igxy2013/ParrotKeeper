from models import db, User
from app import create_app
from sqlalchemy import text

app = create_app()
with app.app_context():
    print('开始数据库迁移...')
    
    try:
        # 添加缺失的字段
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE'))
            conn.commit()
        print('✓ 添加 username 字段')
    except Exception as e:
        print(f'username 字段可能已存在: {e}')
    
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)'))
            conn.commit()
        print('✓ 添加 password_hash 字段')
    except Exception as e:
        print(f'password_hash 字段可能已存在: {e}')
    
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN login_type VARCHAR(20) DEFAULT "wechat"'))
            conn.commit()
        print('✓ 添加 login_type 字段')
    except Exception as e:
        print(f'login_type 字段可能已存在: {e}')
    
    try:
        # 修改 openid 字段为可空
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users MODIFY COLUMN openid VARCHAR(100) NULL'))
            conn.commit()
        print('✓ 修改 openid 字段为可空')
    except Exception as e:
        print(f'修改 openid 字段失败: {e}')
    
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN user_mode ENUM("personal", "team") DEFAULT "personal"'))
            conn.commit()
        print('✓ 添加 user_mode 字段')
    except Exception as e:
        print(f'user_mode 字段可能已存在: {e}')
    
    try:
        with db.engine.connect() as conn:
            conn.execute(text('ALTER TABLE users ADD COLUMN current_team_id INT NULL'))
            conn.commit()
        print('✓ 添加 current_team_id 字段')
    except Exception as e:
        print(f'current_team_id 字段可能已存在: {e}')
    
    print('数据库迁移完成！')