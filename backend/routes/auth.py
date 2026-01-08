from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, InvitationCode, UserSetting
from schemas import user_schema
from utils import get_wechat_session, success_response, error_response, login_required
from datetime import date, datetime, timedelta
import secrets
import re

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """登录接口"""
    try:
        data = request.get_json()
        code = data.get('code')
        username = data.get('username')
        password = data.get('password')
        user_info = data.get('userInfo', {})

        if username and password:
            user = User.query.filter_by(username=username).first()
            if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
                return error_response('用户名或密码错误')

            today = date.today()
            checkin_bonus = 0
            if not user.last_checkin_date or user.last_checkin_date < today:
                user.points = (user.points or 0) + 1
                user.last_checkin_date = today
                checkin_bonus = 1

            db.session.commit()

            message = '登录成功'
            if checkin_bonus > 0:
                message = f'登录成功，获得签到积分 {checkin_bonus} 分！'

            return success_response({'user': user_schema.dump(user)}, message)
        
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

@auth_bp.route('/check-username', methods=['GET'])
def check_username():
    """检查用户名是否可用"""
    try:
        username = request.args.get('username', '').strip()
        if not username:
            return error_response('请输入用户名')
            
        user = User.query.filter_by(username=username).first()
        if user:
            return success_response({'available': False}, '用户名已存在')
        else:
            return success_response({'available': True}, '用户名可用')
            
    except Exception as e:
        return error_response(f'检查失败: {str(e)}')

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
        
        # 查找账号
        from models import UserAccount
        account = UserAccount.query.filter_by(username=username).first()
        if not account:
            return error_response('用户名或密码错误')
        
        # 验证密码
        if not check_password_hash(account.password_hash, password):
            return error_response('用户名或密码错误')
        
        # 验证账号是否关联用户
        if not account.user_id:
            # 孤立账号，暂时不允许登录？或者提示先绑定？
            # 理论上应该允许登录，但是没有User对象，很多功能无法使用。
            # 这里我们可以自动创建一个空User对象关联给它？
            # 暂时返回错误提示
            return error_response('该账号未关联任何用户数据，请先通过微信绑定', 404)

        user = account.user
        
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
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        invitation_code = (data.get('invitation_code') or '').strip()

        if not username:
            return error_response('请输入用户名')
        if not password:
            return error_response('请输入密码')

        if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
            return error_response('用户名只能包含字母、数字、下划线，长度3-20位')
        if len(password) < 6:
            return error_response('密码长度至少6位')

        from models import UserAccount
        existing_account = UserAccount.query.filter_by(username=username).first()
        if existing_account:
            return error_response('用户名已存在')

        # 1. 创建用户
        user = User(
            nickname=nickname or username,
            login_type='account'
        )
        db.session.add(user)
        db.session.flush() # 获取ID

        # 2. 创建账号关联
        account = UserAccount(
            user_id=user.id,
            username=username,
            password_hash=generate_password_hash(password)
        )
        db.session.add(account)

        if invitation_code:
            code_row = InvitationCode.query.filter_by(code=invitation_code).first()
            if (not code_row or
                not code_row.is_active or
                code_row.used_count >= code_row.max_uses):
                db.session.rollback()
                return error_response('邀请码无效或已被使用完')
            code_row.used_count = (code_row.used_count or 0) + 1
            if code_row.used_count >= code_row.max_uses:
                code_row.is_active = False

        db.session.commit()
        return success_response({'user': user_schema.dump(user)}, '注册成功')

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
                user = User.query.filter_by(id=user_id).first()
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
                user = User.query.filter_by(id=user_id).first()
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

