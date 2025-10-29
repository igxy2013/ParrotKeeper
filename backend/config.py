import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    
    # 数据库配置
    DB_HOST = os.environ.get('DB_HOST') or 'localhost'
    DB_PORT = os.environ.get('DB_PORT') or '3306'
    DB_USER = os.environ.get('DB_USER') or 'root'
    DB_PASSWORD = os.environ.get('DB_PASSWORD') or ''
    DB_NAME = os.environ.get('DB_NAME') or 'parrot_breeding'
    
    SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 微信小程序配置
    WECHAT_APP_ID = os.environ.get('WECHAT_APP_ID')
    WECHAT_APP_SECRET = os.environ.get('WECHAT_APP_SECRET')
    # 订阅消息模板ID（服务端定时推送使用）
    WECHAT_TEMPLATE_ID_FEEDING = os.environ.get('WECHAT_TEMPLATE_ID_FEEDING')
    WECHAT_TEMPLATE_ID_CLEANING = os.environ.get('WECHAT_TEMPLATE_ID_CLEANING')
    
    # 文件上传配置
    # 统一将用户上传的图片存储到指定目录（通过环境变量配置）
    # 注意：Windows UNC 路径需要使用原始字符串以保留反斜杠
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'images')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH') or 16 * 1024 * 1024)  # 16MB
    
    # 允许的文件扩展名
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # 应用版本（用于对外展示，通过环境变量注入）
    APP_VERSION = os.environ.get('APP_VERSION') or '1.0.0'
    
    # 基础URL配置（用于生成图片等资源的完整可访问地址）
    BASE_URL = os.environ.get('BASE_URL') or 'https://bimai.xyz'

    # 护理指南配置（后端可配置内容）
    CARE_GUIDE_CONFIG_PATH = os.environ.get('CARE_GUIDE_CONFIG_PATH') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'care_guide_config.json')
    CARE_GUIDE_ADMIN_KEY = os.environ.get('CARE_GUIDE_ADMIN_KEY')  # 可选：用于更新接口的简单鉴权

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
