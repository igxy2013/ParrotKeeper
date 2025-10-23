from models import db, User
from app import create_app
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    
    # 检查所有记录表的结构
    tables_to_check = ['feeding_records', 'health_records', 'cleaning_records', 'breeding_records']
    
    for table_name in tables_to_check:
        print(f'\n{table_name.upper()} table columns:')
        try:
            columns = inspector.get_columns(table_name)
            for col in columns:
                print(f'- {col["name"]}: {col["type"]}')
        except Exception as e:
            print(f'Error: {e}')
            print(f'Table {table_name} might not exist yet')
    
    print('\nUSERS table columns:')
    try:
        columns = inspector.get_columns('users')
        for col in columns:
            print(f'- {col["name"]}: {col["type"]}')
    except Exception as e:
        print(f'Error: {e}')
        print('Table might not exist yet')