from flask import Blueprint, request, jsonify
from models import db, Parrot, ParrotSpecies, FeedingRecord, HealthRecord, CleaningRecord, Expense, Income, UserStatistics
from utils import login_required, success_response, error_response, add_user_points
from team_utils import get_accessible_parrots
from team_mode_utils import get_accessible_parrot_ids_by_mode, get_accessible_expense_ids_by_mode, get_accessible_income_ids_by_mode
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_

statistics_bp = Blueprint('statistics', __name__, url_prefix='/api/statistics')

@statistics_bp.route('/overview', methods=['GET'])
@login_required
def get_overview():
    """获取总览统计"""
    try:
        user = request.current_user
        
        # 记录统计页面查看次数并增加访问积分
        team_id = getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
        user_stats = UserStatistics.query.filter_by(user_id=user.id, team_id=team_id).first()
        if not user_stats:
            user_stats = UserStatistics(user_id=user.id, team_id=team_id, stats_views=1)
            db.session.add(user_stats)
        else:
            user_stats.stats_views += 1
            user_stats.updated_at = datetime.utcnow()
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[WARNING] 更新统计查看次数失败: {str(e)}")
        
        # 增加每日访问积分（每日首次访问首页获得1积分）
        add_user_points(user.id, 1, 'daily_visit')
        
        # 根据用户模式获取可访问的鹦鹉ID
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 鹦鹉总数
        total_parrots = len([pid for pid in parrot_ids if Parrot.query.get(pid) and Parrot.query.get(pid).is_active])
        
        # 健康状态统计（统一：按每只鹦鹉最近健康记录的 health_status 计算；无记录视为 healthy）
        # 子查询：每只鹦鹉最近一条健康记录的日期
        latest_health_subq = db.session.query(
            HealthRecord.parrot_id.label('parrot_id'),
            func.max(HealthRecord.record_date).label('max_date')
        ).join(Parrot, HealthRecord.parrot_id == Parrot.id).filter(
            Parrot.id.in_(parrot_ids),
            Parrot.is_active == True
        ).group_by(HealthRecord.parrot_id).subquery()

        # 统计最近健康记录的状态分布
        latest_health_stats = db.session.query(
            HealthRecord.health_status,
            func.count(HealthRecord.parrot_id).label('count')
        ).join(
            latest_health_subq,
            and_(
                HealthRecord.parrot_id == latest_health_subq.c.parrot_id,
                HealthRecord.record_date == latest_health_subq.c.max_date
            )
        ).group_by(HealthRecord.health_status).all()

        # 初始化包含 observation 的状态字典
        health_status = {status: 0 for status in ['healthy', 'sick', 'recovering', 'observation']}
        latest_count_sum = 0
        for status, count in latest_health_stats:
            latest_count_sum += count or 0
            if status in health_status:
                health_status[status] = count
            else:
                # 兼容未知状态，全部计入 healthy（理论上不会发生）
                health_status['healthy'] += count or 0

        # 无健康记录的鹦鹉默认 healthy
        missing_count = max(0, total_parrots - latest_count_sum)
        health_status['healthy'] += missing_count
        
        # 本月支出（包括用户个人支出和团队共享鹦鹉的支出）
        current_month = date.today().replace(day=1)
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        monthly_expense = db.session.query(func.sum(Expense.amount)).filter(
            and_(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= current_month
            )
        ).scalar() or 0

        # 本月收入（包括用户个人收入和团队共享鹦鹉的收入）
        income_ids = get_accessible_income_ids_by_mode(user)
        monthly_income = db.session.query(func.sum(Income.amount)).filter(
            and_(
                Income.id.in_(income_ids),
                Income.income_date >= current_month
            )
        ).scalar() or 0
        
        # 总喂食次数（与今日、本月口径保持一致：按 feeding_time、notes、amount 聚合计数）
        total_feedings = db.session.query(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).join(Parrot).filter(
            and_(
                Parrot.id.in_(parrot_ids),
                Parrot.is_active == True
            )
        ).group_by(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).count() or 0

        # 总健康检查次数（按健康记录条目计数）
        total_checkups = db.session.query(func.count(HealthRecord.id)).filter(
            HealthRecord.parrot_id.in_(parrot_ids)
        ).scalar() or 0

        # 今日记录数
        today = date.today()
        today_feeding = db.session.query(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).join(Parrot).filter(
            and_(
                Parrot.id.in_(parrot_ids),
                Parrot.is_active == True,
                func.date(FeedingRecord.feeding_time) == today
            )
        ).group_by(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).count() or 0
        
        today_cleaning = db.session.query(func.count(CleaningRecord.id)).filter(
            and_(
                CleaningRecord.parrot_id.in_(parrot_ids),
                func.date(CleaningRecord.cleaning_time) == today
            )
        ).scalar() or 0
        
        # 本月记录数
        monthly_feeding = db.session.query(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).join(Parrot).filter(
            and_(
                Parrot.id.in_(parrot_ids),
                Parrot.is_active == True,
                func.date(FeedingRecord.feeding_time) >= current_month
            )
        ).group_by(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).count() or 0
        
        monthly_health_checks = db.session.query(func.count(HealthRecord.id)).filter(
            and_(
                HealthRecord.parrot_id.in_(parrot_ids),
                func.date(HealthRecord.record_date) >= current_month
            )
        ).scalar() or 0
        
        return success_response({
            'total_parrots': total_parrots,
            'health_status': health_status,
            'monthly_expense': float(monthly_expense),
            'monthly_income': float(monthly_income),
            'total_feedings': total_feedings,
            'total_checkups': total_checkups,
            'monthly_feeding': monthly_feeding,
            'monthly_health_checks': monthly_health_checks,
            'stats_views': user_stats.stats_views,  # 添加统计查看次数
            'today_records': {
                'feeding': today_feeding,
                'cleaning': today_cleaning
            }
        })
        
    except Exception as e:
        return error_response(f'获取统计数据失败: {str(e)}')

