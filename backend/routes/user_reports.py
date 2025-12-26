from datetime import date, timedelta

from flask import Blueprint, request
from sqlalchemy import func

from models import db, User
from utils import login_required, success_response, error_response


user_reports_bp = Blueprint('user_reports', __name__, url_prefix='/api/admin/reports')


@user_reports_bp.route('/user-growth', methods=['GET'])
@login_required
def user_growth_trend():
    """按天统计用户增长趋势，仅超级管理员可访问。

    Query 参数：
      - days: 回看天数，默认 30
      - start_date, end_date: 可选，格式 YYYY-MM-DD；若提供则覆盖 days
    返回：
      - points: [{ date: 'YYYY-MM-DD', count: 当日新增用户数 }]
      - start_date, end_date
      - total_users: 当前总用户数
    """
    try:
        current = request.current_user
        if not current or current.role != 'super_admin':
            return error_response('无权限', 403)

        # 解析日期范围
        start_date_param = (request.args.get('start_date') or '').strip()
        end_date_param = (request.args.get('end_date') or '').strip()
        days_param = request.args.get('days')

        if start_date_param and end_date_param:
            try:
                start_date_val = date.fromisoformat(start_date_param)
                end_date_val = date.fromisoformat(end_date_param)
            except ValueError:
                return error_response('日期格式错误，应为 YYYY-MM-DD')
        elif str(days_param).lower() == 'all':
            # 查询最早的用户注册时间
            first_user_date = db.session.query(func.min(func.date(User.created_at))).scalar()
            today = date.today()
            end_date_val = today
            if first_user_date:
                # 确保 first_user_date 是 date 对象
                if isinstance(first_user_date, str):
                    start_date_val = date.fromisoformat(first_user_date)
                else:
                    start_date_val = first_user_date
            else:
                start_date_val = today - timedelta(days=29)
        else:
            try:
                days = int(days_param) if days_param else 30
            except:
                days = 30
            today = date.today()
            d = max(1, days)
            end_date_val = today
            start_date_val = today - timedelta(days=d - 1)

        # 查询每一天的新增用户数
        rows = db.session.query(
            func.date(User.created_at).label('d'),
            func.count(User.id).label('cnt')
        ).filter(
            func.date(User.created_at) >= start_date_val,
            func.date(User.created_at) <= end_date_val
        ).group_by(func.date(User.created_at)).order_by(func.date(User.created_at)).all()

        counts_map = {str(r.d): int(r.cnt or 0) for r in rows}

        # 构建完整日期序列
        points = []
        cur = start_date_val
        while cur <= end_date_val:
            s = str(cur)
            points.append({'date': s, 'count': counts_map.get(s, 0)})
            cur += timedelta(days=1)

        total_users = db.session.query(func.count(User.id)).scalar() or 0

        return success_response({
            'points': points,
            'start_date': str(start_date_val),
            'end_date': str(end_date_val),
            'total_users': int(total_users)
        })
    except Exception as e:
        return error_response(f'获取用户增长趋势失败: {str(e)}')

