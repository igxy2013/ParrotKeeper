from models import db
from app import create_app
from sqlalchemy import text

"""
向 health_records 表新增 notes 字段（TEXT，用于存储备注）。
"""

def upgrade():
    app = create_app()
    with app.app_context():
        try:
            db.session.execute(text('ALTER TABLE health_records ADD COLUMN notes TEXT'))
            db.session.commit()
            print('迁移完成：已添加 health_records.notes 字段')
        except Exception as e:
            db.session.rollback()
            print(f'迁移警告或失败：{e}')

if __name__ == '__main__':
    upgrade()