@statistics_bp.route('/feeding-trends', methods=['GET'])
@login_required
def get_feeding_trends():
    """获取喂食趋势"""
    try:
        user = request.current_user
        days = request.args.get('days', 30, type=int)
        parrot_id = request.args.get('parrot_id', type=int)
        
        # 计算日期范围
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # 获取可访问的鹦鹉ID
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 基础查询
        query = db.session.query(
            func.date(FeedingRecord.feeding_time).label('date'),
            func.count(FeedingRecord.id).label('count'),
            func.sum(FeedingRecord.amount).label('total_amount')
        ).filter(
            FeedingRecord.parrot_id.in_(accessible_parrot_ids),
            func.date(FeedingRecord.feeding_time) >= start_date,
            func.date(FeedingRecord.feeding_time) <= end_date
        )
        
        if parrot_id:
            # 确保指定的鹦鹉ID在可访问范围内
            if parrot_id not in accessible_parrot_ids:
                return error_response('无权访问该鹦鹉数据', 403)
            query = query.filter(FeedingRecord.parrot_id == parrot_id)
        
        results = query.group_by(func.date(FeedingRecord.feeding_time)).all()
        
        # 构建完整的日期序列
        trends = []
        current_date = start_date
        result_dict = {str(r.date): r for r in results}
        
        while current_date <= end_date:
            date_str = str(current_date)
            if date_str in result_dict:
                r = result_dict[date_str]
                trends.append({
                    'date': date_str,
                    'count': r.count,
                    'total_amount': float(r.total_amount or 0)
                })
            else:
                trends.append({
                    'date': date_str,
                    'count': 0,
                    'total_amount': 0
                })
            current_date += timedelta(days=1)
        
        return success_response(trends)
        
    except Exception as e:
        return error_response(f'获取喂食趋势失败: {str(e)}')

