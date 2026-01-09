from flask import Blueprint, request
from models import db, Announcement, SystemSetting, InvitationCode, User, Parrot, PasswordResetRequest, UserAccount
import json
from team_models import TeamMember, Team
from sqlalchemy import func
from utils import login_required, success_response, error_response
from backup import backup_database_to_remote, sync_database_to_remote
from models import BackupLog, SystemSetting

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
            imgs = []
            try:
                if a.image_urls:
                    arr = json.loads(a.image_urls)
                    if isinstance(arr, list):
                        imgs = [str(u) for u in arr if isinstance(u, str)]
            except Exception:
                imgs = []
            data.append({
                'id': a.id,
                'title': a.title,
                'content': a.content,
                'status': a.status,
                'created_at': a.created_at.isoformat() if a.created_at else None,
                'created_by_user_id': a.created_by_user_id,
                'scheduled_at': a.scheduled_at.isoformat() if getattr(a, 'scheduled_at', None) else None,
                'image_url': a.image_url,
                'image_urls': imgs
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
        image_url = (body.get('image_url') or '').strip()
        image_urls = body.get('image_urls')
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
        if isinstance(image_urls, list):
            try:
                arr = [str(u).strip() for u in image_urls if str(u).strip()]
                ann.image_urls = json.dumps(arr, ensure_ascii=False)
                if arr and not image_url:
                    image_url = arr[0]
            except Exception:
                ann.image_urls = json.dumps([], ensure_ascii=False)
        if image_url:
            ann.image_url = image_url
        db.session.add(ann)
        db.session.commit()

        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None,
            'scheduled_at': ann.scheduled_at.isoformat() if ann.scheduled_at else None,
            'image_url': ann.image_url,
            'image_urls': (json.loads(ann.image_urls) if ann.image_urls else [])
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

        if 'image_urls' in body:
            value = body.get('image_urls')
            if isinstance(value, list):
                try:
                    arr = [str(u).strip() for u in value if str(u).strip()]
                    ann.image_urls = json.dumps(arr, ensure_ascii=False)
                    if arr:
                        ann.image_url = arr[0]
                except Exception:
                    ann.image_urls = json.dumps([], ensure_ascii=False)
            else:
                ann.image_urls = None
        if 'image_url' in body:
            image_url = (body.get('image_url') or '').strip()
            ann.image_url = image_url

        db.session.commit()

        imgs = []
        try:
            imgs = json.loads(ann.image_urls) if ann.image_urls else []
            if not isinstance(imgs, list):
                imgs = []
        except Exception:
            imgs = []
        return success_response({
            'id': ann.id,
            'title': ann.title,
            'content': ann.content,
            'status': ann.status,
            'created_at': ann.created_at.isoformat() if ann.created_at else None,
            'scheduled_at': ann.scheduled_at.isoformat() if ann.scheduled_at else None,
            'image_url': ann.image_url,
            'image_urls': imgs
        }, '公告已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新公告失败: {str(e)}')

@admin_bp.route('/backup/logs', methods=['GET'])
@login_required
def list_backup_logs():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        try:
            limit = int(request.args.get('limit', '100'))
        except Exception:
            limit = 100
        items = BackupLog.query.order_by(BackupLog.started_at.desc()).limit(limit).all()
        data = []
        for it in items:
            data.append({
                'id': it.id,
                'op_type': it.op_type,
                'status': it.status,
                'target_db': it.target_db,
                'message': it.message or '',
                'started_at': it.started_at.isoformat() if it.started_at else None,
                'finished_at': it.finished_at.isoformat() if it.finished_at else None
            })
        return success_response({'logs': data})
    except Exception as e:
        return error_response(f'获取备份日志失败: {str(e)}')

@admin_bp.route('/backup/status', methods=['GET'])
@login_required
def backup_status():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        last_backup = BackupLog.query.filter_by(op_type='backup').order_by(BackupLog.started_at.desc()).first()
        last_sync = BackupLog.query.filter_by(op_type='sync').order_by(BackupLog.started_at.desc()).first()
        row = SystemSetting.query.filter_by(key='REMOTE_SYNC_LAST_TS').first()
        sync_ts = row.value if row and row.value else None
        return success_response({
            'last_backup': {
                'status': (last_backup.status if last_backup else None),
                'time': (last_backup.finished_at.isoformat() if last_backup and last_backup.finished_at else None),
                'target_db': (last_backup.target_db if last_backup else None)
            },
            'last_sync': {
                'status': (last_sync.status if last_sync else None),
                'time': (last_sync.finished_at.isoformat() if last_sync and last_sync.finished_at else None)
            },
            'last_sync_ts': sync_ts
        })
    except Exception as e:
        return error_response(f'获取备份状态失败: {str(e)}')

@admin_bp.route('/backup/run', methods=['POST'])
@login_required
def run_backup():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        backup_database_to_remote()
        return success_response({}, '已触发备份')
    except Exception as e:
        return error_response(f'触发备份失败: {str(e)}')

@admin_bp.route('/backup/sync', methods=['POST'])
@login_required
def run_sync():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        sync_database_to_remote()
        return success_response({}, '已触发同步')
    except Exception as e:
        return error_response(f'触发同步失败: {str(e)}')

@admin_bp.route('/backup/config', methods=['GET'])
@login_required
def get_backup_config():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        def get(k):
            r = SystemSetting.query.filter_by(key=k).first()
            return (r.value if r and r.value is not None else None)
        data = {
            'backup_enabled': bool(str(get('BACKUP_ENABLED') or '').strip().lower() in ['1','true','yes','y','on']),
            'sync_enabled': bool(str(get('SYNC_ENABLED') or '').strip().lower() in ['1','true','yes','y','on']),
            'remote_host': get('BACKUP_REMOTE_HOST'),
            'remote_port': int(get('BACKUP_REMOTE_PORT') or 3306),
            'remote_user': get('BACKUP_REMOTE_USER'),
            'remote_db_name': get('BACKUP_REMOTE_DB_NAME') or get('DB_NAME'),
            'remote_db_prefix': get('BACKUP_REMOTE_DB_PREFIX'),
            'backup_schedule_hour': int(get('BACKUP_SCHEDULE_HOUR') or 3),
            'sync_schedule_minute': int(get('SYNC_SCHEDULE_MINUTE') or 0),
            'retention_days': int(get('BACKUP_RETENTION_DAYS') or 7)
        }
        return success_response(data)
    except Exception as e:
        return error_response(f'获取备份配置失败: {str(e)}')

@admin_bp.route('/backup/config', methods=['PUT'])
@login_required
def update_backup_config():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        body = request.get_json() or {}
        pairs = {
            'BACKUP_ENABLED': body.get('backup_enabled'),
            'SYNC_ENABLED': body.get('sync_enabled'),
            'BACKUP_REMOTE_HOST': body.get('remote_host'),
            'BACKUP_REMOTE_PORT': body.get('remote_port'),
            'BACKUP_REMOTE_USER': body.get('remote_user'),
            'BACKUP_REMOTE_DB_NAME': body.get('remote_db_name'),
            'BACKUP_REMOTE_DB_PREFIX': body.get('remote_db_prefix'),
            'BACKUP_SCHEDULE_HOUR': body.get('backup_schedule_hour'),
            'SYNC_SCHEDULE_MINUTE': body.get('sync_schedule_minute'),
            'BACKUP_RETENTION_DAYS': body.get('retention_days')
        }
        def set_setting(k, v):
            if v is None:
                return
            row = SystemSetting.query.filter_by(key=k).first()
            if not row:
                row = SystemSetting(key=k, value=str(v))
                db.session.add(row)
            else:
                row.value = str(v)
        for k, v in pairs.items():
            set_setting(k, v)
        pwd = body.get('remote_password')
        if isinstance(pwd, str) and pwd.strip() != '':
            set_setting('BACKUP_REMOTE_PASSWORD', pwd)
        db.session.commit()
        return success_response({}, '配置已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新备份配置失败: {str(e)}')

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

        parrot_total_count = db.session.query(func.count(Parrot.id)).filter(Parrot.is_active == True).scalar() or 0

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
            },
            'parrot_total_count': int(parrot_total_count)
        })
    except Exception as e:
        return error_response(f'获取用户统计失败: {str(e)}')

