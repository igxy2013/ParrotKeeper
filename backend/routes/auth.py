from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from schemas import user_schema
from utils import get_wechat_session, success_response, error_response
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
        
        openid = session_data.get('openid')
        session_key = session_data.get('session_key')
        
        # 查找或创建用户
        user = User.query.filter_by(openid=openid).first()
        if not user:
            user = User(
                openid=openid,
                nickname=user_info.get('nickName'),
                avatar_url=user_info.get('avatarUrl')
            )
            db.session.add(user)
        else:
            # 更新用户信息
            if user_info.get('nickName'):
                user.nickname = user_info.get('nickName')
            if user_info.get('avatarUrl'):
                user.avatar_url = user_info.get('avatarUrl')
        
        db.session.commit()
        
        return success_response({
            'user': user_schema.dump(user),
            'session_key': session_key
        }, '登录成功')
        
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
        
        return success_response({
            'user': user_schema.dump(user)
        }, '登录成功')
        
    except Exception as e:
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
        
        user = User.query.filter_by(openid=openid).first()
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
        
        user = User.query.filter_by(openid=openid).first()
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
        
        db.session.commit()
        
        return success_response(user_schema.dump(user), '更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')