@statistics_bp.route('/health-trends', methods=['GET'])
@login_required
def get_health_trends():
    """获取健康趋势"""
    try:
        user = request.current_user
        days = request.args.get('days', 30, type=int)
        parrot_id = request.args.get('parrot_id', type=int)
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # 获取可访问的鹦鹉ID
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 体重趋势
        weight_query = db.session.query(
            func.date(HealthRecord.record_date).label('date'),
            func.avg(HealthRecord.weight).label('avg_weight')
        ).filter(
            HealthRecord.parrot_id.in_(accessible_parrot_ids),
            HealthRecord.weight.isnot(None),
            func.date(HealthRecord.record_date) >= start_date,
            func.date(HealthRecord.record_date) <= end_date
        )
        
        if parrot_id:
            # 确保指定的鹦鹉ID在可访问范围内
            if parrot_id not in accessible_parrot_ids:
                return error_response('无权访问该鹦鹉数据', 403)
            weight_query = weight_query.filter(HealthRecord.parrot_id == parrot_id)
        
        weight_results = weight_query.group_by(func.date(HealthRecord.record_date)).all()
        
        # 健康记录类型统计
        record_type_stats = db.session.query(
            HealthRecord.record_type,
            func.count(HealthRecord.id).label('count')
        ).filter(
            HealthRecord.parrot_id.in_(accessible_parrot_ids),
            func.date(HealthRecord.record_date) >= start_date,
            func.date(HealthRecord.record_date) <= end_date
        )
        
        if parrot_id:
            record_type_stats = record_type_stats.filter(HealthRecord.parrot_id == parrot_id)
        
        record_type_results = record_type_stats.group_by(HealthRecord.record_type).all()
        
        return success_response({
            'weight_trends': [
                {
                    'date': str(r.date),
                    'avg_weight': float(r.avg_weight or 0)
                }
                for r in weight_results
            ],
            'record_type_stats': [
                {
                    'type': r.record_type,
                    'count': r.count
                }
                for r in record_type_results
            ]
        })
        
    except Exception as e:
        return error_response(f'获取健康趋势失败: {str(e)}')

@statistics_bp.route('/expense-analysis', methods=['GET'])
@login_required
def get_expense_analysis():
    """获取支出分析"""
    try:
        user = request.current_user
        months = request.args.get('months', 6, type=int)
        
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        print(f"[DEBUG] 用户 {user.id} 请求支出分析，模式: {getattr(user, 'user_mode', 'unknown')}")
        print(f"[DEBUG] 当前团队ID: {getattr(user, 'current_team_id', 'unknown')}")
        print(f"[DEBUG] 可访问的支出ID: {expense_ids}")
        
        # 如果没有可访问的支出，直接返回空数据
        if not expense_ids:
            print("[DEBUG] 没有可访问的支出记录，返回空数据")
            return success_response({
                'monthly_expenses': [],
                'category_expenses': [],
                'parrot_expenses': []
            })
        
        # 根据用户模式获取可访问的鹦鹉ID（用于鹦鹉支出统计）
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        print(f"[DEBUG] 可访问的鹦鹉ID: {parrot_ids}")
        
        # 计算月份范围
        end_date = date.today()
        start_date = end_date.replace(day=1) - timedelta(days=months*30)
        print(f"[DEBUG] 查询时间范围: {start_date} 到 {end_date}")
        
        # 按月统计支出
        monthly_expenses = db.session.query(
            func.year(Expense.expense_date).label('year'),
            func.month(Expense.expense_date).label('month'),
            func.sum(Expense.amount).label('total_amount')
        ).filter(
            and_(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= start_date
            )
        ).group_by(
            func.year(Expense.expense_date),
            func.month(Expense.expense_date)
        ).all()
        
        # 按类别统计支出
        category_expenses = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total_amount')
        ).filter(
            and_(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= start_date
            )
        ).group_by(Expense.category).all()
        
        print(f"[DEBUG] 类别支出查询结果: {[(r.category, float(r.total_amount or 0)) for r in category_expenses]}")
        
        # 按鹦鹉统计支出
        parrot_expenses = db.session.query(
            Parrot.name,
            func.sum(Expense.amount).label('total_amount')
        ).join(Expense).filter(
            and_(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= start_date,
                Expense.parrot_id.isnot(None)
            )
        ).group_by(Parrot.name).all()
        
        print(f"[DEBUG] 鹦鹉支出查询结果: {[(r.name, float(r.total_amount or 0)) for r in parrot_expenses]}")
        
        return success_response({
            'monthly_expenses': [
                {
                    'year': r.year,
                    'month': r.month,
                    'total_amount': float(r.total_amount or 0)
                }
                for r in monthly_expenses
            ],
            'category_expenses': [
                {
                    'category': r.category,
                    'total_amount': float(r.total_amount or 0)
                }
                for r in category_expenses
            ],
            'parrot_expenses': [
                {
                    'parrot_name': r.name,
                    'total_amount': float(r.total_amount or 0)
                }
                for r in parrot_expenses
            ]
        })
        
    except Exception as e:
        return error_response(f'获取支出分析失败: {str(e)}')

