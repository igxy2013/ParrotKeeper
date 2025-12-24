import os
from flask import Flask
from sqlalchemy import create_engine, text
from config import config

def migrate():
    app = Flask(__name__)
    env = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[env])

    uri = app.config['SQLALCHEMY_DATABASE_URI']
    engine = create_engine(uri)

    ddl = '''
    CREATE TABLE IF NOT EXISTS user_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      team_id INT NULL,
      `key` VARCHAR(100) NOT NULL,
      `value` TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_setting_key (user_id, team_id, `key`),
      INDEX idx_user (user_id),
      INDEX idx_team (team_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    '''

    with engine.connect() as conn:
        conn.execute(text(ddl))
        conn.commit()
    print('user_settings 表迁移完成')

if __name__ == '__main__':
    migrate()

