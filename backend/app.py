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
from routes.reminders import reminders_bp
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
from routes.care_guide import care_guide_bp
from routes.feedback import feedback_bp
from routes.settings import settings_bp
from routes.admin import admin_bp
from routes.announcements import announcements_bp
import os
from utils import login_required, success_response, error_response
from team_mode_utils import (
    get_accessible_feeding_record_ids_by_mode,
    get_accessible_health_record_ids_by_mode,
    get_accessible_cleaning_record_ids_by_mode,
    get_accessible_breeding_record_ids_by_mode
)

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
    app.register_blueprint(care_guide_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(announcements_bp)
    
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

    # 启用跨源隔离以满足 SharedArrayBuffer 要求（Chrome M92+）
    @app.after_request
    def add_cross_origin_isolation_headers(response):
        # 页面隔离：需要同源窗口，避免与其他源共享进程
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        # 资源嵌入策略：仅允许带有 CORP 或 CORS 的跨源资源
        response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        return response

    # 健康检查
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'success': True,
            'message': '服务正常',
            'version': app.config.get('APP_VERSION', 'unknown')
        })

    # 兼容小程序：按类型获取记录详情（无 /api 前缀）
    @app.route('/records/<string:record_type>/<int:record_id>', methods=['GET'])
    @login_required
    def get_record_by_type_compat(record_type, record_id):
        try:
            from models import FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord
            from schemas import (
                feeding_record_schema, health_record_schema,
                cleaning_record_schema, breeding_record_schema
            )

            user = request.current_user

            record = None
            schema = None
            accessible_ids = []

            if record_type == 'feeding':
                record = FeedingRecord.query.get(record_id)
                schema = feeding_record_schema
                accessible_ids = get_accessible_feeding_record_ids_by_mode(user)
            elif record_type == 'health':
                record = HealthRecord.query.get(record_id)
                schema = health_record_schema
                accessible_ids = get_accessible_health_record_ids_by_mode(user)
            elif record_type == 'cleaning':
                record = CleaningRecord.query.get(record_id)
                schema = cleaning_record_schema
                accessible_ids = get_accessible_cleaning_record_ids_by_mode(user)
            elif record_type == 'breeding':
                record = BreedingRecord.query.get(record_id)
                schema = breeding_record_schema
                accessible_ids = get_accessible_breeding_record_ids_by_mode(user)
            else:
                return error_response('不支持的记录类型')

            if not record:
                return error_response('记录不存在')

            if accessible_ids and (record.id not in accessible_ids):
                return error_response('权限不足或记录不存在')

            data = schema.dump(record)
            return success_response(data)
        except Exception as e:
            return error_response(f'获取记录失败: {str(e)}')
    
    # 静态文件服务
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        from flask import send_from_directory, make_response
        resp = make_response(send_from_directory(app.config['UPLOAD_FOLDER'], filename))
        # 允许其他站点在 COEP 环境中加载本服务的图片资源（如需）。
        # 如果只在同域内使用，可改为 'same-origin'。
        resp.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
        return resp
    
    # 添加调试中间件
    @app.before_request
    def log_request():
        print(f"请求: {request.method} {request.path}")

    # 初始化并启动定时任务（服务端订阅消息推送）
    init_scheduler(app)

    # 确保数据库表已创建（包含新增模型）
    try:
        init_db(app)
    except Exception as e:
        print(f'初始化数据库失败或已存在: {str(e)}')

    return app

def init_db(app):
    """初始化数据库"""
    with app.app_context():
        db.create_all()
        print("数据库表创建完成")