@statistics_bp.route('/care-frequency', methods=['GET'])
@login_required
def get_care_frequency():
    """获取护理频率统计（返回聚合平均值，供前端展示）"""
    try:
        user = request.current_user
        days = request.args.get('days', 30, type=int)
        
        end_date = date.today()
        start_date = end_date - timedelta(days=max(1, days)-1)
        
        # 获取可访问的鹦鹉ID（仅统计启用的鹦鹉）
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 喂食总次数（按 feeding_time、notes、amount 聚合，同首页统计保持一致）
        feeding_total = db.session.query(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).join(Parrot).filter(
            Parrot.id.in_(accessible_parrot_ids),
            Parrot.is_active == True,
            func.date(FeedingRecord.feeding_time) >= start_date,
            func.date(FeedingRecord.feeding_time) <= end_date
        ).group_by(
            FeedingRecord.feeding_time,
            FeedingRecord.notes,
            FeedingRecord.amount
        ).count() or 0
        
        # 清洁总次数
        cleaning_total = db.session.query(func.count(CleaningRecord.id)).join(Parrot).filter(
            Parrot.id.in_(accessible_parrot_ids),
            Parrot.is_active == True,
            func.date(CleaningRecord.cleaning_time) >= start_date,
            func.date(CleaningRecord.cleaning_time) <= end_date
        ).scalar() or 0
        
        # 健康检查总次数
        health_total = db.session.query(func.count(HealthRecord.id)).join(Parrot).filter(
            Parrot.id.in_(accessible_parrot_ids),
            Parrot.is_active == True,
            func.date(HealthRecord.record_date) >= start_date,
            func.date(HealthRecord.record_date) <= end_date
        ).scalar() or 0
        
        # 计算平均值
        days_count = max(1, days)
        weeks = days_count / 7.0
        months = days_count / 30.0
        avg_feeding_per_day = round(feeding_total / days_count, 2)
        avg_cleaning_per_week = round(cleaning_total / weeks, 2)
        avg_health_check_per_month = round(health_total / months, 2)
        
        # 记录完整度：统计在周期内同时存在喂食、清洁、健康记录的启用鹦鹉占比
        active_parrots = db.session.query(Parrot.id).filter(
            Parrot.id.in_(accessible_parrot_ids),
            Parrot.is_active == True
        ).all()
        active_ids = [pid for (pid,) in active_parrots]
        record_completeness = 0.0
        if active_ids:
            feeding_ids = set(r[0] for r in db.session.query(FeedingRecord.parrot_id).filter(
                FeedingRecord.parrot_id.in_(active_ids),
                func.date(FeedingRecord.feeding_time) >= start_date,
                func.date(FeedingRecord.feeding_time) <= end_date
            ).distinct().all())
            cleaning_ids = set(r[0] for r in db.session.query(CleaningRecord.parrot_id).filter(
                CleaningRecord.parrot_id.in_(active_ids),
                func.date(CleaningRecord.cleaning_time) >= start_date,
                func.date(CleaningRecord.cleaning_time) <= end_date
            ).distinct().all())
            health_ids = set(r[0] for r in db.session.query(HealthRecord.parrot_id).filter(
                HealthRecord.parrot_id.in_(active_ids),
                func.date(HealthRecord.record_date) >= start_date,
                func.date(HealthRecord.record_date) <= end_date
            ).distinct().all())
            complete_ids = feeding_ids & cleaning_ids & health_ids
            record_completeness = round(len(complete_ids) / len(active_ids) * 100, 2)
        
        return success_response({
            'avg_feeding_per_day': float(avg_feeding_per_day),
            'avg_cleaning_per_week': float(avg_cleaning_per_week),
            'avg_health_check_per_month': float(avg_health_check_per_month),
            'record_completeness': float(record_completeness)
        })
        
    except Exception as e:
        return error_response(f'获取护理频率统计失败: {str(e)}')


