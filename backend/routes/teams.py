from flask import Blueprint, request, jsonify
from models import db, User, Parrot
from team_models import Team, TeamMember, TeamParrot, TeamInvitation
from utils import login_required, success_response, error_response
from datetime import datetime, timedelta
import random
import string
from sqlalchemy import or_, and_

teams_bp = Blueprint('teams', __name__, url_prefix='/api/teams')

def generate_invite_code(length=8):
    """生成邀请码"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_invitation_code(length=32):
    """生成邀请链接码"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

@teams_bp.route('', methods=['GET'])
@login_required
def get_user_teams():
    """获取用户的团队列表"""
    try:
        user = request.current_user
        
        # 获取用户参与的所有团队
        team_members = TeamMember.query.filter_by(user_id=user.id, is_active=True).all()
        
        teams = []
        for member in team_members:
            team = member.team
            if team.is_active:
                teams.append({
                    'id': team.id,
                    'name': team.name,
                    'description': team.description,
                    'invite_code': team.invite_code,  # 添加邀请码字段
                    'role': member.role,
                    'member_count': TeamMember.query.filter_by(team_id=team.id, is_active=True).count(),
                    'is_current': user.current_team_id == team.id,
                    'created_at': team.created_at.isoformat(),
                    'owner': {
                        'id': team.owner.id,
                        'nickname': team.owner.nickname
                    }
                })
        
        return success_response(teams, '获取团队列表成功')
        
    except Exception as e:
        return error_response(f'获取团队列表失败: {str(e)}')

@teams_bp.route('', methods=['POST'])
@login_required
def create_team():
    """创建团队"""
    try:
        user = request.current_user
        data = request.get_json()
        
        if not data.get('name'):
            return error_response('团队名称不能为空')
        
        # 生成唯一邀请码
        invite_code = generate_invite_code()
        while Team.query.filter_by(invite_code=invite_code).first():
            invite_code = generate_invite_code()
        
        # 创建团队
        team = Team(
            name=data['name'],
            description=data.get('description', ''),
            avatar_url=data.get('avatar_url', ''),
            invite_code=invite_code,
            owner_id=user.id
        )
        
        db.session.add(team)
        db.session.flush()  # 获取team.id
        
        # 创建团队成员记录（创建者自动成为创建者 owner）
        team_member = TeamMember(
            team_id=team.id,
            user_id=user.id,
            role='owner',
            permissions={'all': True}
        )
        
        db.session.add(team_member)
        
        # 设置为用户当前团队
        user.current_team_id = team.id
        
        db.session.commit()
        
        return success_response({
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'avatar_url': team.avatar_url,
            'invite_code': invite_code,
            'role': 'owner'
        }, '团队创建成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建团队失败: {str(e)}')

@teams_bp.route('/<int:team_id>', methods=['GET'])
@login_required
def get_team_detail(team_id):
    """获取团队详情"""
    try:
        user = request.current_user
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员', 403)
        
        team = member.team
        if not team.is_active:
            return error_response('团队不存在', 404)
        
        # 获取团队成员列表
        members = []
        team_members = TeamMember.query.filter_by(team_id=team_id, is_active=True).all()
        for tm in team_members:
            members.append({
                'id': tm.user.id,
                'nickname': tm.user.nickname,
                'avatar_url': tm.user.avatar_url,
                'role': tm.role,
                'joined_at': tm.joined_at.isoformat()
            })
        
        # 获取团队共享的鹦鹉
        shared_parrots = []
        team_parrots = TeamParrot.query.filter_by(team_id=team_id, is_active=True).all()
        for tp in team_parrots:
            parrot = tp.parrot
            if parrot.is_active:
                shared_parrots.append({
                    'id': parrot.id,
                    'name': parrot.name,
                    'species': parrot.species.name if parrot.species else None,
                    'avatar_url': parrot.avatar_url,
                    'shared_by': {
                        'id': tp.shared_by_user.id,
                        'nickname': tp.shared_by_user.nickname
                    },
                    'permissions': tp.permissions,
                    'shared_at': tp.shared_at.isoformat()
                })
        
        team_detail = {
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'avatar_url': team.avatar_url,
            'invite_code': team.invite_code,
            'owner_id': team.owner_id,
            'member_count': len(members),
            'members': members,
            'shared_parrots': shared_parrots,
            'user_role': member.role,
            'created_at': team.created_at.isoformat()
        }
        
        return success_response(team_detail, '获取团队详情成功')
        
    except Exception as e:
        return error_response(f'获取团队详情失败: {str(e)}')

