from flask import Flask, jsonify, request
from flask_cors import CORS
from config import config
from models import db
from routes.auth import auth_bp
from routes.parrots import parrots_bp
from routes.records import records_bp
from routes.statistics import statistics_bp
from routes.upload import upload_bp
from routes.expenses import expenses_bp
from routes.teams import teams_bp
from routes.achievements import achievements_bp
from routes.image_processing import image_processing_bp
from routes.notifications import notifications_bp
import os

def create_app(config_name=None):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 配置
    config_name = config_name or os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    
    # 设置JSON编码，确保中文字符正确显示
    app.config['JSON_AS_ASCII'] = False
    
    # 初始化扩展
    db.init_app(app)
    CORS(app, supports_credentials=True)
    
    # 注册蓝图
    app.register_blueprint(auth_bp)
    app.register_blueprint(parrots_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(statistics_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(expenses_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(achievements_bp)
    app.register_blueprint(image_processing_bp)
    app.register_blueprint(notifications_bp)
    
    # 创建上传目录
    upload_folder = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    # 错误处理
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'success': False, 'message': '接口不存在'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'success': False, 'message': '服务器内部错误'}), 500
    
    @app.errorhandler(413)
    def too_large(error):
        return jsonify({'success': False, 'message': '文件太大'}), 413
    
    # 健康检查
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'success': True,
            'message': '服务正常',
            'version': app.config.get('APP_VERSION', 'unknown')
        })
    
    # 静态文件服务
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        from flask import send_from_directory
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    # 添加调试中间件
    @app.before_request
    def log_request():
        print(f"请求: {request.method} {request.path}")
    
    return app

def init_db(app):
    """初始化数据库"""
    with app.app_context():
        db.create_all()
        print("数据库表创建完成")

if __name__ == '__main__':
    app = create_app()
    
    # 初始化数据库
    init_db(app)
    
    # 调试：打印所有路由
    print("注册的路由:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
    
    # 使用Flask开发服务器进行测试
    print("启动开发服务器...")
    print("服务器地址: http://0.0.0.0:5075")
    app.run(host='0.0.0.0', port=5075, debug=True)