@statistics_bp.route('/weight-trends', methods=['GET'])
@login_required
def get_weight_trends():
    """获取每只鹦鹉的体重趋势（按天平均）"""
    try:
        user = request.current_user
        days = request.args.get('days', 30, type=int)
        end_date = date.today()
        start_date = end_date - timedelta(days=max(1, days)-1)
    
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
    
        # 查询每只鹦鹉在日期范围内的每日平均体重
        results = db.session.query(
            HealthRecord.parrot_id.label('parrot_id'),
            Parrot.name.label('parrot_name'),
            ParrotSpecies.name.label('species_name'),
            ParrotSpecies.reference_weight_g.label('species_ref_weight_g'),
            func.date(HealthRecord.record_date).label('date'),
            func.avg(HealthRecord.weight).label('avg_weight')
        ).join(Parrot, HealthRecord.parrot_id == Parrot.id).outerjoin(ParrotSpecies, Parrot.species_id == ParrotSpecies.id).filter(
            HealthRecord.parrot_id.in_(accessible_parrot_ids),
            Parrot.is_active == True,
            HealthRecord.weight.isnot(None),
            func.date(HealthRecord.record_date) >= start_date,
            func.date(HealthRecord.record_date) <= end_date
        ).group_by(
            HealthRecord.parrot_id,
            Parrot.name,
            ParrotSpecies.name,
            func.date(HealthRecord.record_date)
        ).order_by(
            HealthRecord.parrot_id,
            func.date(HealthRecord.record_date)
        ).all()
    
        series_map = {}
        for r in results:
            pid = r.parrot_id
            if pid not in series_map:
                series_map[pid] = {
                    'parrot_id': pid,
                    'parrot_name': r.parrot_name,
                    'species_name': r.species_name,
                    'species_ref_weight_g': float(r.species_ref_weight_g) if r.species_ref_weight_g is not None else None,
                    'points': []
                }
            series_map[pid]['points'].append({
                'date': str(r.date),
                'weight': float(r.avg_weight or 0)
            })
    
        return success_response({
            'series': list(series_map.values()),
            'start_date': str(start_date),
            'end_date': str(end_date)
        })
    except Exception as e:
        return error_response(f'获取体重趋势失败: {str(e)}')


# ===== 健康异常检测：体重与进食频次 =====
def _median(nums):
    arr = sorted([n for n in nums if n is not None])
    if not arr:
        return None
    n = len(arr)
    mid = n // 2
    if n % 2 == 1:
        return arr[mid]
    else:
        return (arr[mid - 1] + arr[mid]) / 2.0

