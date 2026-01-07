from datetime import datetime
from functools import wraps
from flask import jsonify, g
from models import User, Parrot

def get_effective_subscription_tier(user: User) -> str:
    """
    获取用户的有效会员等级。
    检查过期时间，如果已过期则视为 free。
    """
    if not user:
        return 'free'
    
    try:
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and getattr(user, 'current_team_id', None):
            from team_models import Team
            team = Team.query.get(user.current_team_id)
            if team and team.is_active and team.owner:
                owner = team.owner
                if owner and owner.subscription_tier == 'team':
                    if not owner.subscription_expire_at or owner.subscription_expire_at > datetime.utcnow():
                        return 'team'
    except Exception:
        pass
    if user.subscription_tier == 'free':
        return 'free'
    
    # 如果是 pro 或 team，检查是否过期
    if user.subscription_expire_at:
        if user.subscription_expire_at < datetime.utcnow():
            return 'free'
            
    return user.subscription_tier

def check_parrot_limit(user: User) -> bool:
    """
    检查用户是否可以添加更多鹦鹉。
    免费用户：个人模式限制 5 只；团队模式限制 10 只。
    付费（pro、team）无限制。
    """
    tier = get_effective_subscription_tier(user)

    # 新版限制：
    # free: 个人5 / 团队10
    # pro: 100
    # team: 基础版1000 / 高级版无限制
    if tier == 'pro':
        try:
            current_count = Parrot.query.filter_by(user_id=user.id, is_active=True, team_id=None).count()
            return current_count < 100
        except Exception:
            return True

    try:
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            if not getattr(user, 'current_team_id', None):
                return True
            # 团队版：根据团队订阅版本限制
            team_level = 'basic'
            try:
                from team_models import Team
                team = Team.query.get(user.current_team_id)
                if team and team.subscription_level in ['basic', 'advanced']:
                    team_level = team.subscription_level
            except Exception:
                pass
            current_count = Parrot.query.filter_by(team_id=user.current_team_id, is_active=True).count()
            if team_level == 'advanced':
                return True
            return current_count < 1000
        else:
            current_count = Parrot.query.filter_by(user_id=user.id, is_active=True, team_id=None).count()
            return current_count < 5
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
