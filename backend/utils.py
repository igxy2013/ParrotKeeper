import os
import requests
import json
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from PIL import Image, ImageChops
import io

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def save_uploaded_file(file, folder='parrots'):
    """保存上传的文件
    folder为空或空字符串时，直接保存到上传根目录，并返回仅文件名的相对路径。
    非空时保存到对应子目录，并返回`{folder}/{filename}`。
    """
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 添加时间戳避免文件名冲突
        import time
        timestamp = str(int(time.time()))
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"

        # 规范化子目录参数
        subfolder = (folder or '').strip()

        upload_base = current_app.config['UPLOAD_FOLDER']
        upload_path = os.path.join(upload_base, subfolder) if subfolder else upload_base
        os.makedirs(upload_path, exist_ok=True)

        file_path = os.path.join(upload_path, filename)
        file.save(file_path)

        # 返回相对路径用于前端拼接 /uploads/
        return f"{subfolder}/{filename}" if subfolder else filename
    return None

def remove_background(image_path):
    """调用 remove.bg API 移除图片背景"""
    try:
        from flask import current_app
        import requests

        api_key = current_app.config.get('REMOVE_BG_API_KEY')
        api_url = current_app.config.get('REMOVE_BG_API_URL') or 'https://api.remove.bg/v1.0/removebg'

        if not api_key:
            print('背景移除失败: 未配置 REMOVE_BG_API_KEY')
            return None

        # 生成新的文件名（透明背景输出 PNG）
        name, _ = os.path.splitext(image_path)
        output_path = f"{name}_no_bg.png"

        # 调用 remove.bg API
        with open(image_path, 'rb') as f:
            files = { 'image_file': f }
            data = { 'size': 'auto', 'format': 'png' }
            headers = { 'X-Api-Key': api_key }

            resp = requests.post(api_url, files=files, data=data, headers=headers, timeout=60)

        if resp.status_code == 200:
            with open(output_path, 'wb') as out:
                out.write(resp.content)
            
            # 添加自动裁剪功能
            cropped_path = auto_crop_image(output_path)
            if cropped_path:
                return cropped_path
            else:
                return output_path
        else:
            try:
                err_json = resp.json()
                print(f"背景移除失败: {err_json}")
            except Exception:
                print(f"背景移除失败: HTTP {resp.status_code}")
            return None
    except Exception as e:
        print(f"背景移除异常: {str(e)}")
        return None

def auto_crop_image(image_path):
    """自动裁剪图片，去除空白区域并将主体放大"""
    try:
        # 打开图片
        img = Image.open(image_path)
        
        # 如果图片有透明通道，使用透明通道作为裁剪依据
        if img.mode in ('RGBA', 'LA'):
            # 获取alpha通道
            alpha = img.split()[-1]
            # 创建一个纯黑的背景
            bbox = alpha.getbbox()
        else:
            # 对于没有透明通道的图片，转换为RGBA模式并创建alpha通道
            img = img.convert('RGBA')
            alpha = img.split()[-1]
            bbox = alpha.getbbox()
        
        if bbox:
            # 裁剪图片
            cropped = img.crop(bbox)
            
            # 生成新的文件名
            name, ext = os.path.splitext(image_path)
            cropped_path = f"{name}_cropped.png"
            
            # 保存裁剪后的图片
            cropped.save(cropped_path, 'PNG')
            return cropped_path
        else:
            # 如果没有找到边界框，返回原图路径
            return image_path
    except Exception as e:
        print(f"自动裁剪图片失败: {str(e)}")
        return image_path

def process_parrot_image(file, folder='parrots'):
    """处理鹦鹉图片：保存原图并生成抠图版本"""
    if not file or not allowed_file(file.filename):
        return None, None
    
    filename = secure_filename(file.filename)
    # 添加时间戳避免文件名冲突
    import time
    timestamp = str(int(time.time()))
    name, ext = os.path.splitext(filename)
    
    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder)
    os.makedirs(upload_path, exist_ok=True)
    
    # 保存原图
    original_filename = f"{name}_{timestamp}{ext}"
    original_path = os.path.join(upload_path, original_filename)
    file.save(original_path)
    
    # 生成抠图版本
    processed_path = remove_background(original_path)
    
    if processed_path:
        # 获取处理后文件的相对路径
        processed_filename = os.path.basename(processed_path)
        processed_relative_path = f"{folder}/{processed_filename}"
        original_relative_path = f"{folder}/{original_filename}"
        
        return original_relative_path, processed_relative_path
    else:
        # 如果抠图失败，只返回原图
        return f"{folder}/{original_filename}", None

def get_wechat_session(code):
    """通过微信code获取session信息"""
    app_id = current_app.config['WECHAT_APP_ID']
    app_secret = current_app.config['WECHAT_APP_SECRET']
    
    if not app_id or not app_secret:
        # 明确返回配置缺失的错误，便于前端展示与排查
        return {
            'errcode': 'NO_APP_CONFIG',
            'errmsg': '未配置微信小程序AppID/Secret'
        }
    
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
        
        # 如果包含 openid，表示获取成功；否则返回完整错误数据
        if 'openid' in data:
            return data
        else:
            # 打印具体错误，便于服务端日志定位问题
            print(f"获取微信session失败，返回: {data}")
            return data
    except Exception as e:
        print(f"获取微信session失败: {e}")
        return {
            'errcode': 'REQUEST_EXCEPTION',
            'errmsg': f'请求微信接口异常: {str(e)}'
        }
    
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
        user = None
        
        # 首先尝试通过openid查找（微信登录用户）
        user = User.query.filter_by(openid=openid).first()
        
        # 如果没找到，检查是否是账号登录用户的伪openid格式
        if not user and openid.startswith('account_'):
            try:
                user_id = int(openid.replace('account_', ''))
                user = User.query.filter_by(id=user_id, login_type='account').first()
            except ValueError:
                pass
        
        if not user:
            return jsonify({'error': '用户不存在'}), 401
        
        # 从请求头获取用户模式信息
        user_mode = request.headers.get('X-User-Mode', 'personal')
        user.user_mode = user_mode
        
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