def _detect_weight_decline(weights_with_time,
                           window_days=7,
                           drop_pct_high=0.05,
                           drop_pct_medium=0.03,
                           slope_window_days=14,
                           slope_ratio_threshold=-0.015):
    """
    输入: [(timestamp, weight_g), ...] 按时间升序
    规则:
      - 滑动窗口：最近 window_days 的均值较之前窗口均值下降 >drop_pct_high -> high
      - 滑动窗口：最近 window_days 的均值较之前窗口均值下降 >drop_pct_medium -> medium
      - 近 slope_window_days 线性趋势斜率显著为负（相对均值比例） -> medium
    返回: dict 或 None
    """
    if not weights_with_time or len(weights_with_time) < 2:
        return None
    from datetime import datetime, timedelta
    now = datetime.now()

    # 将同一天的多条体重记录聚合为日均值，平滑噪声
    daily = {}
    for (t, w) in weights_with_time:
        if not t or w is None:
            continue
        d = t.date() if hasattr(t, 'date') else t
        daily.setdefault(d, []).append(float(w))
    daily_series = sorted([(d, sum(ws)/len(ws)) for d, ws in daily.items()], key=lambda x: x[0])
    if len(daily_series) < 2:
        return None

    # 最近窗口与之前窗口比较（窗口为天）
    recent_end = daily_series[-1][0]
    recent_start = recent_end - timedelta(days=window_days-1)
    prev_end = recent_start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=window_days-1)

    recent_vals = [w for (d, w) in daily_series if recent_start <= d <= recent_end]
    prev_vals = [w for (d, w) in daily_series if prev_start <= d <= prev_end]

    if recent_vals and prev_vals:
        recent_avg = sum(recent_vals)/len(recent_vals)
        prev_avg = sum(prev_vals)/len(prev_vals)
        if prev_avg > 0:
            drop_pct = (prev_avg - recent_avg) / prev_avg
            if drop_pct >= drop_pct_high:
                return {
                    'type': 'weight_decline',
                    'severity': 'high',
                    'message': f'体重在最近{window_days}天较前一窗口明显下滑（>{int(drop_pct_high*100)}%）。',
                    'suggestion': '请尽快复查体重，调整饮食，并考虑就医。',
                    'details': {
                        'recent_avg_g': round(float(recent_avg or 0), 2),
                        'prev_avg_g': round(float(prev_avg or 0), 2),
                        'drop_pct': round(drop_pct*100, 2)
                    }
                }
            elif drop_pct >= drop_pct_medium:
                return {
                    'type': 'weight_decline',
                    'severity': 'medium',
                    'message': f'体重在最近{window_days}天下滑（>{int(drop_pct_medium*100)}%）。',
                    'suggestion': '观察并优化营养，3-7天后复查体重。',
                    'details': {
                        'recent_avg_g': round(float(recent_avg or 0), 2),
                        'prev_avg_g': round(float(prev_avg or 0), 2),
                        'drop_pct': round(drop_pct*100, 2)
                    }
                }

    # 线性趋势（近 slope_window_days）
    window_start = now.date() - timedelta(days=slope_window_days-1)
    trend_window = [(d, w) for (d, w) in daily_series if d >= window_start]
    if len(trend_window) >= 3:
        xs = [(d - window_start).days for (d, _) in trend_window]
        ys = [w for (_, w) in trend_window]
        x_mean = sum(xs)/len(xs)
        y_mean = sum(ys)/len(ys)
        num = sum((x - x_mean)*(y - y_mean) for x, y in zip(xs, ys))
        den = sum((x - x_mean)**2 for x in xs) or 1e-6
        slope = num / den  # g/天
        baseline = y_mean or ys[-1]
        # 显著负斜率阈值：每天下降超过 baseline 的一定比例
        if baseline and slope < slope_ratio_threshold * baseline:
            return {
                'type': 'weight_decline',
                'severity': 'medium',
                'message': f'体重近{slope_window_days}天呈持续下滑趋势。',
                'suggestion': '关注摄食与活动，必要时就医排查。',
                'details': {
                    'slope_g_per_day': round(float(slope), 2),
                    'baseline_g': round(float(baseline), 2)
                }
            }
    return None

