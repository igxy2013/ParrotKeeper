from flask import Blueprint, request
from models import db, UserSetting
from utils import login_required, success_response, error_response
import json

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

