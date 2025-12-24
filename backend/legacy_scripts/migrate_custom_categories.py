from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def migrate():
    with app.app_context():
        # 1. Add user_id to feed_types
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE feed_types ADD COLUMN user_id INT DEFAULT NULL"))
                conn.execute(text("ALTER TABLE feed_types ADD CONSTRAINT fk_feed_types_user FOREIGN KEY (user_id) REFERENCES users(id)"))
                conn.commit()
                print("Added user_id to feed_types")
        except Exception as e:
            print(f"Error altering feed_types (might already exist): {e}")

        # 2. Change category column in expenses and incomes
        try:
            with db.engine.connect() as conn:
                # Modify expenses.category
                conn.execute(text("ALTER TABLE expenses MODIFY COLUMN category VARCHAR(50)"))
                # Modify incomes.category
                conn.execute(text("ALTER TABLE incomes MODIFY COLUMN category VARCHAR(50)"))
                conn.commit()
                print("Modified expenses.category and incomes.category to VARCHAR(50)")
        except Exception as e:
            print(f"Error altering expenses/incomes: {e}")

        # 3. Create transaction_categories table
        try:
            with db.engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS transaction_categories (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NULL,
                        type ENUM('expense', 'income') NOT NULL,
                        name VARCHAR(50) NOT NULL,
                        icon VARCHAR(50),
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                """))
                conn.commit()
                print("Created transaction_categories table")
        except Exception as e:
            print(f"Error creating transaction_categories: {e}")

        # 4. Populate default categories
        # Expense categories: 'food', 'medical', 'toys', 'cage', 'baby_bird', 'breeding_bird', 'other'
        # Income categories: 'breeding_sale', 'bird_sale', 'service', 'competition', 'other'
        default_expenses = [
            ('food', 'food'), 
            ('medical', 'medical'), 
            ('toys', 'toys'), 
            ('cage', 'cage'), 
            ('baby_bird', 'baby_bird'), 
            ('breeding_bird', 'breeding_bird'), 
            ('other', 'other')
        ]
        default_incomes = [
            ('breeding_sale', 'breeding_sale'), 
            ('bird_sale', 'bird_sale'), 
            ('service', 'service'), 
            ('competition', 'competition'), 
            ('other', 'other')
        ]
        
        # Insert defaults if not exist (user_id is NULL)
        try:
            with db.engine.connect() as conn:
                for key, name in default_expenses:
                    # Check if exists
                    res = conn.execute(text("SELECT id FROM transaction_categories WHERE type='expense' AND name=:name AND user_id IS NULL"), {'name': key})
                    if not res.first():
                         conn.execute(text("INSERT INTO transaction_categories (user_id, type, name, icon) VALUES (NULL, 'expense', :name, NULL)"), {'name': key})
                
                for key, name in default_incomes:
                    res = conn.execute(text("SELECT id FROM transaction_categories WHERE type='income' AND name=:name AND user_id IS NULL"), {'name': key})
                    if not res.first():
                         conn.execute(text("INSERT INTO transaction_categories (user_id, type, name, icon) VALUES (NULL, 'income', :name, NULL)"), {'name': key})
                conn.commit()
                print("Populated default transaction categories")
        except Exception as e:
            print(f"Error populating defaults: {e}")

if __name__ == '__main__':
    migrate()
