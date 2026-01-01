from flask import Blueprint, request
from models import db, Announcement, SystemSetting, InvitationCode, User, Parrot
from team_models import TeamMember, Team
from sqlalchemy import func
from utils import login_required, success_response, error_response

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


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


@admin_bp.route('/api-configs', methods=['GET'])
@login_required
def get_api_configs():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        keys = [
            'REMOVE_BG_API_KEY', 'REMOVE_BG_API_URL',
            'ALIYUN_API_KEY', 'ALIYUN_BASE_URL', 'ALIYUN_MODEL'
        ]
        items = {}
        for k in keys:
            row = SystemSetting.query.filter_by(key=k).first()
            val = row.value if row and row.value is not None else ''
            masked = ''
            if val:
                tail = val[-4:] if len(val) > 4 else val
                masked = ('*' * max(0, len(val) - len(tail))) + tail
            items[k] = {
                'key': k,
                'value_masked': masked,
                'is_set': bool(val),
                'updated_at': (row.updated_at.isoformat() if row and getattr(row, 'updated_at', None) else None)
            }
        remove_list = []
        aliyun_list = []
        usage_map = {}
        try:
            import json, hashlib
            from datetime import datetime
            ym = datetime.now().strftime('%Y%m')
            usage_key = f'REMOVE_BG_USAGE_{ym}'
            ur = SystemSetting.query.filter_by(key=usage_key).first()
            if ur and ur.value:
                usage_map = json.loads(ur.value) if ur.value else {}
        except Exception:
            usage_map = {}
        try:
            rlist = SystemSetting.query.filter_by(key='REMOVE_BG_LIST').first()
            if rlist and rlist.value:
                import json
                arr = json.loads(rlist.value)
                if isinstance(arr, list):
                    for it in arr:
                        api_key = str(it.get('api_key') or '')
                        url = str(it.get('api_url') or '')
                        tag = str(it.get('tag') or '')
                        mk = ('*' * max(0, len(api_key) - 4)) + (api_key[-4:] if api_key else '')
                        mu = url
                        rem = 50
                        try:
                            ident = hashlib.sha1((api_key or '').encode('utf-8')).hexdigest()
                            used = int((usage_map.get(ident) or 0) or 0)
                            rem = max(0, 50 - used)
                        except Exception:
                            rem = 50
                        remove_list.append({'api_key_masked': mk, 'api_url': mu, 'tag': tag, 'api_key': api_key, 'remaining_quota': rem})
        except Exception:
            pass
        try:
            alist = SystemSetting.query.filter_by(key='ALIYUN_LIST').first()
            if alist and alist.value:
                import json
                arr = json.loads(alist.value)
                if isinstance(arr, list):
                    for it in arr:
                        api_key = str(it.get('api_key') or '')
                        base_url = str(it.get('base_url') or '')
                        model = str(it.get('model') or '')
                        tag = str(it.get('tag') or '')
                        mk = ('*' * max(0, len(api_key) - 4)) + (api_key[-4:] if api_key else '')
                        aliyun_list.append({'api_key_masked': mk, 'base_url': base_url, 'model': model, 'tag': tag, 'api_key': api_key})
        except Exception:
            pass
        return success_response({'configs': items, 'lists': {'remove_bg_list': remove_list, 'aliyun_list': aliyun_list}})
    except Exception as e:
        return error_response(f'获取API配置失败: {str(e)}')


