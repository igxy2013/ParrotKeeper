from flask import Blueprint, request
from models import db, UserSetting
from utils import login_required, success_response, error_response
import json
from datetime import datetime
from team_mode_utils import get_accessible_parrot_ids_by_mode

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/api/settings/home-widgets', methods=['GET'])
@login_required
def get_home_widgets():
    user = request.current_user
    team_id = None if user.user_mode == 'personal' else (user.current_team_id or None)
    setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='home_widgets').first()
    widgets = ['parrots', 'feeding_today', 'monthly_income', 'monthly_expense']
    if setting and setting.value:
        try:
            data = json.loads(setting.value)
            if isinstance(data, list):
                widgets = data
        except Exception:
            pass
    return success_response({ 'widgets': widgets })

@settings_bp.route('/api/membership/limits', methods=['GET'])
@login_required
def get_membership_limits_public():
    user = request.current_user
    try:
        from models import SystemSetting
        keys = ['FREE_LIMIT_PERSONAL','FREE_LIMIT_TEAM','PRO_LIMIT_PERSONAL','TEAM_LIMIT_BASIC','TEAM_LIMIT_ADVANCED']
        data = {}
        for k in keys:
            row = SystemSetting.query.filter_by(key=k).first()
            val = str(row.value).strip() if row and row.value is not None else ''
            data[k] = val
        def to_int_default(v, d):
            try:
                s = str(v).strip()
                if s == '':
                    return d
                return max(0, int(s))
            except Exception:
                return d
        payload = {
            'free_personal': to_int_default(data.get('FREE_LIMIT_PERSONAL'), 10),
            'free_team': to_int_default(data.get('FREE_LIMIT_TEAM'), 20),
            'pro_personal': to_int_default(data.get('PRO_LIMIT_PERSONAL'), 100),
            'team_basic': to_int_default(data.get('TEAM_LIMIT_BASIC'), 1000),
            'team_advanced': to_int_default(data.get('TEAM_LIMIT_ADVANCED'), 0)
        }
        return success_response(payload)
    except Exception as e:
        return error_response(f'获取会员数量上限失败: {str(e)}')


# ================= 护理教练个性化配置 ==================

def _default_care_coach_preferences():
    return {
        'feeding': {
            'min_per_week': 14,        # 雏鸟建议每天2次；成鸟可降低
            'max_seed_ratio': 0.3      # 种子类最高比例建议
        },
        'cleaning': {
            'min_per_14d': 2           # 14天至少清洁2次
        },
        'health': {
            'alert_weight_change_pct_14d': 5.0  # 14天体重变化预警阈值（绝对值%）
        },
        'delivery': {
            'subscription_enabled': False,
            'template_id': None,
            'page': 'pages/index/index'
        }
    }


def _get_user_team_context(user):
    team_id = None if getattr(user, 'user_mode', 'personal') == 'personal' else getattr(user, 'current_team_id', None)
    return team_id


@settings_bp.route('/api/settings/care-coach', methods=['GET'])
@login_required
def get_care_coach_preferences():
    try:
        user = request.current_user
        team_id = _get_user_team_context(user)
        setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='care_coach_preferences').first()
        prefs = _default_care_coach_preferences()
        if setting and setting.value:
            try:
                data = json.loads(setting.value)
                if isinstance(data, dict):
                    # 合并默认值，防止缺项
                    def merge(a, b):
                        for k, v in b.items():
                            if k not in a:
                                a[k] = v
                            elif isinstance(v, dict) and isinstance(a.get(k), dict):
                                merge(a[k], v)
                        return a
                    prefs = merge(data, _default_care_coach_preferences())
            except Exception:
                pass
        return success_response({'preferences': prefs}, '获取护理教练偏好成功')
    except Exception as e:
        return error_response(f'获取护理教练偏好失败: {str(e)}')


