import os
import requests
import json
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from PIL import Image, ImageChops
import io
from models import db, User, UserPointsRecord
from datetime import date, datetime

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

def get_or_create_square_thumbnail(relative_path: str, size: int = 128) -> str:
    try:
        rel = str(relative_path or '').strip().lstrip('/').replace('\\', '/')
        if not rel:
            return ''
        if rel.startswith('http://') or rel.startswith('https://'):
            return rel
        base = current_app.config['UPLOAD_FOLDER']
        orig_path = os.path.join(base, rel)
        if not os.path.exists(orig_path):
            return rel
        thumb_root = os.path.join(base, 'thumbs', str(int(size) if size else 128))
        thumb_path = os.path.join(thumb_root, rel)
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        if os.path.exists(thumb_path):
            return f"thumbs/{int(size) if size else 128}/{rel}"
        img = Image.open(orig_path)
        w, h = img.size
        m = min(w, h)
        left = (w - m) // 2
        top = (h - m) // 2
        crop = img.crop((left, top, left + m, top + m))
        out = crop.resize((int(size), int(size)), Image.LANCZOS)
        if out.mode in ('RGBA', 'LA'):
            bg = Image.new('RGB', (int(size), int(size)), (255, 255, 255))
            bg.paste(out, mask=out.split()[-1])
            out = bg
        else:
            out = out.convert('RGB')
        out.save(thumb_path, format='JPEG', quality=85)
        return f"thumbs/{int(size) if size else 128}/{rel}"
    except Exception:
        return str(relative_path or '')

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

def ensure_square_image_with_padding(image_path):
    try:
        img = Image.open(image_path)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        w, h = img.size
        size = max(w, h)
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        left = (size - w) // 2
        top = (size - h) // 2
        canvas.paste(img, (left, top), img if img.mode == 'RGBA' else None)
        name, _ = os.path.splitext(image_path)
        out_path = f"{name}_square.png"
        canvas.save(out_path, 'PNG')
        return out_path
    except Exception as e:
        print(f"生成方形图片失败: {str(e)}")
        return image_path

def remove_background(image_path):
    """调用 remove.bg API 移除图片背景，并自动裁剪空白区域"""
    try:
        from flask import current_app
        from models import SystemSetting, db
        import hashlib
        from datetime import datetime
        providers = []
        try:
            rlist = SystemSetting.query.filter_by(key='REMOVE_BG_LIST').first()
            if rlist and rlist.value:
                import json
                arr = json.loads(rlist.value)
                if isinstance(arr, list):
                    for it in arr:
                        providers.append({
                            'api_key': str((it or {}).get('api_key') or ''),
                            'api_url': str((it or {}).get('api_url') or '') or 'https://api.remove.bg/v1.0/removebg'
                        })
        except Exception:
            providers = []
        if not providers:
            api_key = current_app.config.get('REMOVE_BG_API_KEY')
            api_url = current_app.config.get('REMOVE_BG_API_URL') or 'https://api.remove.bg/v1.0/removebg'
            if not api_key:
                try:
                    row = SystemSetting.query.filter_by(key='REMOVE_BG_API_KEY').first()
                    url_row = SystemSetting.query.filter_by(key='REMOVE_BG_API_URL').first()
                    api_key = (row.value if row and row.value else '')
                    api_url = (url_row.value if url_row and url_row.value else api_url)
                except Exception:
                    api_key = ''
            if api_key:
                providers = [{ 'api_key': api_key, 'api_url': api_url }]
        if not providers:
            return None
        last_err = None
        for p in providers:
            k = p.get('api_key')
            u = p.get('api_url') or 'https://api.remove.bg/v1.0/removebg'
            if not k:
                continue
            try:
                resp = requests.post(
                    u,
                    files={'image_file': open(image_path, 'rb')},
                    data={'size': 'auto'},
                    headers={'X-Api-Key': k},
                    timeout=30
                )
                if resp.status_code == 200:
                    processed_filename = image_path.replace('.', '_processed.')
                    with open(processed_filename, 'wb') as f:
                        f.write(resp.content)
                    cropped_filename = auto_crop_image(processed_filename)
                    square_filename = ensure_square_image_with_padding(cropped_filename or processed_filename)
                    out = processed_filename
                    if square_filename and square_filename != processed_filename:
                        try:
                            if os.path.exists(processed_filename):
                                os.remove(processed_filename)
                            if cropped_filename and os.path.exists(cropped_filename) and cropped_filename != square_filename:
                                os.remove(cropped_filename)
                        except Exception:
                            pass
                        out = square_filename
                    try:
                        ident = hashlib.sha1((k or '').encode('utf-8')).hexdigest()
                        ym = datetime.now().strftime('%Y%m')
                        usage_key = f'REMOVE_BG_USAGE_{ym}'
                        row = SystemSetting.query.filter_by(key=usage_key).first()
                        import json
                        data = {}
                        if row and (row.value or '').strip():
                            try:
                                data = json.loads(row.value)
                            except Exception:
                                data = {}
                        cnt = int((data.get(ident) or 0) or 0) + 1
                        data[ident] = cnt
                        val = json.dumps(data, ensure_ascii=False)
                        if not row:
                            row = SystemSetting(key=usage_key, value=val)
                            db.session.add(row)
                        else:
                            row.value = val
                        db.session.commit()
                    except Exception:
                        pass
                    return out
                last_err = f'status={resp.status_code}'
            except Exception as e:
                last_err = str(e)
                continue
        return None
    except Exception as e:
        print(f"背景移除失败: {e}")
        return None

