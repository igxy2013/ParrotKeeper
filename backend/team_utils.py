from functools import wraps
from flask import request, jsonify
from models import User, Parrot
from team_models import Team, TeamMember, TeamParrot
from utils import error_response

def compute_effective_permissions(team_id, user_id):
    member = TeamMember.query.filter_by(team_id=team_id, user_id=user_id, is_active=True).first()
    if not member:
        return {}
    result = {}
    if member.role in ['owner', 'admin']:
        result['all'] = True
        return result
    if isinstance(member.permissions, dict):
        for k, v in member.permissions.items():
            if v:
                result[k] = True
    if member.group_id:
        from team_models import TeamGroup
        grp = TeamGroup.query.filter_by(id=member.group_id, team_id=team_id, is_active=True).first()
        if grp and isinstance(grp.permissions, dict):
            for k, v in grp.permissions.items():
                if v:
                    result[k] = True
    return result

def team_required(f):
    """需要团队权限的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = request.current_user
        if not user:
            return error_response('未登录', 401)
        
        if not user.current_team_id:
            return error_response('请先选择团队', 400)
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(
            team_id=user.current_team_id, 
            user_id=user.id, 
            is_active=True
        ).first()
        
        if not member:
            return error_response('您不是该团队成员', 403)
        
        # 将团队成员信息添加到请求上下文
        request.current_team_member = member
        request.current_team = member.team
        
        return f(*args, **kwargs)
    return decorated_function

def team_admin_required(f):
    """需要团队管理员权限的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = request.current_user
        if not user:
            return error_response('未登录', 401)
        
        if not user.current_team_id:
            return error_response('请先选择团队', 400)
        
        # 检查用户是否是团队管理员
        member = TeamMember.query.filter_by(
            team_id=user.current_team_id, 
            user_id=user.id, 
            is_active=True
        ).first()
        
        if not member or member.role not in ['owner', 'admin']:
            return error_response('您没有管理员权限', 403)
        
        # 将团队成员信息添加到请求上下文
        request.current_team_member = member
        request.current_team = member.team
        
        return f(*args, **kwargs)
    return decorated_function

def can_access_parrot(user, parrot_id, permission='view'):
    """检查用户是否可以访问指定鹦鹉"""
    parrot = Parrot.query.filter_by(id=parrot_id, is_active=True).first()
    if not parrot:
        return False, None

    # 1. 如果是拥有者，直接允许
    if parrot.user_id == user.id:
        return True, parrot
    
    # 2. 团队模式逻辑：如果鹦鹉属于用户当前团队，允许访问
    if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
        if parrot.team_id == user.current_team_id:
            return True, parrot

    # 3. 检查是否通过团队共享访问（兼容旧逻辑）
    if user.current_team_id:
        team_parrot = TeamParrot.query.filter_by(
            team_id=user.current_team_id,
            parrot_id=parrot_id,
            is_active=True
        ).first()
        
        if team_parrot:
            # 检查权限
            permissions = team_parrot.permissions or {}
            if permissions.get(permission, False) or permissions.get('all', False):
                return True, parrot
    
    return False, None

def get_accessible_parrots(user, permission='view'):
    """获取用户可访问的所有鹦鹉"""
    parrots = []
    
    # 检查用户模式
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队管理员创建的数据
        return get_team_admin_parrots(user, permission)
    
    # 个人模式：只返回用户自己的鹦鹉
    own_parrots = Parrot.query.filter_by(user_id=user.id, is_active=True).all()
    for parrot in own_parrots:
        parrots.append({
            'parrot': parrot,
            'access_type': 'owner',
            'permissions': {'all': True}
        })
    
    # 个人模式下不包含团队共享的鹦鹉，确保只显示用户自己的数据
    
    return parrots

def get_team_admin_parrots(user, permission='view'):
    """获取团队管理员创建的鹦鹉（团队模式专用）"""
    parrots = []
    
    if not user.current_team_id:
        return parrots
    
    # 获取团队信息
    from team_models import Team, TeamMember
    team = Team.query.get(user.current_team_id)
    if not team:
        return parrots
    
    # 获取团队管理员（owner和admin）
    admin_members = TeamMember.query.filter_by(
        team_id=user.current_team_id,
        is_active=True
    ).filter(TeamMember.role.in_(['owner', 'admin'])).all()
    
    admin_user_ids = [member.user_id for member in admin_members]
    
    # 获取管理员创建的鹦鹉
    admin_parrots = Parrot.query.filter(
        Parrot.user_id.in_(admin_user_ids),
        Parrot.is_active == True
    ).all()
    
    for parrot in admin_parrots:
        # 如果是用户自己的鹦鹉，标记为owner
        if parrot.user_id == user.id:
            parrots.append({
                'parrot': parrot,
                'access_type': 'owner',
                'permissions': {'all': True}
            })
        else:
            # 其他管理员的鹦鹉，标记为team_admin_shared
            parrots.append({
                'parrot': parrot,
                'access_type': 'team_admin_shared',
                'permissions': {'view': True, 'edit': False}  # 默认只能查看
            })
    
    return parrots

def parrot_access_required(permission='view'):
    """需要鹦鹉访问权限的装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = request.current_user
            if not user:
                return error_response('未登录', 401)
            
            # 从路径参数或请求数据中获取parrot_id
            parrot_id = kwargs.get('parrot_id')
            if not parrot_id:
                data = request.get_json() or {}
                parrot_id = data.get('parrot_id')
            
            if not parrot_id:
                return error_response('缺少鹦鹉ID参数', 400)
            
            # 检查访问权限
            can_access, parrot = can_access_parrot(user, parrot_id, permission)
            if not can_access:
                return error_response('您没有权限访问该鹦鹉', 403)
            
            # 将鹦鹉信息添加到请求上下文
            request.current_parrot = parrot
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
