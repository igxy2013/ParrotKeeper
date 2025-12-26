from flask import Blueprint, request
from sqlalchemy import func
from models import db, User, Announcement, Parrot, Expense, SystemSetting, InvitationCode
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

        sort_by = (request.args.get('sort_by') or '').strip()
        sort_order = (request.args.get('sort_order') or 'desc').strip().lower()

        # 允许排序的字段映射
        sort_field_map = {
            'id': User.id,
            'nickname': User.nickname,
            'username': User.username,
            'role': User.role,
            'points': User.points,
            'created_at': User.created_at
        }

        base_query = User.query
        
        if sort_by == 'parrot_count':
             # 按鹦鹉数量排序
             subquery = db.session.query(
                 Parrot.user_id, func.count(Parrot.id).label('cnt')
             ).filter(Parrot.is_active == True).group_by(Parrot.user_id).subquery()
             
             base_query = base_query.outerjoin(subquery, User.id == subquery.c.user_id)
             if sort_order == 'asc':
                 base_query = base_query.order_by(subquery.c.cnt.asc())
             else:
                 base_query = base_query.order_by(subquery.c.cnt.desc())
        
        elif sort_by == 'total_expense':
             # 按总支出排序
             subquery = db.session.query(
                 Expense.user_id, func.sum(Expense.amount).label('total')
             ).filter(Expense.team_id.is_(None)).group_by(Expense.user_id).subquery()
             
             base_query = base_query.outerjoin(subquery, User.id == subquery.c.user_id)
             if sort_order == 'asc':
                 base_query = base_query.order_by(subquery.c.total.asc())
             else:
                 base_query = base_query.order_by(subquery.c.total.desc())

        elif sort_by in sort_field_map:
            col = sort_field_map[sort_by]
            base_query = base_query.order_by(col.asc() if sort_order == 'asc' else col.desc())
        else:
            base_query = base_query.order_by(User.created_at.desc())

        query = base_query
        if q:
            # 支持按昵称、用户名、openid搜索（手机号不再参与搜索）
            query = query.filter(
                db.or_(
                    User.nickname.contains(q),
                    User.username.contains(q),
                    User.openid.contains(q)
                )
            )

        result = paginate_query(query, page, per_page)

        # 角色与模式统计（与小程序端用户与角色管理页面对齐）
        stats_query = User.query
        if q:
            stats_query = stats_query.filter(
                db.or_(
                    User.nickname.contains(q),
                    User.username.contains(q),
                    User.openid.contains(q)
                )
            )
        total_users = result['total']
        admin_count = stats_query.filter(User.role == 'admin').count()
        user_count = stats_query.filter(User.role == 'user').count()
        team_user_count = stats_query.filter(User.user_mode == 'team').count()

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

            # 统计总支出（仅统计个人支出，不含团队）
            te_rows = db.session.query(Expense.user_id, func.coalesce(func.sum(Expense.amount), 0))\
                .filter(Expense.user_id.in_(user_ids), Expense.team_id.is_(None))\
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
            'has_prev': result['has_prev'],
            'role_stats': {
                'total_count': int(total_users or 0),
                'admin_count': int(admin_count or 0),
                'user_count': int(user_count or 0),
                'team_user_count': int(team_user_count or 0)
            }
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


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """仅超级管理员可删除用户"""
    try:
        current = request.current_user
        if not current or current.role != 'super_admin':
            return error_response('无权限', 403)

        target = User.query.get(user_id)
        if not target:
            return error_response('用户不存在', 404)
        
        if target.id == current.id:
             return error_response('不能删除自己', 400)

        db.session.delete(target)
        db.session.commit()

        return success_response({'id': user_id}, '用户已删除')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除用户失败: {str(e)}')



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
