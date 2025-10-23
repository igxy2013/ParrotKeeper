from models import db, User
from app import create_app
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    print('Current User table columns:')
    inspector = inspect(db.engine)
    try:
        columns = inspector.get_columns('users')
        for col in columns:
            print(f'- {col["name"]}: {col["type"]}')
    except Exception as e:
        print(f'Error: {e}')
        print('Table might not exist yet')