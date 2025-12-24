from models import db
from sqlalchemy import text
from app import create_app

"""
向 health_records 表新增 image_urls 字段（TEXT，用于存储JSON数组的记录照片URL）。
运行方式：在已激活的虚拟环境中执行此脚本，或合并到你的统一迁移流程。
"""

def upgrade():
    app = create_app()
    with app.app_context():
        try:
            db.session.execute(text('ALTER TABLE health_records ADD COLUMN image_urls TEXT'))
            db.session.commit()
            print('迁移完成：已添加 health_records.image_urls 字段')
        except Exception as e:
            db.session.rollback()
            # 若字段已存在（如 Duplicate column）则忽略
            print(f'迁移警告或失败：{e}')

def downgrade():
    app = create_app()
    with app.app_context():
        try:
            # SQLite/MySQL 回滚删除列需更复杂操作，保留占位
            print('不支持自动回滚删除列。若需回滚请手动处理。')
        except Exception as e:
            print(f'回滚失败：{e}')

if __name__ == '__main__':
    upgrade()


