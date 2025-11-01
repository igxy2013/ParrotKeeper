from flask import Blueprint, request
from models import db, User, Announcement
from utils import login_required, success_response, error_response, paginate_query

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@login_required
def list_users():
    """仅超级管理员可查看用户列表，支持搜索与分页"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        q = (request.args.get('q') or '').strip()

        query = User.query.order_by(User.created_at.desc())
        if q:
            # 支持按昵称、用户名、手机号、openid搜索
            query = query.filter(
                db.or_(
                    User.nickname.contains(q),
                    User.username.contains(q),
                    User.phone.contains(q),
                    User.openid.contains(q)
                )
            )

        result = paginate_query(query, page, per_page)
        # 为避免引入额外依赖，直接构造必要字段
        items = []
        for u in result['items']:
            items.append({
                'id': u.id,
                'openid': u.openid,
                'username': u.username,
                'nickname': u.nickname,
                'avatar_url': u.avatar_url,
                'phone': u.phone,
                'role': u.role,
                'login_type': u.login_type,
                'user_mode': u.user_mode,
                'created_at': u.created_at.isoformat() if u.created_at else None
            })

        return success_response({
            'users': items,
            'total': result['total'],
            'pages': result['pages'],
            'current_page': result['current_page'],
            'per_page': result['per_page'],
            'has_next': result['has_next'],
            'has_prev': result['has_prev']
        })
    except Exception as e:
        return error_response(f'获取用户列表失败: {str(e)}')


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@login_required
def update_user_role(user_id):
    """仅超级管理员可变更用户角色"""
    try:
        current = request.current_user
        if not current or current.role != 'super_admin':
            return error_response('无权限', 403)

        target = User.query.get(user_id)
        if not target:
            return error_response('用户不存在', 404)

        data = request.get_json() or {}
        role = (data.get('role') or '').strip()
        allowed = {'super_admin', 'admin', 'user'}
        if role not in allowed:
            return error_response('无效的角色值', 400)

        target.role = role
        db.session.commit()

        return success_response({
            'id': target.id,
            'role': target.role
        }, '角色更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'角色更新失败: {str(e)}')


@admin_bp.route('/announcements', methods=['GET'])
@login_required
def list_announcements():
    """仅超级管理员可查看公告列表"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        items = Announcement.query.order_by(Announcement.created_at.desc()).all()
        data = []
        for a in items:
            data.append({
                'id': a.id,
                'title': a.title,
                'content': a.content,
                'status': a.status,
                'created_at': a.created_at.isoformat() if a.created_at else None,
                'created_by_user_id': a.created_by_user_id
            })
        return success_response({'announcements': data})
    except Exception as e:
        return error_response(f'获取公告列表失败: {str(e)}')


@admin_bp.route('/announcements', methods=['POST'])
@login_required
def create_announcement():
    """创建系统公告（仅超级管理员）"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        body = request.get_json() or {}
        title = (body.get('title') or '').strip()
        content = (body.get('content') or '').strip()
        status = (body.get('status') or 'published').strip()
        if not title:
            return error_response('标题不能为空')
        if not content:
            return error_response('内容不能为空')
        if status not in {'draft', 'published'}:
            return error_response('无效状态')

        ann = Announcement(title=title, content=content, status=status, created_by_user_id=user.id)
        db.session.add(ann)
        db.session.commit()

        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None
        }, '公告已创建')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建公告失败: {str(e)}')


@admin_bp.route('/announcements/<int:ann_id>', methods=['PUT'])
@login_required
def update_announcement(ann_id):
    """更新公告（仅超级管理员；草稿可编辑）"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        ann = Announcement.query.get(ann_id)
        if not ann:
            return error_response('公告不存在', 404)

        # 已发布公告不允许直接编辑
        if ann.status != 'draft':
            return error_response('已发布公告不可编辑', 400)

        body = request.get_json() or {}

        # 允许部分字段更新
        if 'title' in body:
            title = (body.get('title') or '').strip()
            if not title:
                return error_response('标题不能为空')
            ann.title = title

        if 'content' in body:
            content = (body.get('content') or '').strip()
            if not content:
                return error_response('内容不能为空')
            ann.content = content

        if 'status' in body:
            status = (body.get('status') or '').strip()
            if status not in {'draft', 'published'}:
                return error_response('无效状态')
            ann.status = status

        db.session.commit()

        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None
        }, '公告已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新公告失败: {str(e)}')

@admin_bp.route('/announcements/<int:ann_id>', methods=['DELETE'])
@login_required
def delete_announcement(ann_id):
    """删除公告（仅超级管理员）"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        ann = Announcement.query.get(ann_id)
        if not ann:
            return error_response('公告不存在', 404)
        db.session.delete(ann)
        db.session.commit()
        return success_response({'id': ann_id}, '已删除')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除公告失败: {str(e)}')
