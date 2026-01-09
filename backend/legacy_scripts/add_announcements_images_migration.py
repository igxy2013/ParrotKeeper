import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import db
from sqlalchemy import text
from app import create_app

def upgrade():
    app = create_app()
    with app.app_context():
        try:
            db.session.execute(text('ALTER TABLE announcements ADD COLUMN image_urls TEXT'))
            db.session.commit()
            print('迁移完成：已添加 announcements.image_urls 字段')
        except Exception as e:
            db.session.rollback()
            print(f'迁移警告或失败：{e}')

def downgrade():
    app = create_app()
    with app.app_context():
        try:
            print('不支持自动回滚删除列。若需回滚请手动处理。')
        except Exception as e:
            print(f'回滚失败：{e}')

if __name__ == '__main__':
    upgrade()
