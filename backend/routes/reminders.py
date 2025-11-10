from flask import Blueprint, request
from datetime import datetime, timedelta
from models import db, Reminder, FeedingRecord, CleaningRecord, Parrot
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

# =============== 预测相关辅助函数 ===============
def _median_seconds(deltas):
    if not deltas:
        return None
    arr = sorted(deltas)
    n = len(arr)
    mid = n // 2
    if n % 2 == 1:
        return arr[mid]
    else:
        return int((arr[mid - 1] + arr[mid]) / 2)

def _clamp_future(now: datetime, target: datetime, min_delta: timedelta) -> datetime:
    if not target:
        return now + min_delta
    # 若预测时间已过去或过近，则至少推迟到 min_delta 后
    if target <= now + timedelta(minutes=1):
        return now + min_delta
    return target

def predict_next_remind_at(user_id: int, team_id: int, parrot_id: int, reminder_type: str) -> datetime:
    """根据历史记录与简单物种特性（通过个体近似）预测下一次操作时间。

    - feeding：使用 FeedingRecord 间隔（按 parrot_id）
    - cleaning：使用 CleaningRecord 间隔（按 parrot_id，合并各 cleaning_type）
    - 无历史时的回退：feeding 24h，cleaning 48h
    - 简单个体特性近似：若存在较密集历史（中位间隔 < 12h），则更偏向 12h
    """
    now = datetime.now()
    min_feed_delta = timedelta(hours=8)   # 最小喂食间隔保障
    min_clean_delta = timedelta(hours=24) # 最小清洁间隔保障

    try:
        if reminder_type == 'feeding':
            q = FeedingRecord.query
            if parrot_id:
                q = q.filter_by(parrot_id=parrot_id)
            # 团队过滤（若开启团队模式，记录表中 team_id 与用户当前 team_id 对齐）
            if team_id is not None:
                q = q.filter_by(team_id=team_id)
            q = q.order_by(FeedingRecord.feeding_time.desc()).limit(20)
            records = q.all()
            if not records:
                return now + timedelta(hours=24)
            times = [r.feeding_time for r in records if r.feeding_time]
            times = sorted(times)
            if len(times) < 2:
                last = times[-1]
                return _clamp_future(now, last + timedelta(hours=24), min_feed_delta)
            deltas = []
            for i in range(1, len(times)):
                delta = (times[i] - times[i-1]).total_seconds()
                # 只采集合理区间（2h-72h），剔除异常
                if 2*3600 <= delta <= 72*3600:
                    deltas.append(int(delta))
            median_sec = _median_seconds(deltas) if deltas else None
            last = times[-1]
            if median_sec is None:
                # 无法计算中位数，回退到 24h 间隔
                candidate = last + timedelta(hours=24)
            else:
                # 若历史显示较密集（<12h），下限设为12h以避免过于频繁
                if median_sec < 12*3600:
                    median_sec = max(median_sec, 12*3600)
                candidate = last + timedelta(seconds=median_sec)
            return _clamp_future(now, candidate, min_feed_delta)

        elif reminder_type == 'cleaning':
            q = CleaningRecord.query
            if parrot_id:
                q = q.filter_by(parrot_id=parrot_id)
            if team_id is not None:
                q = q.filter_by(team_id=team_id)
            q = q.order_by(CleaningRecord.cleaning_time.desc()).limit(30)
            records = q.all()
            if not records:
                return now + timedelta(hours=48)
            times = [r.cleaning_time for r in records if r.cleaning_time]
            times = sorted(times)
            if len(times) < 2:
                last = times[-1]
                return _clamp_future(now, last + timedelta(hours=48), min_clean_delta)
            deltas = []
            for i in range(1, len(times)):
                delta = (times[i] - times[i-1]).total_seconds()
                if 6*3600 <= delta <= 14*24*3600:  # 清洁间隔通常为小时到两周之间
                    deltas.append(int(delta))
            median_sec = _median_seconds(deltas) if deltas else None
            last = times[-1]
            if median_sec is None:
                candidate = last + timedelta(hours=48)
            else:
                # 清洁不应过密，至少 24h
                if median_sec < 24*3600:
                    median_sec = 24*3600
                candidate = last + timedelta(seconds=median_sec)
            return _clamp_future(now, candidate, min_clean_delta)

        else:
            # 其他类型暂不预测
            return None
    except Exception:
        # 任何异常下的稳健回退
        if reminder_type == 'feeding':
            return now + timedelta(hours=24)
        if reminder_type == 'cleaning':
            return now + timedelta(hours=48)
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


# =============== 新增：预测与应用接口 ===============
@reminders_bp.route('/predict-next', methods=['GET'])
@login_required
def predict_next():
    """预测下一次操作时间。
    Query:
      - type: 'feeding' | 'cleaning'
      - parrot_id: 可选，指定个体
    返回：predicted_remind_at（ISO字符串）
    """
    try:
        user = _get_current_context_user()
        if not user:
            return error_response('未登录', 401)
        team_id = _get_team_id(user)

        reminder_type = request.args.get('type', 'feeding')
        parrot_id = request.args.get('parrot_id', type=int)

        predicted = predict_next_remind_at(user.id, team_id, parrot_id, reminder_type)
        if not predicted:
            return success_response({'predicted_remind_at': None}, '暂无可用预测')
        return success_response({'predicted_remind_at': predicted.isoformat()}, '预测成功')
    except Exception as e:
        return error_response(f'预测失败: {str(e)}')


@reminders_bp.route('/predict-and-apply', methods=['POST'])
@login_required
def predict_and_apply():
    """预测并写入 remind_at，用于个性化提醒。
    Body(JSON):
      - types: ['feeding','cleaning'] 需应用的类型（默认两者）
      - parrot_id: 可选，指定个体；不传则应用到用户级提醒（无个体）
    行为：
      - 为每个 type 查找现有提醒（user_id/team_id 对齐，且 reminder_type 匹配）。
      - 若存在多个，优先选取与 parrot_id 匹配的；否则取用户级。
      - 将预测值写入 remind_at（并保持 is_active=True）。
    返回：每个 type 的写入结果。
    """
    try:
        user = _get_current_context_user()
        if not user:
            return error_response('未登录', 401)
        team_id = _get_team_id(user)

        data = request.get_json() or {}
        types = data.get('types') or ['feeding', 'cleaning']
        parrot_id = data.get('parrot_id')
        if isinstance(parrot_id, str):
            try:
                parrot_id = int(parrot_id)
            except Exception:
                parrot_id = None

        results = {}
        for t in types:
            predicted = predict_next_remind_at(user.id, team_id, parrot_id, t)
            if not predicted:
                results[t] = {'applied': False, 'predicted_remind_at': None}
                continue

            # 选择/创建 Reminder
            q = Reminder.query.filter_by(user_id=user.id, team_id=team_id, reminder_type=t)
            # 若指定了个体，尽量选择该个体的提醒
            r = None
            if parrot_id:
                r = q.filter_by(parrot_id=parrot_id).first()
            if not r:
                r = q.first()

            if not r:
                # 创建一次性提醒，使用预测时间
                title_map = {
                    'feeding': '个性化喂食提醒',
                    'cleaning': '个性化清洁提醒'
                }
                r = Reminder(
                    user_id=user.id,
                    parrot_id=parrot_id,
                    title=title_map.get(t, '个性化提醒'),
                    description='系统根据历史记录为您预测下一次操作时间',
                    reminder_type=t,
                    frequency='once',
                    is_active=True,
                    team_id=team_id
                )
                db.session.add(r)

            r.remind_at = predicted
            r.is_active = True

            results[t] = {'applied': True, 'predicted_remind_at': predicted.isoformat()}

        db.session.commit()
        return success_response({'results': results}, '预测并已写入提醒时间')
    except Exception as e:
        db.session.rollback()
        return error_response(f'预测应用失败: {str(e)}')

