from flask import Blueprint, request, jsonify
from models import db, Parrot, FeedingRecord, HealthRecord, CleaningRecord, Expense, UserStatistics
from utils import login_required, success_response, error_response
from team_utils import get_accessible_parrots
from team_mode_utils import get_accessible_parrot_ids_by_mode, get_accessible_expense_ids_by_mode
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_

statistics_bp = Blueprint('statistics', __name__, url_prefix='/api/statistics')

@statistics_bp.route('/overview', methods=['GET'])
@login_required
def get_overview():
    """获取总览统计"""
    try:
        user = request.current_user
        
        # 记录统计页面查看次数
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
        
        # 根据用户模式获取可访问的鹦鹉ID
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 鹦鹉总数
        total_parrots = len([pid for pid in parrot_ids if Parrot.query.get(pid) and Parrot.query.get(pid).is_active])
        
        # 健康状态统计
        health_stats = db.session.query(
            Parrot.health_status,
            func.count(Parrot.id).label('count')
        ).filter(Parrot.id.in_(parrot_ids), Parrot.is_active == True).group_by(Parrot.health_status).all()
        
        health_status = {status: 0 for status in ['healthy', 'sick', 'recovering']}
        for status, count in health_stats:
            health_status[status] = count
        
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
            'monthly_income': 0.0,  # 添加本月收入字段，暂时设为0
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
            func.date(HealthRecord.record_date).label('date'),
            func.avg(HealthRecord.weight).label('avg_weight')
        ).join(Parrot, HealthRecord.parrot_id == Parrot.id).filter(
            HealthRecord.parrot_id.in_(accessible_parrot_ids),
            Parrot.is_active == True,
            HealthRecord.weight.isnot(None),
            func.date(HealthRecord.record_date) >= start_date,
            func.date(HealthRecord.record_date) <= end_date
        ).group_by(
            HealthRecord.parrot_id,
            Parrot.name,
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