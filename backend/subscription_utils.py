from datetime import datetime
from functools import wraps
from flask import jsonify, g
from models import User, Parrot

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
                    return True
                return current_count < 1000
            else:
                return current_count < 20

        # 个人模式
        else:
            current_count = Parrot.query.filter_by(user_id=user.id, is_active=True, team_id=None).count()
            if tier == 'pro':
                return current_count < 100
            return current_count < 10
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
