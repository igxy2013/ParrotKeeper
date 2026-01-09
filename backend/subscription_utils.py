from datetime import datetime
from functools import wraps
from flask import jsonify, g
from models import User, Parrot, SystemSetting

def get_effective_subscription_tier(user: User) -> str:
    """
    获取用户的有效会员等级（按模式生效）。
    - 团队会员仅在团队模式下有效
    - 个人会员仅在个人模式下有效
    过期视为 free。
    """
    if not user:
        return 'free'

    now = datetime.utcnow()
    mode = getattr(user, 'user_mode', 'personal')

    # 团队模式：优先使用用户团队试用，其次团队订阅等级
    if mode == 'team' and getattr(user, 'current_team_id', None):
        try:
            # 团队试用：用户维度的 team 订阅在未过期时生效
            if user.subscription_tier == 'team':
                if not user.subscription_expire_at or user.subscription_expire_at > now:
                    return 'team'
        except Exception:
            pass
        try:
            from team_models import Team
            team = Team.query.get(user.current_team_id)
            if team and team.is_active:
                if getattr(team, 'subscription_level', None) in ['basic', 'advanced']:
                    return 'team'
        except Exception:
            pass
        return 'free'

    # 个人模式：仅判断个人会员是否有效
    try:
        if user.subscription_tier == 'pro':
            if not user.subscription_expire_at or user.subscription_expire_at > now:
                return 'pro'
    except Exception:
        pass
    return 'free'

def check_parrot_limit(user: User) -> bool:
    """
    检查用户是否可以添加更多鹦鹉。
    免费用户：个人模式限制 10 只；团队模式限制 20 只。
    付费：
    - 个人会员（pro，个人模式下）：100
    - 团队会员（team，团队模式下）：根据团队订阅版本（basic 1000，advanced 不限）
    """
    try:
        row = SystemSetting.query.filter_by(key='MEMBERSHIP_ENABLED').first()
        val = str(row.value).strip().lower() if row and row.value is not None else ''
        enabled = True if val in ['1', 'true', 'yes', 'y'] else (False if val in ['0', 'false', 'no', 'n'] else True)
        if not enabled:
            return True
    except Exception:
        pass
    personal_free_limit = 10
    team_free_limit = 20
    pro_limit_personal = 100
    team_limit_basic = 1000
    team_limit_advanced = 0
    try:
        p_row = SystemSetting.query.filter_by(key='FREE_LIMIT_PERSONAL').first()
        t_row = SystemSetting.query.filter_by(key='FREE_LIMIT_TEAM').first()
        pr_row = SystemSetting.query.filter_by(key='PRO_LIMIT_PERSONAL').first()
        tb_row = SystemSetting.query.filter_by(key='TEAM_LIMIT_BASIC').first()
        ta_row = SystemSetting.query.filter_by(key='TEAM_LIMIT_ADVANCED').first()
        if p_row and p_row.value is not None:
            try:
                personal_free_limit = max(0, int(str(p_row.value).strip()))
            except Exception:
                personal_free_limit = 10
        if t_row and t_row.value is not None:
            try:
                team_free_limit = max(0, int(str(t_row.value).strip()))
            except Exception:
                team_free_limit = 20
        if pr_row and pr_row.value is not None:
            try:
                pro_limit_personal = max(0, int(str(pr_row.value).strip()))
            except Exception:
                pro_limit_personal = 100
        if tb_row and tb_row.value is not None:
            try:
                team_limit_basic = max(0, int(str(tb_row.value).strip()))
            except Exception:
                team_limit_basic = 1000
        if ta_row and ta_row.value is not None:
            try:
                team_limit_advanced = max(0, int(str(ta_row.value).strip()))
            except Exception:
                team_limit_advanced = 0
    except Exception:
        pass
    tier = get_effective_subscription_tier(user)

    try:
        # 团队模式
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            if not getattr(user, 'current_team_id', None):
                return True

            from team_models import Team
            team_level = 'basic'
            try:
                team = Team.query.get(user.current_team_id)
                if team and team.subscription_level in ['basic', 'advanced']:
                    team_level = team.subscription_level
            except Exception:
                pass

            current_count = Parrot.query.filter_by(team_id=user.current_team_id, is_active=True).count()

            if tier == 'team':
                if team_level == 'advanced':
                    if team_limit_advanced <= 0:
                        return True
                    return current_count < team_limit_advanced
                return current_count < team_limit_basic
            else:
                return current_count < team_free_limit

        # 个人模式
        else:
            current_count = Parrot.query.filter_by(user_id=user.id, is_active=True, team_id=None).count()
            if tier == 'pro':
                return current_count < pro_limit_personal
            return current_count < personal_free_limit
    except Exception:
        return True

def require_subscription(min_tier='pro'):
    """
    装饰器：要求特定的会员等级
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 假设 g.user 已经在之前的 login_required 中被设置
            if not hasattr(g, 'user') or not g.user:
                return jsonify({'error': 'User not authenticated'}), 401
            
            tier = get_effective_subscription_tier(g.user)
            
            # 等级权重
            tiers = {'free': 0, 'pro': 1, 'team': 2}
            
            if tiers.get(tier, 0) < tiers.get(min_tier, 0):
                return jsonify({
                    'error': 'Subscription required',
                    'message': f'This feature requires {min_tier} subscription.',
                    'required_tier': min_tier,
                    'current_tier': tier
                }), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator
