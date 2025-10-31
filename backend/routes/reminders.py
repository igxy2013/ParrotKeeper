from flask import Blueprint, request
from datetime import datetime
from models import db, Reminder
from utils import login_required, success_response, error_response

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')

def _get_current_context_user():
    from flask import request
    return getattr(request, 'current_user', None)

def _get_team_id(user):
    # 在团队模式下使用用户当前团队ID，否则为None
    try:
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            return getattr(user, 'current_team_id', None)
        return None
    except Exception:
        return None

@reminders_bp.route('/settings', methods=['GET'])
@login_required
def get_reminder_settings():
    try:
        user = _get_current_context_user()
        if not user:
            return error_response('未登录', 401)

        team_id = _get_team_id(user)

        # 获取喂食与清洁提醒
        feeding = Reminder.query.filter_by(user_id=user.id, team_id=team_id, reminder_type='feeding').first()
        cleaning = Reminder.query.filter_by(user_id=user.id, team_id=team_id, reminder_type='cleaning').first()

        def time_to_str(t):
            return t.strftime('%H:%M') if t else None

        data = {
            'feedingReminderTime': time_to_str(feeding.reminder_time) if feeding else None,
            'cleaningReminderTime': time_to_str(cleaning.reminder_time) if cleaning else None,
            'feedingReminder': feeding.is_active if feeding else True,
            'cleaningReminder': cleaning.is_active if cleaning else True
        }

        return success_response(data, '获取提醒设置成功')
    except Exception as e:
        return error_response(f'获取提醒设置失败: {str(e)}')

@reminders_bp.route('/settings', methods=['PUT'])
@login_required
def update_reminder_settings():
    try:
        user = _get_current_context_user()
        if not user:
            return error_response('未登录', 401)

        team_id = _get_team_id(user)
        data = request.get_json() or {}

        feeding_time_str = data.get('feedingReminderTime')
        cleaning_time_str = data.get('cleaningReminderTime')
        feeding_active = bool(data.get('feedingReminder', True))
        cleaning_active = bool(data.get('cleaningReminder', True))

        def parse_time(s):
            if not s:
                return None
            try:
                return datetime.strptime(s, '%H:%M').time()
            except Exception:
                return None

        feeding_time = parse_time(feeding_time_str)
        cleaning_time = parse_time(cleaning_time_str)

        # 创建或更新喂食提醒
        feeding = Reminder.query.filter_by(user_id=user.id, team_id=team_id, reminder_type='feeding').first()
        if not feeding:
            feeding = Reminder(
                user_id=user.id,
                reminder_type='feeding',
                title='每日喂食提醒',
                description='到点喂食啦～',
                frequency='daily',
                team_id=team_id
            )
            db.session.add(feeding)
        feeding.is_active = feeding_active
        if feeding_time is not None:
            feeding.reminder_time = feeding_time

        # 创建或更新清洁提醒
        cleaning = Reminder.query.filter_by(user_id=user.id, team_id=team_id, reminder_type='cleaning').first()
        if not cleaning:
            cleaning = Reminder(
                user_id=user.id,
                reminder_type='cleaning',
                title='每日清洁提醒',
                description='保持环境整洁～',
                frequency='daily',
                team_id=team_id
            )
            db.session.add(cleaning)
        cleaning.is_active = cleaning_active
        if cleaning_time is not None:
            cleaning.reminder_time = cleaning_time

        db.session.commit()

        return success_response({'updated': True}, '提醒设置已更新')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新提醒设置失败: {str(e)}')