@admin_bp.route('/users/stats', methods=['GET'])
@login_required
def get_users_stats():
    """用户统计：总用户数与团队用户数（去重）"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        total_users = User.query.count()
        team_user_count = db.session.query(User.id).join(TeamMember, TeamMember.user_id == User.id) \
            .filter(TeamMember.is_active == True).distinct().count()

        role_super_admin = User.query.filter(User.role == 'super_admin').count()
        role_admin = User.query.filter(User.role == 'admin').count()
        role_user = User.query.filter(User.role == 'user').count()

        team_count = Team.query.filter(Team.is_active == True).count()
        members_per_team = db.session.query(TeamMember.team_id, func.count(TeamMember.id)) \
            .filter(TeamMember.is_active == True).group_by(TeamMember.team_id).all()
        avg_members = 0.0
        if team_count > 0 and members_per_team:
            total_members = sum(c for _, c in members_per_team)
            avg_members = round(float(total_members) / float(team_count), 2)

        return success_response({
            'total_users': total_users,
            'team_users': team_user_count,
            'role_counts': {
                'super_admin': role_super_admin,
                'admin': role_admin,
                'user': role_user
            },
            'team_stats': {
                'team_count': team_count,
                'avg_members': avg_members
            }
        })
    except Exception as e:
        return error_response(f'获取用户统计失败: {str(e)}')


@admin_bp.route('/users', methods=['GET'])
@login_required
def list_users():
    """用户列表（基础信息，支持分页），仅超级管理员"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        try:
            page = int(request.args.get('page', 1))
            per_page = int(request.args.get('per_page', 50))
        except Exception:
            page, per_page = 1, 50
        per_page = max(1, min(200, per_page))
        offset = max(0, (page - 1) * per_page)

        q = User.query.order_by(User.created_at.desc())
        keyword = (request.args.get('keyword') or '').strip()
        role = (request.args.get('role') or '').strip()
        user_mode = (request.args.get('user_mode') or '').strip()
        sort_by = (request.args.get('sort_by') or '').strip()
        sort_order = (request.args.get('sort_order') or 'desc').strip()
        if keyword:
            like = f"%{keyword}%"
            q = q.filter(
                (User.nickname.ilike(like)) |
                (User.openid.ilike(like)) |
                (User.phone.ilike(like))
            )
        if role in ['super_admin', 'admin', 'user']:
            q = q.filter(User.role == role)
        if user_mode in ['personal', 'team']:
            q = q.filter(User.user_mode == user_mode)

        if sort_by == 'nickname':
            if sort_order == 'asc':
                q = q.order_by(User.nickname.asc())
            else:
                q = q.order_by(User.nickname.desc())
            total = q.count()
            items = q.offset(offset).limit(per_page).all()
        elif sort_by == 'points':
            if sort_order == 'asc':
                q = q.order_by(User.points.asc())
            else:
                q = q.order_by(User.points.desc())
            total = q.count()
            items = q.offset(offset).limit(per_page).all()
        elif sort_by == 'parrot_count':
            items_all = q.all()
            total = len(items_all)

            personal_counts_rows = db.session.query(Parrot.user_id, func.count(Parrot.id)) \
                .filter(Parrot.team_id.is_(None), Parrot.is_active == True) \
                .group_by(Parrot.user_id).all()
            personal_counts_map = {uid: cnt for uid, cnt in personal_counts_rows}

            team_counts_rows = db.session.query(Parrot.team_id, func.count(Parrot.id)) \
                .filter(Parrot.team_id.isnot(None), Parrot.is_active == True) \
                .group_by(Parrot.team_id).all()
            team_counts_map = {tid: cnt for tid, cnt in team_counts_rows}

            def _cnt(u):
                if u.user_mode == 'team' and u.current_team_id:
                    return int(team_counts_map.get(u.current_team_id, 0) or 0)
                return int(personal_counts_map.get(u.id, 0) or 0)

            items_all.sort(key=lambda u: _cnt(u), reverse=(sort_order != 'asc'))
            items = items_all[offset: offset + per_page]
        else:
            total = q.count()
            items = q.offset(offset).limit(per_page).all()

        personal_counts_rows = db.session.query(Parrot.user_id, func.count(Parrot.id)) \
            .filter(Parrot.team_id.is_(None), Parrot.is_active == True) \
            .group_by(Parrot.user_id).all()
        personal_counts_map = {uid: cnt for uid, cnt in personal_counts_rows}

        team_counts_rows = db.session.query(Parrot.team_id, func.count(Parrot.id)) \
            .filter(Parrot.team_id.isnot(None), Parrot.is_active == True) \
            .group_by(Parrot.team_id).all()
        team_counts_map = {tid: cnt for tid, cnt in team_counts_rows}

        data = []
        for u in items:
            data.append({
                'id': u.id,
                'openid': u.openid,
                'nickname': u.nickname,
                'avatar_url': u.avatar_url,
                'role': u.role,
                'user_mode': u.user_mode,
                'points': u.points or 0,
                'current_team_id': u.current_team_id,
                'created_at': u.created_at.isoformat() if getattr(u, 'created_at', None) else None,
                'parrot_count': int(team_counts_map.get(u.current_team_id, 0) or 0) if (u.user_mode == 'team' and u.current_team_id) else int(personal_counts_map.get(u.id, 0) or 0)
            })

        return success_response({
            'items': data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total
            }
        })
    except Exception as e:
        return error_response(f'获取用户列表失败: {str(e)}')


