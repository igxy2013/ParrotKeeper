from flask import Blueprint, request
from sqlalchemy import func
from models import db, User, Announcement, Parrot, Expense
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

        # 批量统计：每个用户的鹦鹉数量与总支出
        user_ids = [u.id for u in result['items']]
        parrot_counts = {}
        total_expenses = {}
        if user_ids:
            # 统计鹦鹉数量（仅激活）
            pc_rows = db.session.query(Parrot.user_id, func.count(Parrot.id))\
                .filter(Parrot.user_id.in_(user_ids), Parrot.is_active.is_(True))\
                .group_by(Parrot.user_id).all()
            for uid, cnt in pc_rows:
                parrot_counts[uid] = int(cnt or 0)

            # 统计总支出（个人与团队均按创建者聚合）
            te_rows = db.session.query(Expense.user_id, func.coalesce(func.sum(Expense.amount), 0))\
                .filter(Expense.user_id.in_(user_ids))\
                .group_by(Expense.user_id).all()
            for uid, total in te_rows:
                # 转为 float 以便前端显示
                total_expenses[uid] = float(total or 0)

        # 构造返回字段并附加统计数据
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
                'points': u.points,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'parrot_count': parrot_counts.get(u.id, 0),
                'total_expense': total_expenses.get(u.id, 0.0)
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
                'created_by_user_id': a.created_by_user_id,
                'scheduled_at': a.scheduled_at.isoformat() if getattr(a, 'scheduled_at', None) else None
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
        if status not in {'draft', 'published', 'scheduled'}:
            return error_response('无效状态')
        # 处理定时发布时间
        scheduled_at = None
        if status == 'scheduled':
            sa = body.get('scheduled_at')
            if not sa:
                return error_response('定时发布需提供发布时间')
            try:
                from datetime import datetime
                scheduled_at = datetime.fromisoformat(sa)
            except Exception:
                return error_response('发布时间格式无效，应为ISO时间')

        ann = Announcement(title=title, content=content, status=status, created_by_user_id=user.id, scheduled_at=scheduled_at)
        db.session.add(ann)
        db.session.commit()

        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None,
            'scheduled_at': ann.scheduled_at.isoformat() if ann.scheduled_at else None
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

        # 已发布公告不允许直接编辑；草稿与定时可编辑
        if ann.status == 'published':
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
            if status not in {'draft', 'published', 'scheduled'}:
                return error_response('无效状态')
            ann.status = status

        # 允许更新/设定定时发布时间
        if 'scheduled_at' in body:
            sa = body.get('scheduled_at')
            if sa:
                try:
                    from datetime import datetime
                    ann.scheduled_at = datetime.fromisoformat(sa)
                except Exception:
                    return error_response('发布时间格式无效，应为ISO时间')
            else:
                ann.scheduled_at = None

        db.session.commit()

        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None,
            'scheduled_at': ann.scheduled_at.isoformat() if ann.scheduled_at else None
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