@admin_bp.route('/reset-requests', methods=['GET'])
@login_required
def list_reset_requests():
    """查询账号的最近一次密码重置请求，客服用于人工核验并通知验证码"""
    try:
        user = request.current_user
        if not user or user.role not in ['super_admin', 'admin']:
            return error_response('无权限', 403)

        username = (request.args.get('username') or '').strip()
        if not username:
            return error_response('请输入用户名')

        account = UserAccount.query.filter_by(username=username).first()
        if not account:
            return error_response('账号不存在', 404)

        req = PasswordResetRequest.query.filter_by(account_id=account.id).order_by(PasswordResetRequest.id.desc()).first()
        if not req:
            return success_response({'request': None}, '暂无重置请求')

        # 掩码手机号
        masked_phone = None
        try:
            u = account.user
            if u and u.phone:
                p = u.phone.strip()
                if len(p) >= 7:
                    masked_phone = p[:3] + '****' + p[-4:]
                else:
                    masked_phone = p
        except Exception:
            masked_phone = None

        data = {
            'id': req.id,
            'username': account.username,
            'code': req.code,
            'expire_at': req.expire_at.isoformat() if req.expire_at else None,
            'used': bool(req.used),
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'masked_phone': masked_phone
        }
        return success_response({'request': data})
    except Exception as e:
        return error_response(f'查询失败: {str(e)}')


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
                'parrot_count': int(team_counts_map.get(u.current_team_id, 0) or 0) if (u.user_mode == 'team' and u.current_team_id) else int(personal_counts_map.get(u.id, 0) or 0),
                'subscription_tier': u.subscription_tier,
                'subscription_expire_at': u.subscription_expire_at.isoformat() if getattr(u, 'subscription_expire_at', None) else None
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


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@login_required
def update_user_membership(user_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        # 兼容通过 OpenID 进行用户定位
        target = None
        try:
            uid_int = int(user_id)
            target = User.query.get(uid_int)
        except Exception:
            target = User.query.filter_by(openid=str(user_id)).first()
        if not target:
            return error_response('用户不存在', 404)

        body = request.get_json() or {}
        tier = str(body.get('subscription_tier') or '').strip().lower()
        extend_days = body.get('subscription_extend_days')
        # 兼容布尔与字符串取值
        raw_cancel = body.get('subscription_cancel')
        cancel_flag = False
        if isinstance(raw_cancel, bool):
            cancel_flag = raw_cancel
        elif isinstance(raw_cancel, (int, float)):
            cancel_flag = (int(raw_cancel) != 0)
        elif isinstance(raw_cancel, str):
            cancel_flag = raw_cancel.strip().lower() in ['1', 'true', 'yes', 'y']

        changed = False
        if tier in ['free', 'pro', 'team']:
            target.subscription_tier = tier
            changed = True

        if isinstance(extend_days, int) and extend_days > 0:
            from datetime import datetime, timedelta
            base = target.subscription_expire_at if target.subscription_expire_at and target.subscription_expire_at > datetime.utcnow() else datetime.utcnow()
            target.subscription_expire_at = base + timedelta(days=int(extend_days))
            if target.subscription_tier == 'free':
                target.subscription_tier = 'pro'
            changed = True

        if cancel_flag:
            target.subscription_tier = 'free'
            target.subscription_expire_at = None
            changed = True

        if not changed:
            return error_response('未提供有效的更新参数')

        db.session.commit()
        data = {
            'id': target.id,
            'subscription_tier': target.subscription_tier,
            'subscription_expire_at': target.subscription_expire_at.isoformat() if getattr(target, 'subscription_expire_at', None) else None,
            'expire_at': target.subscription_expire_at.isoformat() if getattr(target, 'subscription_expire_at', None) else None
        }
        return success_response(data, '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')


@admin_bp.route('/users/trend', methods=['GET'])
@login_required
def get_users_trend():
    """用户趋势数据：返回新增与累计总用户数
    支持 period: day(天), month(月), year(年)
    """
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)

        from datetime import datetime, timedelta, date

        start_date_str = (request.args.get('start_date') or '').strip()
        end_date_str = (request.args.get('end_date') or '').strip()
        period = (request.args.get('period') or 'day').strip()
        try:
            tz_offset_min = int(request.args.get('tz_offset_minutes') or 0)
        except Exception:
            tz_offset_min = 0

        if period not in ['day', 'month', 'year']:
            period = 'day'

        # 解析日期范围；默认最近30天（含今天）
        today = date.today()
        if start_date_str:
            try:
                start_dt = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                start_dt = today - timedelta(days=29)
        else:
            start_dt = today - timedelta(days=29)

        if end_date_str:
            try:
                end_dt = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                end_dt = today
        else:
            end_dt = today

        if end_dt < start_dt:
            start_dt, end_dt = end_dt, start_dt

        # 构建分组表达式与连续桶
        if period == 'day':
            shift_seconds = tz_offset_min * 60
            group_expr = func.date(func.from_unixtime(func.unix_timestamp(User.created_at) + shift_seconds))
            q = db.session.query(group_expr.label('bucket'), func.count(User.id).label('cnt')).\
                filter(
                    User.created_at >= (datetime.combine(start_dt, datetime.min.time()) - timedelta(minutes=tz_offset_min)),
                    User.created_at < (datetime.combine(end_dt + timedelta(days=1), datetime.min.time()) - timedelta(minutes=tz_offset_min))
                ).group_by('bucket').order_by('bucket')
            rows = q.all()
            daily_map = {}
            for b, cnt in rows:
                if isinstance(b, str):
                    key = b[:10]
                elif hasattr(b, 'strftime'):
                    key = b.strftime('%Y-%m-%d')
                else:
                    key = str(b)
                daily_map[key] = int(cnt or 0)
            base_total = db.session.query(func.count(User.id)).\
                filter(User.created_at < (datetime.combine(start_dt, datetime.min.time()) - timedelta(minutes=tz_offset_min))).scalar() or 0
            items = []
            total_running = int(base_total)
            cur = start_dt
            while cur <= end_dt:
                key = cur.strftime('%Y-%m-%d')
                new_users = int(daily_map.get(key, 0))
                total_running += new_users
                items.append({'date': key, 'new_users': new_users, 'total_users': total_running})
                cur = cur + timedelta(days=1)
            return success_response(items)

        elif period == 'month':
            # 若未提供范围，按全量数据范围聚合
            if not start_date_str and not end_date_str:
                first_row = db.session.query(func.min(User.created_at)).scalar()
                last_row = db.session.query(func.max(User.created_at)).scalar()
                if first_row and last_row:
                    start_dt = first_row.date()
                    end_dt = last_row.date()
                else:
                    return success_response([])
            # 分组到月份
            shift_seconds = tz_offset_min * 60
            group_expr = func.date_format(func.from_unixtime(func.unix_timestamp(User.created_at) + shift_seconds), '%Y-%m')
            q = db.session.query(group_expr.label('bucket'), func.count(User.id).label('cnt')).\
                filter(
                    User.created_at >= (datetime.combine(start_dt.replace(day=1), datetime.min.time()) - timedelta(minutes=tz_offset_min)),
                    User.created_at < (datetime.combine((end_dt.replace(day=1) + timedelta(days=32)).replace(day=1), datetime.min.time()) - timedelta(minutes=tz_offset_min))
                ).group_by('bucket').order_by('bucket')
            rows = q.all()
            month_map = {str(b): int(cnt or 0) for b, cnt in rows}
            # 基数：范围起始月之前累计总数
            base_total = db.session.query(func.count(User.id)).\
                filter(User.created_at < (datetime.combine(start_dt.replace(day=1), datetime.min.time()) - timedelta(minutes=tz_offset_min))).scalar() or 0
            # 连续月份桶
            items = []
            total_running = int(base_total)
            cur_month = start_dt.replace(day=1)
            end_month = end_dt.replace(day=1)
            while cur_month <= end_month:
                key = cur_month.strftime('%Y-%m')
                add = int(month_map.get(key, 0))
                total_running += add
                items.append({'date': key, 'new_users': add, 'total_users': total_running})
                # 下个月一号
                next_month = (cur_month + timedelta(days=32)).replace(day=1)
                cur_month = next_month
            return success_response(items)

        else:  # year
            # 若未提供范围，按全量数据范围聚合
            if not start_date_str and not end_date_str:
                first_row = db.session.query(func.min(User.created_at)).scalar()
                last_row = db.session.query(func.max(User.created_at)).scalar()
                if first_row and last_row:
                    start_dt = first_row.date()
                    end_dt = last_row.date()
                else:
                    return success_response([])
            shift_seconds = tz_offset_min * 60
            group_expr = func.year(func.from_unixtime(func.unix_timestamp(User.created_at) + shift_seconds))
            q = db.session.query(group_expr.label('bucket'), func.count(User.id).label('cnt')).\
                filter(
                    User.created_at >= (datetime.combine(start_dt.replace(month=1, day=1), datetime.min.time()) - timedelta(minutes=tz_offset_min)),
                    User.created_at < (datetime.combine(end_dt.replace(month=1, day=1).replace(year=end_dt.year + 1), datetime.min.time()) - timedelta(minutes=tz_offset_min))
                ).group_by('bucket').order_by('bucket')
            rows = q.all()
            year_map = {int(b): int(cnt or 0) for b, cnt in rows}
            base_total = db.session.query(func.count(User.id)).\
                filter(User.created_at < (datetime.combine(start_dt.replace(month=1, day=1), datetime.min.time()) - timedelta(minutes=tz_offset_min))).scalar() or 0
            # 连续年份桶
            start_year = start_dt.year
            end_year = end_dt.year
            items = []
            total_running = int(base_total)
            for y in range(start_year, end_year + 1):
                add = int(year_map.get(y, 0))
                total_running += add
                items.append({'date': str(y), 'new_users': add, 'total_users': total_running})
            return success_response(items)

        # 不可达
    except Exception as e:
        return error_response(f'获取用户趋势失败: {str(e)}')


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