def _detect_feeding_gap(feed_times):
    """
    输入: [datetime feeding_time, ...] 升序
    规则:
      - 计算历史中位间隔；若距上次进食 > 1.5x 中位间隔 -> medium/high
      - 无法计算时回退阈值：>36h -> medium, >48h -> high
    返回: dict 或 None
    """
    if not feed_times:
        return {
            'type': 'feeding_gap',
            'severity': 'medium',
            'message': '暂无喂食记录，建议尽快补充并记录。',
            'suggestion': '完善喂食记录以便系统评估与提醒。',
            'details': {}
        }
    if len(feed_times) == 1:
        last = feed_times[-1]
        from datetime import datetime, timedelta
        hours = (datetime.now() - last).total_seconds()/3600.0
        if hours > 48:
            sev = 'high'
            msg = '已超过48小时未记录进食。'
        elif hours > 36:
            sev = 'medium'
            msg = '已超过36小时未记录进食。'
        else:
            return None
        return {
            'type': 'feeding_gap',
            'severity': sev,
            'message': msg,
            'suggestion': '检查实际进食情况，尽快补充记录与喂食。',
            'details': { 'gap_hours': round(hours, 1) }
        }
    # 计算中位间隔
    deltas = []
    for i in range(1, len(feed_times)):
        delta = (feed_times[i] - feed_times[i-1]).total_seconds()/3600.0
        # 合理区间 2h-72h
        if 2 <= delta <= 72:
            deltas.append(delta)
    med = _median(deltas)
    from datetime import datetime
    last = feed_times[-1]
    gap_h = (datetime.now() - last).total_seconds()/3600.0
    if med:
        if gap_h >= 2.0 * med:
            sev = 'high'
            msg = '进食间隔远超常态。'
        elif gap_h >= 1.5 * med:
            sev = 'medium'
            msg = '进食间隔高于常态。'
        else:
            return None
        return {
            'type': 'feeding_gap',
            'severity': sev,
            'message': msg,
            'suggestion': '关注摄食意愿与精神状态，必要时复查。',
            'details': { 'gap_hours': round(gap_h, 1), 'median_hours': round(med, 1) }
        }
    else:
        # 回退阈值
        if gap_h > 48:
            sev = 'high'
            msg = '已超过48小时未记录进食。'
        elif gap_h > 36:
            sev = 'medium'
            msg = '已超过36小时未记录进食。'
        else:
            return None
        return {
            'type': 'feeding_gap',
            'severity': sev,
            'message': msg,
            'suggestion': '检查实际进食情况，尽快补充记录与喂食。',
            'details': { 'gap_hours': round(gap_h, 1) }
        }

def _detect_feeding_frequency(feed_times,
                              window_days=7,
                              baseline_days=21,
                              low_ratio_medium=0.6,
                              low_ratio_high=0.4):
    """
    输入: [datetime feeding_time, ...] 升序
    规则（滑动窗口按日计数）:
      - 最近 window_days 的每日喂食中位数相对之前 baseline_days 的每日喂食中位数显著偏低
        · < low_ratio_high -> high
        · < low_ratio_medium -> medium
    返回: dict 或 None
    """
    if not feed_times:
        return None
    from datetime import timedelta
    # 按日聚合计数
    daily_counts = {}
    for t in feed_times:
        if not t:
            continue
        d = t.date() if hasattr(t, 'date') else t
        daily_counts[d] = daily_counts.get(d, 0) + 1
    if not daily_counts:
        return None
    days_sorted = sorted(daily_counts.keys())
    last_day = days_sorted[-1]
    recent_start = last_day - timedelta(days=window_days-1)
    baseline_end = recent_start - timedelta(days=1)
    baseline_start = baseline_end - timedelta(days=baseline_days-1)

    recent_vals = [daily_counts.get(d, 0) for d in days_sorted if recent_start <= d <= last_day]
    baseline_vals = [daily_counts.get(d, 0) for d in days_sorted if baseline_start <= d <= baseline_end]

    if not recent_vals or not baseline_vals:
        # 若无有效对照窗口，则不触发频次预警
        return None

    recent_med = _median(recent_vals)
    baseline_med = _median(baseline_vals)
    if baseline_med is None or baseline_med <= 0:
        return None
    ratio = (recent_med or 0) / baseline_med
    if ratio < low_ratio_high:
        return {
            'type': 'feeding_frequency_low',
            'severity': 'high',
            'message': f'最近{window_days}天喂食频次显著低于常态。',
            'suggestion': '评估采食意愿与健康状态，必要时增补与就医。',
            'details': {
                'recent_median_per_day': float(recent_med or 0),
                'baseline_median_per_day': float(baseline_med or 0),
                'ratio': round(float(ratio), 2)
            }
        }
    elif ratio < low_ratio_medium:
        return {
            'type': 'feeding_frequency_low',
            'severity': 'medium',
            'message': f'最近{window_days}天喂食频次低于常态。',
            'suggestion': '适当增加喂食关注与记录，观察精神状态。',
            'details': {
                'recent_median_per_day': float(recent_med or 0),
                'baseline_median_per_day': float(baseline_med or 0),
                'ratio': round(float(ratio), 2)
            }
        }
    return None

