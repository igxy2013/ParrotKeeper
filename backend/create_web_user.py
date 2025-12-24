from app import create_app
from models import db, User
from werkzeug.security import generate_password_hash
import sys

def create_web_user(username, password, nickname='Web Admin'):
    app = create_app('default')
    with app.app_context():
        # Check if user exists
        user = User.query.filter_by(username=username).first()
        if user:
            print(f"User {username} already exists.")
            # Update password if exists
            user.password_hash = generate_password_hash(password)
            user.login_type = 'account'
            db.session.commit()
            print(f"Updated password for {username}")
            return

        user = User(
            username=username,
            password_hash=generate_password_hash(password),
            nickname=nickname,
            login_type='account',
            role='super_admin', # Give admin rights
            user_mode='personal'
        )
        db.session.add(user)
        db.session.commit()
        print(f"Created web user: {username}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python create_web_user.py <username> <password> [nickname]")
        sys.exit(1)
    
    username = sys.argv[1]
    password = sys.argv[2]
    nickname = sys.argv[3] if len(sys.argv) > 3 else 'Web Admin'
    
    create_web_user(username, password, nickname)
