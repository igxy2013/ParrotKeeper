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
    免费用户限制 5 只。
    """
    tier = get_effective_subscription_tier(user)
    
    # Pro 和 Team 用户无限制
    if tier in ['pro', 'team']:
        return True
        
    # 免费用户检查数量
    current_count = Parrot.query.filter_by(user_id=user.id, is_active=True).count()
    if current_count >= 5:
        return False
        
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