@statistics_bp.route('/health-anomalies', methods=['GET'])
@login_required
def get_health_anomalies():
    """健康异常检测：体重快速下滑与进食频次异常。
    Query:
      - days: 数据回看天数（默认30）
      - parrot_id: 指定鹦鹉（可选）
    返回: 每只鹦鹉的异常列表及建议
    """
    try:
        user = request.current_user
        days = request.args.get('days', 30, type=int)
        parrot_id = request.args.get('parrot_id', type=int)
        # 可选阈值与窗口参数（提供默认值，支持滑动窗口检测）
        weight_window_days = request.args.get('weight_window_days', 7, type=int)
        weight_drop_pct_high = request.args.get('weight_drop_pct_high', 0.05, type=float)
        weight_drop_pct_medium = request.args.get('weight_drop_pct_medium', 0.03, type=float)
        slope_window_days = request.args.get('slope_window_days', 14, type=int)
        slope_ratio_threshold = request.args.get('slope_ratio_threshold', -0.015, type=float)

        feed_window_days = request.args.get('feed_window_days', 7, type=int)
        feed_baseline_days = request.args.get('feed_baseline_days', 21, type=int)
        feed_low_ratio_medium = request.args.get('feed_low_ratio_medium', 0.6, type=float)
        feed_low_ratio_high = request.args.get('feed_low_ratio_high', 0.4, type=float)

        end_date = date.today()
        start_date = end_date - timedelta(days=max(1, days)-1)

        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        if parrot_id:
            if parrot_id not in accessible_parrot_ids:
                return error_response('无权访问该鹦鹉数据', 403)
            target_ids = [parrot_id]
        else:
            target_ids = accessible_parrot_ids

        results = []
        for pid in target_ids:
            parrot = Parrot.query.get(pid)
            if not parrot or not parrot.is_active:
                continue

            # 体重数据（按时间升序）
            w_rows = db.session.query(HealthRecord.record_date, HealthRecord.weight).filter(
                HealthRecord.parrot_id == pid,
                HealthRecord.weight.isnot(None),
                func.date(HealthRecord.record_date) >= start_date,
                func.date(HealthRecord.record_date) <= end_date
            ).order_by(HealthRecord.record_date.asc()).all()
            weights = [(r[0], float(r[1])) for r in w_rows if r[0] is not None and r[1] is not None]

            # 喂食时间（按时间升序）
            f_rows = db.session.query(FeedingRecord.feeding_time).filter(
                FeedingRecord.parrot_id == pid,
                func.date(FeedingRecord.feeding_time) >= start_date,
                func.date(FeedingRecord.feeding_time) <= end_date
            ).order_by(FeedingRecord.feeding_time.asc()).all()
            feed_times = [r[0] for r in f_rows if r[0] is not None]

            anomalies = []
            aw = _detect_weight_decline(
                weights,
                window_days=weight_window_days,
                drop_pct_high=weight_drop_pct_high,
                drop_pct_medium=weight_drop_pct_medium,
                slope_window_days=slope_window_days,
                slope_ratio_threshold=slope_ratio_threshold
            )
            if aw:
                anomalies.append(aw)
            af = _detect_feeding_gap(feed_times)
            if af:
                anomalies.append(af)
            # 滑动窗口频次检测
            ff = _detect_feeding_frequency(
                feed_times,
                window_days=feed_window_days,
                baseline_days=feed_baseline_days,
                low_ratio_medium=feed_low_ratio_medium,
                low_ratio_high=feed_low_ratio_high
            )
            if ff:
                anomalies.append(ff)

            results.append({
                'parrot_id': pid,
                'parrot_name': parrot.name,
                'anomalies': anomalies
            })

        return success_response({
            'start_date': str(start_date),
            'end_date': str(end_date),
            'results': results
        })
    except Exception as e:
        return error_response(f'获取健康异常检测失败: {str(e)}')