@settings_bp.route('/api/settings/care-coach', methods=['PUT'])
@login_required
def update_care_coach_preferences():
    try:
        user = request.current_user
        team_id = _get_user_team_context(user)
        data = request.get_json() or {}
        prefs = data.get('preferences') or {}
        if not isinstance(prefs, dict):
            return error_response('无效的偏好结构：应为对象')

        setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='care_coach_preferences').first()
        if not setting:
            setting = UserSetting(user_id=user.id, team_id=team_id, key='care_coach_preferences', value=json.dumps(_default_care_coach_preferences(), ensure_ascii=False))
            db.session.add(setting)
        # 合并并保存
        try:
            current = json.loads(setting.value) if setting.value else {}
        except Exception:
            current = {}

        def deep_merge(base, new):
            for k, v in new.items():
                if isinstance(v, dict) and isinstance(base.get(k), dict):
                    base[k] = deep_merge(base[k], v)
                else:
                    base[k] = v
            return base

        merged = deep_merge(current if isinstance(current, dict) else {}, prefs)
        setting.value = json.dumps(merged, ensure_ascii=False)
        setting.updated_at = datetime.utcnow()

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return error_response(f'保存偏好失败: {str(e)}')

        return success_response({'preferences': merged}, '更新护理教练偏好成功')
    except Exception as e:
        return error_response(f'更新护理教练偏好失败: {str(e)}')

@settings_bp.route('/api/settings/home-widgets', methods=['PUT'])
@login_required
def update_home_widgets():
    user = request.current_user
    team_id = None if user.user_mode == 'personal' else (user.current_team_id or None)
    body = request.get_json(silent=True) or {}
    widgets = body.get('widgets')
    if not isinstance(widgets, list):
        return error_response('参数错误：widgets 需为数组', 400)

    # 过滤仅允许的组件键
    allowed = {'parrots', 'feeding_today', 'monthly_income', 'monthly_expense'}
    clean_widgets = [w for w in widgets if w in allowed]
    if not clean_widgets:
        clean_widgets = ['parrots']

    setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='home_widgets').first()
    if not setting:
        setting = UserSetting(user_id=user.id, team_id=team_id, key='home_widgets', value=json.dumps(clean_widgets, ensure_ascii=False))
        db.session.add(setting)
    else:
        setting.value = json.dumps(clean_widgets, ensure_ascii=False)
    db.session.commit()
    return success_response({ 'widgets': clean_widgets }, '已更新首页组件显示设置')

@settings_bp.route('/api/settings/parrot-order', methods=['GET'])
@login_required
def get_parrot_order():
    try:
        user = request.current_user
        team_id = None if getattr(user, 'user_mode', 'personal') == 'personal' else (getattr(user, 'current_team_id', None) or None)
        setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='parrot_order').first()
        order = []
        if setting and setting.value:
            try:
                data = json.loads(setting.value)
                if isinstance(data, list):
                    order = [int(x) for x in data if isinstance(x, (int, str)) and str(x).isdigit()]
            except Exception:
                order = []
        accessible = get_accessible_parrot_ids_by_mode(user)
        if order:
            order = [pid for pid in order if pid in accessible]
        return success_response({ 'order': order })
    except Exception as e:
        return error_response(f'获取鹦鹉排序失败: {str(e)}')

@settings_bp.route('/api/settings/parrot-order', methods=['PUT'])
@login_required
def update_parrot_order():
    try:
        user = request.current_user
        team_id = None if getattr(user, 'user_mode', 'personal') == 'personal' else (getattr(user, 'current_team_id', None) or None)
        body = request.get_json(silent=True) or {}
        order = body.get('order')
        if not isinstance(order, list):
            return error_response('参数错误：order 需为数组', 400)
        try:
            clean = [int(x) for x in order if isinstance(x, (int, str)) and str(x).isdigit()]
        except Exception:
            clean = []
        seen = set()
        uniq = []
        for pid in clean:
            if pid not in seen:
                seen.add(pid)
                uniq.append(pid)
        accessible = set(get_accessible_parrot_ids_by_mode(user))
        filtered = [pid for pid in uniq if pid in accessible]
        setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='parrot_order').first()
        if not setting:
            setting = UserSetting(user_id=user.id, team_id=team_id, key='parrot_order', value=json.dumps(filtered, ensure_ascii=False))
            db.session.add(setting)
        else:
            setting.value = json.dumps(filtered, ensure_ascii=False)
            setting.updated_at = datetime.utcnow()
        db.session.commit()
        return success_response({ 'order': filtered }, '鹦鹉排序已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新鹦鹉排序失败: {str(e)}')