@admin_bp.route('/membership-toggle', methods=['GET'])
@login_required
def get_membership_toggle():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        row = SystemSetting.query.filter_by(key='MEMBERSHIP_ENABLED').first()
        val = str(row.value).strip().lower() if row and row.value is not None else ''
        enabled = True if val in ['1', 'true', 'yes', 'y'] else (False if val in ['0', 'false', 'no', 'n'] else True)
        return success_response({'enabled': enabled}, '获取成功')
    except Exception as e:
        return error_response(f'获取会员订阅开关失败: {str(e)}')

@admin_bp.route('/membership-toggle', methods=['PUT'])
@login_required
def update_membership_toggle():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        body = request.get_json() or {}
        raw = body.get('enabled')
        enabled = False
        if isinstance(raw, bool):
            enabled = raw
        elif isinstance(raw, (int, float)):
            enabled = int(raw) != 0
        elif isinstance(raw, str):
            enabled = raw.strip().lower() in ['1', 'true', 'yes', 'y']
        row = SystemSetting.query.filter_by(key='MEMBERSHIP_ENABLED').first()
        if not row:
            row = SystemSetting(key='MEMBERSHIP_ENABLED', value=('1' if enabled else '0'))
            db.session.add(row)
        else:
            row.value = ('1' if enabled else '0')
        db.session.commit()
        try:
            from flask import current_app
            current_app.config['MEMBERSHIP_ENABLED'] = row.value
        except Exception:
            pass
        return success_response({'enabled': enabled}, '已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新会员订阅开关失败: {str(e)}')

