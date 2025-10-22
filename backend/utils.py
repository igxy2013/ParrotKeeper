import os
import requests
import json
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def save_uploaded_file(file, folder='parrots'):
    """保存上传的文件"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 添加时间戳避免文件名冲突
        import time
        timestamp = str(int(time.time()))
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder)
        os.makedirs(upload_path, exist_ok=True)
        
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)
        
        # 返回相对路径用于存储在数据库中
        return f"{folder}/{filename}"
    return None

def get_wechat_session(code):
    """通过微信code获取session信息"""
    app_id = current_app.config['WECHAT_APP_ID']
    app_secret = current_app.config['WECHAT_APP_SECRET']
    
    if not app_id or not app_secret:
        return None
    
    url = 'https://api.weixin.qq.com/sns/jscode2session'
    params = {
        'appid': app_id,
        'secret': app_secret,
        'js_code': code,
        'grant_type': 'authorization_code'
    }
    
    try:
        response = requests.get(url, params=params)
        data = response.json()
        
        if 'openid' in data:
            return data
        else:
            return None
    except Exception as e:
        print(f"获取微信session失败: {e}")
        return None

def login_required(f):
    """登录验证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 从请求头获取openid
        openid = request.headers.get('X-OpenID')
        if not openid:
            return jsonify({'error': '未登录'}), 401
        
        # 验证用户是否存在
        from models import User
        user = User.query.filter_by(openid=openid).first()
        if not user:
            return jsonify({'error': '用户不存在'}), 401
        
        # 将用户信息添加到请求上下文
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

def success_response(data=None, message='操作成功'):
    """成功响应格式"""
    response = {
        'success': True,
        'message': message
    }
    if data is not None:
        response['data'] = data
    return jsonify(response)

def error_response(message='操作失败', code=400):
    """错误响应格式"""
    return jsonify({
        'success': False,
        'message': message
    }), code

def paginate_query(query, page=1, per_page=20):
    """分页查询"""
    try:
        page = int(page) if page else 1
        per_page = int(per_page) if per_page else 20
        per_page = min(per_page, 100)  # 限制每页最大数量
        
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return {
            'items': pagination.items,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page,
            'per_page': pagination.per_page,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    except Exception as e:
        return {
            'items': [],
            'total': 0,
            'pages': 0,
            'current_page': 1,
            'per_page': per_page,
            'has_next': False,
            'has_prev': False
        }

def calculate_age(birth_date):
    """计算年龄（天数）"""
    if not birth_date:
        return None
    
    from datetime import date
    return (date.today() - birth_date).days

def format_date(date_obj):
    """格式化日期"""
    if not date_obj:
        return None
    return date_obj.strftime('%Y-%m-%d')

def format_datetime(datetime_obj):
    """格式化日期时间"""
    if not datetime_obj:
        return None
    return datetime_obj.strftime('%Y-%m-%d %H:%M:%S')