@auth_bp.route('/bind-account', methods=['POST'])
def bind_account():
    """绑定已有账号"""
    try:
        openid = request.headers.get('X-OpenID')
        if not openid:
            return error_response('未登录', 401)

        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return error_response('请输入用户名和密码')

        # 获取当前微信登录用户
        current_user = User.query.filter_by(openid=openid).first()
        if not current_user:
            return error_response('当前用户不存在', 404)

        # 查找目标账号
        from models import UserAccount
        target_account = UserAccount.query.filter_by(username=username).first()
        if not target_account:
            return error_response('目标账号不存在')

        # 验证密码
        if not check_password_hash(target_account.password_hash, password):
            return error_response('用户名或密码错误')

        # 检查账号是否已绑定到某个用户（包括自己）
        # 如果 account.user_id 存在，且就是 current_user.id，则已绑定
        if target_account.user_id:
            if target_account.user_id == current_user.id:
                return error_response('该账号已绑定当前微信')
            else:
                # 目标账号已关联其他用户（可能是纯账号用户，也可能是另一个微信用户）
                # 这里我们执行"合并/切换"逻辑：
                # 鉴于"绑定已有账号"通常意味着"登录这个账号"，我们采用切换身份的逻辑。
                # 即：将当前微信的 openid 转移给目标账号所属的用户
                
                target_user = target_account.user
                
                # 检查目标用户是否已绑定其他微信
                if target_user.openid and target_user.openid != openid:
                     return error_response('该账号已绑定其他微信号')

                # 执行绑定：转移openid
                target_user.openid = openid
                
                # 删除当前的临时用户（因为它没有账号关联，且openid被拿走了）
                # 注意：数据会丢失。
                db.session.delete(current_user)
                
                db.session.commit()
                return success_response(user_schema.dump(target_user), '绑定成功')
        else:
            # 账号是孤立的（之前解绑过），直接关联到当前用户
            target_account.user_id = current_user.id
            db.session.commit()
            return success_response(user_schema.dump(current_user), '绑定成功')

    except Exception as e:
        db.session.rollback()
        return error_response(f'绑定失败: {str(e)}')

@auth_bp.route('/setup-credentials', methods=['POST'])
def setup_credentials():
    """设置账号密码（新建账号）"""
    try:
        openid = request.headers.get('X-OpenID')
        if not openid:
            return error_response('未登录', 401)

        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return error_response('请输入用户名和密码')

        # 获取当前用户
        current_user = User.query.filter_by(openid=openid).first()
        if not current_user:
            return error_response('当前用户不存在', 404)

        # 检查用户名是否已存在
        from models import UserAccount
        existing_account = UserAccount.query.filter_by(username=username).first()
        if existing_account:
            return error_response('用户名已存在，请更换')

        # 检查当前用户是否已经绑定了账号
        if current_user.account:
             return error_response('当前用户已绑定账号，请先解绑')

        # 创建新账号并关联
        new_account = UserAccount(
            user_id=current_user.id,
            username=username,
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_account)
        
        db.session.commit()

        return success_response(user_schema.dump(current_user), '账号设置成功')

    except Exception as e:
        db.session.rollback()
        return error_response(f'账号设置失败: {str(e)}')