@admin_bp.route('/membership-limits', methods=['GET'])
@login_required
def get_membership_limits():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        keys = ['FREE_LIMIT_PERSONAL','FREE_LIMIT_TEAM','PRO_LIMIT_PERSONAL','TEAM_LIMIT_BASIC','TEAM_LIMIT_ADVANCED']
        data = {}
        for k in keys:
            row = SystemSetting.query.filter_by(key=k).first()
            val = str(row.value).strip() if row and row.value is not None else ''
            data[k] = val
        def to_int_default(v, d):
            try:
                return max(0, int(str(v).strip())) if str(v).strip() != '' else d
            except Exception:
                return d
        return success_response({
            'free_personal': to_int_default(data.get('FREE_LIMIT_PERSONAL'), 10),
            'free_team': to_int_default(data.get('FREE_LIMIT_TEAM'), 20),
            'pro_personal': to_int_default(data.get('PRO_LIMIT_PERSONAL'), 100),
            'team_basic': to_int_default(data.get('TEAM_LIMIT_BASIC'), 1000),
            'team_advanced': to_int_default(data.get('TEAM_LIMIT_ADVANCED'), 0)
        })
    except Exception as e:
        return error_response(f'获取会员数量上限失败: {str(e)}')

@admin_bp.route('/membership-limits', methods=['PUT'])
@login_required
def update_membership_limits():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        body = request.get_json() or {}
        mapping = {
            'free_personal': 'FREE_LIMIT_PERSONAL',
            'free_team': 'FREE_LIMIT_TEAM',
            'pro_personal': 'PRO_LIMIT_PERSONAL',
            'team_basic': 'TEAM_LIMIT_BASIC',
            'team_advanced': 'TEAM_LIMIT_ADVANCED'
        }
        for field, key in mapping.items():
            if field in body:
                raw = body.get(field)
                val = None
                try:
                    val = str(int(raw))
                except Exception:
                    val = str(raw or '')
                row = SystemSetting.query.filter_by(key=key).first()
                if not row:
                    row = SystemSetting(key=key, value=val)
                    db.session.add(row)
                else:
                    row.value = val
        db.session.commit()
        try:
            from flask import current_app
            for _, key in mapping.items():
                row = SystemSetting.query.filter_by(key=key).first()
                if row:
                    current_app.config[key] = row.value
        except Exception:
            pass
        return success_response({'updated': True}, '已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新会员数量上限失败: {str(e)}')
