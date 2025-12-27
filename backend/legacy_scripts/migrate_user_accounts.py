import os
import sys
from flask import Flask
from models import db, User, UserAccount
from sqlalchemy import text

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config

def migrate():
    app = Flask(__name__)
    config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    db.init_app(app)

    with app.app_context():
        # 1. Create user_accounts table
        print("Creating user_accounts table...")
        db.create_all() # This will create UserAccount table if not exists

        # 2. Migrate data
        print("Migrating data from users to user_accounts...")
        # Check if username/password columns still exist in users table (via raw SQL to be safe)
        # We can try to select them.
        try:
            conn = db.engine.connect()
            # Fetch users with username
            result = conn.execute(text("SELECT id, username, password_hash FROM users WHERE username IS NOT NULL"))
            
            for row in result:
                user_id = row[0]
                username = row[1]
                password_hash = row[2]
                
                if username and password_hash:
                    # Check if already exists
                    existing = UserAccount.query.filter_by(username=username).first()
                    if not existing:
                        print(f"Migrating user {username} (id={user_id})")
                        account = UserAccount(
                            user_id=user_id,
                            username=username,
                            password_hash=password_hash
                        )
                        db.session.add(account)
            
            db.session.commit()
            print("Data migration complete.")
            
            # 3. Drop columns from users table
            # SQLite does not support DROP COLUMN easily. MySQL does.
            # Assuming MySQL since user said "mysql数据库".
            print("Dropping columns from users table...")
            conn.execute(text("ALTER TABLE users DROP COLUMN username"))
            conn.execute(text("ALTER TABLE users DROP COLUMN password_hash"))
            conn.commit()
            conn.close()
            print("Columns dropped.")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            # db.session.rollback()

if __name__ == '__main__':
    migrate()
