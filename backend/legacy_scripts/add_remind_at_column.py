from sqlalchemy.sql import text
from app import create_app
from models import db


def main():
    app = create_app()
    with app.app_context():
        try:
            # 检查 reminders 表是否存在 remind_at 列
            result = db.session.execute(text(
                """
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'reminders' 
                  AND COLUMN_NAME = 'remind_at'
                """
            )).fetchone()

            if result:
                print("reminders.remind_at 已存在，无需变更")
                return

            # 添加 remind_at 列（兼容旧数据，允许为 NULL）
            db.session.execute(text("ALTER TABLE reminders ADD COLUMN remind_at DATETIME NULL"))
            db.session.commit()
            print("已为 reminders 表添加 remind_at 列")
        except Exception as e:
            db.session.rollback()
            print(f"添加 remind_at 列失败: {str(e)}")


if __name__ == '__main__':
    main()