@teams_bp.route('/<int:team_id>/members', methods=['GET'])
@login_required
def get_team_members(team_id):
    """获取团队成员列表"""
    try:
        user = request.current_user
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员', 403)
        
        team = member.team
        if not team.is_active:
            return error_response('团队不存在', 404)
        
        # 获取团队成员列表
        members = []
        team_members = TeamMember.query.filter_by(team_id=team_id, is_active=True).all()
        for tm in team_members:
            members.append({
                'user_id': tm.user.id,
                'id': tm.user.id,  # 兼容前端
                'nickname': tm.user.nickname,
                'avatar_url': tm.user.avatar_url,
                'role': tm.role,
                'joined_at': tm.joined_at.isoformat()
            })
        
        return success_response(members, '获取团队成员列表成功')
        
    except Exception as e:
        return error_response(f'获取团队成员列表失败: {str(e)}')

@teams_bp.route('/join', methods=['POST'])
@login_required
def join_team():
    """通过邀请码加入团队"""
    try:
        user = request.current_user
        data = request.get_json()
        
        invite_code = data.get('invite_code')
        if not invite_code:
            return error_response('邀请码不能为空')
        
        # 查找团队
        team = Team.query.filter_by(invite_code=invite_code, is_active=True).first()
        if not team:
            return error_response('邀请码无效')
        
        # 检查是否已经是团队成员
        existing_member = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
        if existing_member:
            if existing_member.is_active:
                return error_response('您已经是该团队成员')
            else:
                # 重新激活成员资格
                existing_member.is_active = True
                existing_member.joined_at = datetime.utcnow()
        else:
            # 创建新的团队成员记录
            team_member = TeamMember(
                team_id=team.id,
                user_id=user.id,
                role='admin',
                permissions={'all': True}
            )
            db.session.add(team_member)
        
        # 如果用户没有当前团队，设置为当前团队
        if not user.current_team_id:
            user.current_team_id = team.id
        
        db.session.commit()
        
        return success_response({
            'team_id': team.id,
            'team_name': team.name,
            'role': 'admin'
        }, '加入团队成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'加入团队失败: {str(e)}')

@teams_bp.route('/<int:team_id>/switch', methods=['POST'])
@login_required
def switch_team(team_id):
    """切换当前团队"""
    try:
        user = request.current_user
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员', 403)
        
        # 切换团队
        user.current_team_id = team_id
        db.session.commit()
        
        return success_response({'current_team_id': team_id}, '切换团队成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'切换团队失败: {str(e)}')

@teams_bp.route('/<int:team_id>/parrots', methods=['POST'])
@login_required
def share_parrot_to_team(team_id):
    """分享鹦鹉到团队"""
    try:
        user = request.current_user
        data = request.get_json()
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员', 403)
        
        parrot_id = data.get('parrot_id')
        if not parrot_id:
            return error_response('鹦鹉ID不能为空')
        
        # 检查鹦鹉是否属于用户
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
        if not parrot:
            return error_response('鹦鹉不存在或不属于您')
        
        # 检查是否已经分享过
        existing_share = TeamParrot.query.filter_by(team_id=team_id, parrot_id=parrot_id).first()
        if existing_share:
            if existing_share.is_active:
                return error_response('该鹦鹉已经分享到团队')
            else:
                # 重新激活分享
                existing_share.is_active = True
                existing_share.shared_at = datetime.utcnow()
        else:
            # 创建新的分享记录
            team_parrot = TeamParrot(
                team_id=team_id,
                parrot_id=parrot_id,
                shared_by=user.id,
                permissions=data.get('permissions', {'view': True, 'add_record': True})
            )
            db.session.add(team_parrot)
        
        db.session.commit()
        
        return success_response({
            'parrot_id': parrot_id,
            'parrot_name': parrot.name
        }, '鹦鹉分享成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'分享鹦鹉失败: {str(e)}')

@teams_bp.route('/<int:team_id>/members/<int:user_id>/role', methods=['PUT'])
@login_required
def change_member_role(team_id, user_id):
    """修改团队成员角色"""
    try:
        user = request.current_user
        data = request.get_json()
        
        if not data or 'role' not in data:
            return error_response('请提供新角色')
        
        new_role = data['role']
        if new_role not in ['member', 'admin']:
            return error_response('无效的角色类型')
        
        # 检查操作权限（移除限制：普通成员也可以修改角色）
        operator_member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not operator_member:
            return error_response('您不是该团队成员', 403)
        
        # 查找要修改的成员
        target_member = TeamMember.query.filter_by(team_id=team_id, user_id=user_id, is_active=True).first()
        if not target_member:
            return error_response('成员不存在')
        
        # 不能修改团队创建者的角色（根据team.owner_id识别创建者）
        team = operator_member.team
        if target_member.user_id == team.owner_id:
            return error_response('不能修改团队创建者的角色')
        
        # 修改角色
        target_member.role = new_role
        db.session.commit()
        
        return success_response({
            'user_id': user_id,
            'new_role': new_role
        }, '角色修改成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'修改角色失败: {str(e)}')

@teams_bp.route('/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
@login_required
def remove_team_member(team_id, user_id):
    """移除团队成员"""
    try:
        user = request.current_user
        
        # 检查操作权限（移除限制：普通成员也可以移除成员）
        operator_member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not operator_member:
            return error_response('您不是该团队成员', 403)
        
        # 查找要移除的成员
        target_member = TeamMember.query.filter_by(team_id=team_id, user_id=user_id, is_active=True).first()
        if not target_member:
            return error_response('成员不存在')
        
        # 不能移除团队创建者
        if target_member.role == 'owner':
            return error_response('不能移除团队创建者')
        
        # 移除成员
        target_member.is_active = False
        
        # 如果被移除的用户当前团队是这个团队，清除当前团队
        target_user = target_member.user
        if target_user.current_team_id == team_id:
            target_user.current_team_id = None
        
        db.session.commit()
        
        return success_response(message='成员移除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'移除成员失败: {str(e)}')

@teams_bp.route('/<int:team_id>/leave', methods=['POST'])
@login_required
def leave_team(team_id):
    """离开团队"""
    try:
        user = request.current_user
        
        # 查找团队成员记录
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员')
        
        # 团队创建者不能离开团队（根据team.owner_id识别创建者）
        team = member.team
        if member.user_id == team.owner_id:
            return error_response('团队创建者不能离开团队，请先转让团队或删除团队')
        
        # 离开团队
        member.is_active = False
        
        # 如果当前团队是这个团队，清除当前团队
        if user.current_team_id == team_id:
            user.current_team_id = None
        
        db.session.commit()
        
        return success_response(message='离开团队成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'离开团队失败: {str(e)}')

@teams_bp.route('/current', methods=['GET'])
@login_required
def get_current_team():
    """获取当前团队信息"""
    try:
        user = request.current_user
        
        if not user.current_team_id:
            return success_response(None, '未选择团队')
        
        # 检查用户是否还是团队成员
        member = TeamMember.query.filter_by(
            team_id=user.current_team_id, 
            user_id=user.id, 
            is_active=True
        ).first()
        
        if not member:
            # 清除无效的当前团队
            user.current_team_id = None
            db.session.commit()
            return success_response(None, '当前团队无效，已清除')
        
        team = member.team
        if not team.is_active:
            user.current_team_id = None
            db.session.commit()
            return success_response(None, '当前团队已被删除，已清除')
        
        return success_response({
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'subscription_level': getattr(team, 'subscription_level', None),
            'role': member.role,
            'member_count': TeamMember.query.filter_by(team_id=team.id, is_active=True).count()
        }, '获取当前团队成功')
        
    except Exception as e:
        return error_response(f'获取当前团队失败: {str(e)}')

@teams_bp.route('/current/parrots', methods=['GET'])
@login_required
def get_current_team_parrots():
    """获取当前团队的鹦鹉列表"""
    try:
        user = request.current_user
        
        if not user.current_team_id:
            return error_response('未选择团队')
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(
            team_id=user.current_team_id, 
            user_id=user.id, 
            is_active=True
        ).first()
        
        if not member:
            return error_response('您不是该团队成员', 403)
        
        # 获取团队共享的鹦鹉
        team_parrots = TeamParrot.query.filter_by(
            team_id=user.current_team_id, 
            is_active=True
        ).all()
        
        parrots = []
        for tp in team_parrots:
            parrot = tp.parrot
            if parrot.is_active:
                parrots.append({
                    'id': parrot.id,
                    'name': parrot.name,
                    'species': parrot.species.name if parrot.species else None,
                    'gender': parrot.gender,
                    'health_status': parrot.health_status,
                    'avatar_url': parrot.avatar_url,
                    'owner': {
                        'id': parrot.owner.id,
                        'nickname': parrot.owner.nickname
                    },
                    'shared_by': {
                        'id': tp.shared_by_user.id,
                        'nickname': tp.shared_by_user.nickname
                    },
                    'permissions': tp.permissions,
                    'shared_at': tp.shared_at.isoformat()
                })
        
        return success_response(parrots, '获取团队鹦鹉列表成功')
        
    except Exception as e:
        return error_response(f'获取团队鹦鹉列表失败: {str(e)}')

@teams_bp.route('/<int:team_id>', methods=['PUT'])
@login_required
def update_team(team_id):
    """更新团队信息"""
    try:
        user = request.current_user
        data = request.get_json()
        
        # 检查用户是否是团队成员
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('您不是该团队成员', 403)
        
        team = member.team
        if not team.is_active:
            return error_response('团队不存在', 404)
        
        # 更新团队名称
        if 'name' in data:
            if not data['name'].strip():
                return error_response('团队名称不能为空')
            team.name = data['name'].strip()
        
        # 更新团队描述
        if 'description' in data:
            team.description = data.get('description', '')
        
        # 更新团队头像
        if 'avatar_url' in data:
            team.avatar_url = data.get('avatar_url', '')
        
        team.updated_at = datetime.utcnow()
        db.session.commit()
        
        return success_response({
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'avatar_url': team.avatar_url
        }, '团队信息更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新团队信息失败: {str(e)}')

@teams_bp.route('/<int:team_id>', methods=['DELETE'])
@login_required
def dissolve_team(team_id):
    """解散团队（仅创建者）"""
    try:
        user = request.current_user
        # 验证操作者成员身份
        operator_member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id, is_active=True).first()
        if not operator_member:
            return error_response('您不是该团队成员', 403)

        team = operator_member.team
        if not team or not team.is_active:
            return error_response('团队不存在', 404)

        # 软删除团队
        team.is_active = False
        team.updated_at = datetime.utcnow()

        # 失效所有成员资格并清理 current_team_id
        team_members = TeamMember.query.filter_by(team_id=team_id, is_active=True).all()
        for tm in team_members:
            tm.is_active = False
            if tm.user.current_team_id == team_id:
                tm.user.current_team_id = None

        # 失效共享鹦鹉记录（如存在）
        team_parrots = TeamParrot.query.filter_by(team_id=team_id, is_active=True).all()
        for tp in team_parrots:
            tp.is_active = False

        db.session.commit()

        return success_response({'id': team_id}, '团队已解散')
    except Exception as e:
        db.session.rollback()
        return error_response(f'解散团队失败: {str(e)}')
