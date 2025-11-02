from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from schemas import user_schema
from utils import get_wechat_session, success_response, error_response
from datetime import date, datetime
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """微信小程序登录"""
    try:
        data = request.get_json()
        code = data.get('code')
        user_info = data.get('userInfo', {})
        
        if not code:
            return error_response('缺少code参数')
        
        # 获取微信session
        session_data = get_wechat_session(code)
        if not session_data:
            return error_response('登录失败，请重试')

        # 如果微信返回错误码，直接将错误信息透出
        if isinstance(session_data, dict) and session_data.get('errcode'):
            errmsg = session_data.get('errmsg', '未知错误')
            # 针对配置缺失的情况提供更友好的提示
            if session_data.get('errcode') == 'NO_APP_CONFIG':
                return error_response('服务端未配置微信AppID/Secret，请先配置后重试')
            return error_response(f'微信登录失败: {errmsg}')

        openid = session_data.get('openid')
        session_key = session_data.get('session_key')

        if not openid:
            return error_response('微信登录失败：缺少openid')

        # 查找或创建用户
        user = User.query.filter_by(openid=openid).first()
        
        # 处理昵称，避免空值或默认值
        wechat_nickname = user_info.get('nickName', '').strip()
        
        if not user:
            # 新用户：设置默认昵称
            if not wechat_nickname or wechat_nickname == '微信用户':
                nickname = f'用户{openid[-6:]}'  # 使用OpenID后6位作为默认昵称
            else:
                nickname = wechat_nickname
            
            user = User(
                openid=openid,
                nickname=nickname,
                avatar_url=user_info.get('avatarUrl')
            )
            db.session.add(user)
        else:
            # 已存在用户：只在特定条件下更新昵称
            current_nickname = user.nickname or ''
            
            # 只有当前昵称是默认格式且微信返回有效昵称时才更新
            if (wechat_nickname and 
                wechat_nickname != '微信用户' and 
                current_nickname.startswith('用户') and 
                len(current_nickname) == 9):  # "用户" + 6位字符
                user.nickname = wechat_nickname
            
            # 更新头像（如果有）
            if user_info.get('avatarUrl'):
                user.avatar_url = user_info.get('avatarUrl')
        
        # 每日签到积分逻辑
        today = date.today()
        checkin_bonus = 0
        if not user.last_checkin_date or user.last_checkin_date < today:
            # 今天还没有签到，增加1积分
            user.points = (user.points or 0) + 1
            user.last_checkin_date = today
            checkin_bonus = 1
        
        db.session.commit()
        
        response_data = {
            'user': user_schema.dump(user),
            'session_key': session_key
        }
        
        # 如果获得了签到积分，在消息中提示
        message = '登录成功'
        if checkin_bonus > 0:
            message = f'登录成功，获得签到积分 {checkin_bonus} 分！'
        
        return success_response(response_data, message)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'登录失败: {str(e)}')

@auth_bp.route('/verify', methods=['POST'])
def verify_user():
    """验证用户是否存在"""
    try:
        data = request.get_json()
        openid = data.get('openid')
        
        if not openid:
            return error_response('缺少openid参数')
        
        user = User.query.filter_by(openid=openid).first()
        if user:
            return success_response({
                'user': user_schema.dump(user)
            }, '用户验证成功')
        else:
            return error_response('用户不存在', 404)
        
    except Exception as e:
        return error_response(f'验证失败: {str(e)}')

@auth_bp.route('/create-test-user', methods=['POST'])
def create_test_user():
    """创建测试用户"""
    try:
        data = request.get_json()
        openid = data.get('openid')
        nickname = data.get('nickname', '测试用户')
        avatar_url = data.get('avatar_url', '')
        
        if not openid:
            return error_response('缺少openid参数')
        
        # 检查用户是否已存在
        existing_user = User.query.filter_by(openid=openid).first()
        if existing_user:
            return success_response({
                'user': user_schema.dump(existing_user)
            }, '测试用户已存在')
        
        # 创建新的测试用户
        user = User(
            openid=openid,
            nickname=nickname,
            avatar_url=avatar_url
        )
        db.session.add(user)
        db.session.commit()
        
        return success_response({
            'user': user_schema.dump(user)
        }, '测试用户创建成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建测试用户失败: {str(e)}')

@auth_bp.route('/account-login', methods=['POST'])
def account_login():
    """账号登录"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        mode = data.get('mode', 'personal')  # 获取用户选择的模式，默认为个人模式
        
        if not username:
            return error_response('请输入用户名')
        
        if not password:
            return error_response('请输入密码')
        
        # 查找用户
        user = User.query.filter_by(username=username, login_type='account').first()
        if not user:
            return error_response('用户名或密码错误')
        
        # 验证密码
        if not check_password_hash(user.password_hash, password):
            return error_response('用户名或密码错误')
        
        # 更新用户模式
        user.user_mode = mode
        
        # 每日签到积分逻辑
        today = date.today()
        checkin_bonus = 0
        if not user.last_checkin_date or user.last_checkin_date < today:
            # 今天还没有签到，增加1积分
            user.points = (user.points or 0) + 1
            user.last_checkin_date = today
            checkin_bonus = 1
        
        db.session.commit()
        
        message = '登录成功'
        if checkin_bonus > 0:
            message = f'登录成功，获得签到积分 {checkin_bonus} 分！'
        
        return success_response({
            'user': user_schema.dump(user)
        }, message)
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'登录失败: {str(e)}')

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        
        # 验证输入
        if not username:
            return error_response('请输入用户名')
        
        if not password:
            return error_response('请输入密码')
        
        # 验证用户名格式（3-20位字母数字下划线）
        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
            return error_response('用户名只能包含字母、数字、下划线，长度3-20位')
        
        # 验证密码长度
        if len(password) < 6:
            return error_response('密码长度至少6位')
        
        # 检查用户名是否已存在
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return error_response('用户名已存在')
        
        # 创建新用户
        user = User(
            username=username,
            password_hash=generate_password_hash(password),
            nickname=nickname or username,
            login_type='account'
        )
        db.session.add(user)
        db.session.commit()
        
        return success_response({
            'user': user_schema.dump(user)
        }, '注册成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'注册失败: {str(e)}')

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    """获取用户信息"""
    try:
        openid = request.headers.get('X-OpenID')
        if not openid:
            return error_response('未登录', 401)
        
        # 查找用户，支持微信登录和账号登录
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
            return error_response('用户不存在', 404)
        
        return success_response(user_schema.dump(user))
        
    except Exception as e:
        return error_response(f'获取用户信息失败: {str(e)}')

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    """更新用户信息"""
    try:
        openid = request.headers.get('X-OpenID')
        if not openid:
            return error_response('未登录', 401)
        
        # 查找用户，支持微信登录和账号登录
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
            return error_response('用户不存在', 404)
        
        data = request.get_json()
        
        # 更新允许的字段
        if 'nickname' in data:
            user.nickname = data['nickname']
        if 'phone' in data:
            user.phone = data['phone']
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        if 'user_mode' in data:
            # 验证用户模式值
            if data['user_mode'] in ['personal', 'team']:
                user.user_mode = data['user_mode']
            else:
                return error_response('无效的用户模式')
        
        db.session.commit()
        
        return success_response(user_schema.dump(user), '更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')
