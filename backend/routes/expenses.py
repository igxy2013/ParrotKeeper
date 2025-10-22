from flask import Blueprint, request, jsonify
from models import db, Expense, Parrot
from utils import login_required, success_response, error_response, paginate_query
from datetime import datetime, date
from sqlalchemy import func, desc

expenses_bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')

@expenses_bp.route('', methods=['GET'])
@login_required
def get_expenses():
    """获取支出列表"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        category = request.args.get('category', '')
        parrot_id = request.args.get('parrot_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # 构建查询
        query = Expense.query.filter_by(user_id=user.id)
        
        if category:
            query = query.filter(Expense.category == category)
        
        if parrot_id:
            query = query.filter(Expense.parrot_id == parrot_id)
        
        if start_date:
            query = query.filter(Expense.expense_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            query = query.filter(Expense.expense_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        
        # 按日期倒序排列
        query = query.order_by(desc(Expense.expense_date), desc(Expense.created_at))
        
        # 分页
        result = paginate_query(query, page, limit)
        
        # 格式化数据
        expenses = []
        for expense in result['items']:
            expense_data = {
                'id': expense.id,
                'category': expense.category,
                'amount': float(expense.amount),
                'description': expense.description,
                'expense_date': expense.expense_date.strftime('%Y-%m-%d'),
                'created_at': expense.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'parrot_name': expense.parrot.name if expense.parrot else None
            }
            expenses.append(expense_data)
        
        result['items'] = expenses
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取支出列表失败: {str(e)}')

@expenses_bp.route('', methods=['POST'])
@login_required
def create_expense():
    """创建支出记录"""
    try:
        user = request.current_user
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('category') or not data.get('amount'):
            return error_response('类别和金额不能为空')
        
        # 验证金额
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return error_response('金额必须大于0')
        except (ValueError, TypeError):
            return error_response('金额格式不正确')
        
        # 验证鹦鹉ID（如果提供）
        parrot_id = data.get('parrot_id')
        if parrot_id:
            parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
            if not parrot:
                return error_response('鹦鹉不存在')
        
        # 解析日期
        expense_date = date.today()
        if data.get('expense_date'):
            try:
                expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式不正确')
        
        # 创建支出记录
        expense = Expense(
            user_id=user.id,
            parrot_id=parrot_id,
            category=data['category'],
            amount=amount,
            description=data.get('description', ''),
            expense_date=expense_date
        )
        
        db.session.add(expense)
        db.session.commit()
        
        return success_response({
            'id': expense.id,
            'category': expense.category,
            'amount': float(expense.amount),
            'description': expense.description,
            'expense_date': expense.expense_date.strftime('%Y-%m-%d'),
            'created_at': expense.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'parrot_name': expense.parrot.name if expense.parrot else None
        }, '支出记录创建成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建支出记录失败: {str(e)}')

@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    """获取单个支出记录"""
    try:
        user = request.current_user
        expense = Expense.query.filter_by(id=expense_id, user_id=user.id).first()
        
        if not expense:
            return error_response('支出记录不存在', 404)
        
        return success_response({
            'id': expense.id,
            'category': expense.category,
            'amount': float(expense.amount),
            'description': expense.description,
            'expense_date': expense.expense_date.strftime('%Y-%m-%d'),
            'created_at': expense.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'parrot_id': expense.parrot_id,
            'parrot_name': expense.parrot.name if expense.parrot else None
        })
        
    except Exception as e:
        return error_response(f'获取支出记录失败: {str(e)}')

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@login_required
def update_expense(expense_id):
    """更新支出记录"""
    try:
        user = request.current_user
        expense = Expense.query.filter_by(id=expense_id, user_id=user.id).first()
        
        if not expense:
            return error_response('支出记录不存在', 404)
        
        data = request.get_json()
        
        # 验证金额
        if 'amount' in data:
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return error_response('金额必须大于0')
                expense.amount = amount
            except (ValueError, TypeError):
                return error_response('金额格式不正确')
        
        # 验证鹦鹉ID
        if 'parrot_id' in data:
            parrot_id = data['parrot_id']
            if parrot_id:
                parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
                if not parrot:
                    return error_response('鹦鹉不存在')
            expense.parrot_id = parrot_id
        
        # 更新其他字段
        if 'category' in data:
            expense.category = data['category']
        
        if 'description' in data:
            expense.description = data['description']
        
        if 'expense_date' in data:
            try:
                expense.expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式不正确')
        
        db.session.commit()
        
        return success_response({
            'id': expense.id,
            'category': expense.category,
            'amount': float(expense.amount),
            'description': expense.description,
            'expense_date': expense.expense_date.strftime('%Y-%m-%d'),
            'created_at': expense.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'parrot_name': expense.parrot.name if expense.parrot else None
        }, '支出记录更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新支出记录失败: {str(e)}')

@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """删除支出记录"""
    try:
        user = request.current_user
        expense = Expense.query.filter_by(id=expense_id, user_id=user.id).first()
        
        if not expense:
            return error_response('支出记录不存在', 404)
        
        db.session.delete(expense)
        db.session.commit()
        
        return success_response(None, '支出记录删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除支出记录失败: {str(e)}')

@expenses_bp.route('/categories', methods=['GET'])
@login_required
def get_categories():
    """获取支出类别列表"""
    categories = [
        {'value': 'food', 'label': '食物'},
        {'value': 'medical', 'label': '医疗'},
        {'value': 'toys', 'label': '玩具'},
        {'value': 'cage', 'label': '笼具'},
        {'value': 'other', 'label': '其他'}
    ]
    return success_response(categories)

@expenses_bp.route('/summary', methods=['GET'])
@login_required
def get_expense_summary():
    """获取支出汇总"""
    try:
        user = request.current_user
        
        # 本月支出
        current_month = date.today().replace(day=1)
        monthly_total = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user.id,
            Expense.expense_date >= current_month
        ).scalar() or 0
        
        # 本年支出
        current_year = date.today().replace(month=1, day=1)
        yearly_total = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user.id,
            Expense.expense_date >= current_year
        ).scalar() or 0
        
        # 按类别统计本月支出
        category_stats = db.session.query(
            Expense.category,
            func.sum(Expense.amount).label('total'),
            func.count(Expense.id).label('count')
        ).filter(
            Expense.user_id == user.id,
            Expense.expense_date >= current_month
        ).group_by(Expense.category).all()
        
        categories = []
        for stat in category_stats:
            categories.append({
                'category': stat.category,
                'total': float(stat.total),
                'count': stat.count
            })
        
        return success_response({
            'monthly_total': float(monthly_total),
            'yearly_total': float(yearly_total),
            'categories': categories
        })
        
    except Exception as e:
        return error_response(f'获取支出汇总失败: {str(e)}')