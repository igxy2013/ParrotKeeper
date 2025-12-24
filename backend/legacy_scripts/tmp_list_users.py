from app import create_app
from models import db, User

def main():
    app = create_app()
    with app.app_context():
        users = User.query.limit(10).all()
        for u in users:
            print(f"id={u.id}, openid={u.openid}, login_type={u.login_type}, points={u.points}")

if __name__ == "__main__":
    main()