def init_scheduler(app):
    """初始化APScheduler并注册定时推送任务"""
    try:
        scheduler = BackgroundScheduler()

        def push_due_reminders():
            from models import Reminder, ReminderLog, User
            from routes.notifications import get_access_token
            from config import Config
            import requests
            from datetime import datetime

            with app.app_context():
                now = datetime.now()
                hh = now.hour
                mm = now.minute
                today = date.today()

                # 查询所有每日启用的提醒
                reminders = Reminder.query.filter_by(is_active=True, frequency='daily').all()

                access_token = get_access_token()
                if not access_token:
                    print('定时任务：无法获取access_token，跳过本轮推送')
                    return

                api_url = f'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}'

                for r in reminders:
                    try:
                        if not r.reminder_time:
                            continue
                        if r.reminder_time.hour != hh or r.reminder_time.minute != mm:
                            continue

                        # 去重：当天是否已推送
                        exists = ReminderLog.query.filter_by(reminder_id=r.id, sent_date=today).first()
                        if exists:
                            continue

                        user = User.query.get(r.user_id)
                        if not user or not user.openid:
                            continue

                        # 根据类型选择模板ID
                        if r.reminder_type == 'feeding':
                            template_id = getattr(Config, 'WECHAT_TEMPLATE_ID_FEEDING', None)
                            reminder_type_cn = '喂食提醒'
                        elif r.reminder_type == 'cleaning':
                            template_id = getattr(Config, 'WECHAT_TEMPLATE_ID_CLEANING', None)
                            reminder_type_cn = '清洁提醒'
                        else:
                            template_id = None
                            reminder_type_cn = '系统提醒'

                        if not template_id:
                            # 未配置模板则跳过服务端订阅推送，可考虑仅记录日志
                            continue

                        # 构造模板数据（关键词字段需与模板匹配）
                        template_data = {
                            'thing1': { 'value': r.title or '您有一条提醒' },
                            'time2': { 'value': now.strftime('%Y-%m-%d %H:%M') },
                            'thing3': { 'value': user.nickname or '鹦鹉管家' },
                            'thing4': { 'value': reminder_type_cn }
                        }

                        payload = {
                            'touser': user.openid,
                            'template_id': template_id,
                            'page': 'pages/index/index',
                            'data': template_data
                        }

                        resp = requests.post(api_url, json=payload)
                        result = resp.json()
                        if result.get('errcode') == 0:
                            # 记录日志，避免当天重复
                            log = ReminderLog(reminder_id=r.id, sent_date=today)
                            db.session.add(log)
                            db.session.commit()
                            print(f"定时推送成功: user={user.id}, type={r.reminder_type}")
                        else:
                            print(f"定时推送失败: {result}")
                    except Exception as e:
                        print(f"定时推送异常: {str(e)}")

        # 定时发布系统公告任务：每分钟检查一次
        def publish_scheduled_announcements():
            from models import Announcement
            from datetime import datetime
            with app.app_context():
                now = datetime.now()
                try:
                    due = Announcement.query.filter_by(status='scheduled').all()
                    count = 0
                    for a in due:
                        if a.scheduled_at and a.scheduled_at <= now:
                            a.status = 'published'
                            count += 1
                    if count > 0:
                        db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f'发布定时公告失败: {e}')

        # 每分钟执行一次，检测当前分钟是否有到点提醒与公告
        scheduler.add_job(push_due_reminders, 'cron', second=0)
        scheduler.add_job(publish_scheduled_announcements, 'cron', second=10)
        scheduler.start()
        print('APScheduler 已启动')
    except Exception as e:
        print(f'初始化APScheduler失败: {str(e)}')

if __name__ == '__main__':
    app = create_app()
    
    # 初始化数据库
    init_db(app)
    
    # 调试：打印所有路由
    print("注册的路由:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
    
    # 仅在开发环境下启动 Flask 内置开发服务器
    env = os.environ.get('FLASK_ENV', 'production')
    if env == 'development':
        print("启动开发服务器...")
        host = app.config.get('HOST', '0.0.0.0')
        try:
            port = int(app.config.get('PORT', 5075))
        except Exception:
            port = 5075
        print(f"服务器地址: http://{host}:{port}")
        app.run(host=host, port=port, debug=True)
    else:
        print("当前为生产环境：请使用 Waitress/Gunicorn 等 WSGI 服务器启动。")