def add_user_points(user_id, points_to_add, point_type):
    """为用户增加积分，避免同一天同一类型重复加分
    point_type: 'checkin', 'daily_visit', 'feeding', 'health', 'cleaning', 'breeding', 'expense'
    """
    try:
        user = User.query.get(user_id)
        if not user:
            return False
            
        today = date.today()
        
        # 检查今天是否已经获得过该类型的积分
        existing_record = UserPointsRecord.query.filter_by(
            user_id=user_id,
            point_type=point_type,
            record_date=today
        ).first()
        
        if existing_record:
            # 今天已经获得过该类型的积分
            return False
        
        # 创建积分记录
        points_record = UserPointsRecord(
            user_id=user_id,
            point_type=point_type,
            points=points_to_add,
            record_date=today
        )
        db.session.add(points_record)
        
        # 更新用户总积分
        user.points = (user.points or 0) + points_to_add
        
        # 对于签到积分，更新最后签到日期
        if point_type == 'checkin':
            user.last_checkin_date = today
            
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"增加用户积分失败: {e}")
        return False

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
                user = User.query.filter_by(id=user_id).first()
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

_cache_client = None

def get_cache_client():
    global _cache_client
    if _cache_client is not None:
        return _cache_client
    try:
        import redis
        url = os.environ.get('REDIS_URL')
        if url:
            r = redis.Redis.from_url(url)
        else:
            host = os.environ.get('REDIS_HOST') or (current_app.config.get('REDIS_HOST') if current_app else None) or '127.0.0.1'
            port = int(os.environ.get('REDIS_PORT') or (current_app.config.get('REDIS_PORT') if current_app else 6379) or 6379)
            dbn = int(os.environ.get('REDIS_DB') or (current_app.config.get('REDIS_DB') if current_app else 0) or 0)
            r = redis.Redis(host=host, port=port, db=dbn)
        r.ping()
        _cache_client = r
        return _cache_client
    except Exception:
        _cache_client = None
        return None

def cache_get_json(key):
    c = get_cache_client()
    if not c:
        return None
    try:
        v = c.get(key)
        if not v:
            return None
        return json.loads(v)
    except Exception:
        return None

def cache_set_json(key, value, ttl_seconds=600):
    c = get_cache_client()
    if not c:
        return False
    try:
        c.setex(key, ttl_seconds, json.dumps(value, ensure_ascii=False))
        return True
    except Exception:
        return False