@admin_bp.route('/invitation-codes', methods=['GET'])
@login_required
def list_invitation_codes():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        query = InvitationCode.query.order_by(InvitationCode.created_at.desc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        items = []
        for row in pagination.items:
            items.append({
                'id': row.id,
                'code': row.code,
                'max_uses': row.max_uses,
                'used_count': row.used_count,
                'is_active': row.is_active,
                'created_at': row.created_at.isoformat() if row.created_at else None,
            })
        return success_response({
            'items': items,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total
        })
    except Exception as e:
        return error_response(f'获取邀请码列表失败: {str(e)}')


@admin_bp.route('/invitation-codes', methods=['POST'])
@login_required
def create_invitation_code():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        data = request.get_json() or {}
        max_uses = data.get('max_uses') or 30
        try:
            max_uses = int(max_uses)
        except Exception:
            max_uses = 30
        if max_uses <= 0:
            max_uses = 30

        import secrets
        code = secrets.token_urlsafe(8)

        row = InvitationCode(
            code=code,
            max_uses=max_uses,
            used_count=0,
            is_active=True,
            created_by_user_id=user.id
        )
        db.session.add(row)
        db.session.commit()

        return success_response({
            'id': row.id,
            'code': row.code,
            'max_uses': row.max_uses,
            'used_count': row.used_count,
            'is_active': row.is_active,
            'created_at': row.created_at.isoformat() if row.created_at else None,
        }, '邀请码已生成')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建邀请码失败: {str(e)}')


@admin_bp.route('/invitation-codes/<int:code_id>', methods=['PUT'])
@login_required
def update_invitation_code(code_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        row = InvitationCode.query.get(code_id)
        if not row:
            return error_response('邀请码不存在', 404)

        data = request.get_json() or {}
        if 'is_active' in data:
            row.is_active = bool(data.get('is_active'))
        db.session.commit()

        return success_response({'updated': True}, '已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新邀请码失败: {str(e)}')


@admin_bp.route('/api-configs', methods=['PUT'])
@login_required
def update_api_configs():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        body = request.get_json() or {}
        mapping = {
            'remove_bg_api_key': 'REMOVE_BG_API_KEY',
            'remove_bg_api_url': 'REMOVE_BG_API_URL',
            'aliyun_api_key': 'ALIYUN_API_KEY',
            'aliyun_base_url': 'ALIYUN_BASE_URL',
            'aliyun_model': 'ALIYUN_MODEL'
        }
        updated = {}
        for field, key in mapping.items():
            if field in body:
                val = body.get(field) or ''
                row = SystemSetting.query.filter_by(key=key).first()
                if not row:
                    row = SystemSetting(key=key, value=val)
                    db.session.add(row)
                else:
                    row.value = val
                updated[key] = bool(val)
        try:
            import json
            if isinstance(body.get('remove_bg_list'), list):
                val = json.dumps(body.get('remove_bg_list'), ensure_ascii=False)
                row = SystemSetting.query.filter_by(key='REMOVE_BG_LIST').first()
                if not row:
                    row = SystemSetting(key='REMOVE_BG_LIST', value=val)
                    db.session.add(row)
                else:
                    row.value = val
                updated['REMOVE_BG_LIST'] = True
            if isinstance(body.get('aliyun_list'), list):
                val = json.dumps(body.get('aliyun_list'), ensure_ascii=False)
                row = SystemSetting.query.filter_by(key='ALIYUN_LIST').first()
                if not row:
                    row = SystemSetting(key='ALIYUN_LIST', value=val)
                    db.session.add(row)
                else:
                    row.value = val
                updated['ALIYUN_LIST'] = True
        except Exception:
            pass
        db.session.commit()

        # 即时更新运行时配置（若存在对应键）
        try:
            from flask import current_app
            for k, is_set in updated.items():
                if is_set:
                    row = SystemSetting.query.filter_by(key=k).first()
                    if row:
                        current_app.config[k] = row.value
        except Exception:
            pass

        return success_response({'updated': updated}, 'API配置已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新API配置失败: {str(e)}')