@auth_bp.route('/change-password', methods=['PUT'])
@login_required
def change_password():
    try:
        user = request.current_user
        if not user:
            return error_response('未登录', 401)

        data = request.get_json() or {}
        old_password = (data.get('old_password') or '').strip()
        new_password = (data.get('new_password') or '').strip()

        if not new_password:
            return error_response('请输入新密码')
        if len(new_password) < 6:
            return error_response('新密码长度至少6位')

        account = user.account
        if not account:
            return error_response('当前用户未绑定账号，无法修改密码')

        if not old_password:
            return error_response('请输入当前密码')
        
        if not check_password_hash(account.password_hash, old_password):
            return error_response('当前密码错误')

        account.password_hash = generate_password_hash(new_password)
        db.session.commit()
        return success_response({'updated': True}, '密码已更新')

    except Exception as e:
        db.session.rollback()
        return error_response(f'修改密码失败: {str(e)}')

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json() or {}
        username = (data.get('username') or '').strip()
        phone = (data.get('phone') or '').strip()
        if not username:
            return error_response('请输入用户名')
        from models import UserAccount, PasswordResetRequest
        account = UserAccount.query.filter_by(username=username).first()
        if not account:
            return error_response('账号不存在')
        user = account.user
        if user and user.phone:
            if not phone:
                return error_response('请输入绑定手机号')
            if user.phone.strip() != phone:
                return error_response('手机号不匹配')
        code = f"{secrets.randbelow(1000000):06d}"
        token = secrets.token_hex(32)
        expire_at = datetime.utcnow() + timedelta(minutes=10)
        req = PasswordResetRequest(account_id=account.id, code=code, token=token, expire_at=expire_at)
        db.session.add(req)
        db.session.commit()
        masked = None
        if user and user.phone:
            p = user.phone.strip()
            if len(p) >= 7:
                masked = p[:3] + '****' + p[-4:]
            else:
                masked = p
        resp = {'masked_phone': masked}
        if current_app.config.get('DEBUG'):
            resp['debug_code'] = code
        return success_response(resp, '验证码已发送')
    except Exception as e:
        db.session.rollback()
        return error_response(f'发送失败: {str(e)}')

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json() or {}
        username = (data.get('username') or '').strip()
        code = (data.get('code') or '').strip()
        new_password = (data.get('new_password') or '').strip()
        if not username:
            return error_response('请输入用户名')
        if not code:
            return error_response('请输入验证码')
        if not new_password:
            return error_response('请输入新密码')
        if len(new_password) < 6:
            return error_response('新密码长度至少6位')
        from models import UserAccount, PasswordResetRequest
        account = UserAccount.query.filter_by(username=username).first()
        if not account:
            return error_response('账号不存在')
        now = datetime.utcnow()
        req = PasswordResetRequest.query.filter_by(account_id=account.id, code=code, used=False).order_by(PasswordResetRequest.id.desc()).first()
        if not req:
            return error_response('验证码无效')
        if req.expire_at < now:
            return error_response('验证码已过期')
        account.password_hash = generate_password_hash(new_password)
        req.used = True
        db.session.commit()
        return success_response({'updated': True}, '密码重置成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'重置失败: {str(e)}')


@auth_bp.route('/unbind-credentials', methods=['POST'])
def unbind_credentials():
    try:
        openid = request.headers.get('X-OpenID')
        if not openid:
            return error_response('未登录', 401)

        user = User.query.filter_by(openid=openid).first()
        if not user and openid.startswith('account_'):
            try:
                user_id = int(openid.replace('account_', ''))
                user = User.query.filter_by(id=user_id).first()
            except ValueError:
                user = None

        if not user:
            return error_response('当前用户不存在', 404)

        from models import UserAccount
        account = UserAccount.query.filter_by(user_id=user.id).first()
        if not account:
            return error_response('当前没有绑定账号')

        # 解除关联：仅将 account.user_id 设为 None
        # 账号记录保留，但不再指向当前用户
        account.user_id = None
        db.session.commit()

        # 注意：这里我们返回 success，用户仍然保留 WeChat 登录状态和数据
        # 账号变成了"无主账号"（孤立账号），等待下次绑定
        return success_response(user_schema.dump(user), '已解除账号绑定，账号已独立保留')

    except Exception as e:
        db.session.rollback()
        return error_response(f'解除账号绑定失败: {str(e)}')


@auth_bp.route('/trial', methods=['POST'])
@login_required
def start_trial():
    try:
        user = request.current_user
        if not user:
            return error_response('未登录', 401)

        from datetime import datetime, timedelta
        now = datetime.utcnow()
        mode = getattr(user, 'user_mode', 'personal')
        if mode == 'team' and getattr(user, 'current_team_id', None):
            team_id = user.current_team_id
            setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='trial_team_30_used').first()
            if setting:
                return error_response('已使用过团队试用', 400)
            if user.subscription_tier == 'team' and user.subscription_expire_at and user.subscription_expire_at > now:
                return error_response('当前已是团队会员，无需试用', 400)
            user.subscription_tier = 'team'
            user.subscription_expire_at = now + timedelta(days=30)
            record = UserSetting(user_id=user.id, team_id=team_id, key='trial_team_30_used', value='{"days":30}')
            db.session.add(record)
            db.session.commit()
            data = {
                'tier': 'team',
                'expire_at': user.subscription_expire_at.isoformat() if user.subscription_expire_at else None,
                'duration_days': 30
            }
            return success_response(data, '试用已开通')
        else:
            team_id = None
            setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='trial_pro_30_used').first()
            if setting:
                return error_response('已使用过试用', 400)
            if user.subscription_tier == 'pro' and user.subscription_expire_at and user.subscription_expire_at > now:
                return error_response('当前已是会员，无需试用', 400)
            user.subscription_tier = 'pro'
            user.subscription_expire_at = now + timedelta(days=30)
            record = UserSetting(user_id=user.id, team_id=team_id, key='trial_pro_30_used', value='{"days":30}')
            db.session.add(record)
            db.session.commit()
            data = {
                'tier': 'pro',
                'expire_at': user.subscription_expire_at.isoformat() if user.subscription_expire_at else None,
                'duration_days': 30
            }
            return success_response(data, '试用已开通')
    except Exception as e:
        db.session.rollback()
        return error_response(f'开通试用失败: {str(e)}')
