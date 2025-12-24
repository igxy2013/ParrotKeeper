from flask import Flask
from sqlalchemy import text, create_engine
from config import config
import os

def migrate():
    app = Flask(__name__)
    env = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[env])
    uri = app.config['SQLALCHEMY_DATABASE_URI']
    engine = create_engine(uri)

    with engine.connect() as conn:
        # 检查列是否已存在
        check_sql = text("""
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'parrots'
              AND COLUMN_NAME = 'plumage_splits_json'
        """)
        result = conn.execute(check_sql).fetchone()
        if result:
            print('parrots.plumage_splits_json 已存在，跳过迁移')
            return
        print('为 parrots 表添加 plumage_splits_json 字段...')
        conn.execute(text("""
            ALTER TABLE parrots ADD COLUMN plumage_splits_json TEXT NULL
        """))
        conn.commit()
        print('迁移完成')

if __name__ == '__main__':
    migrate()
