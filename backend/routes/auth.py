from flask import Blueprint, request, jsonify
from models import db, User
from schemas import user_schema
from utils import get_wechat_session, success_response, error_response

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