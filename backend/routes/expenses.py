from flask import Blueprint, request, jsonify
from models import db, Expense, Income, Parrot
from utils import login_required, success_response, error_response, paginate_query
from team_utils import get_accessible_parrots
from team_mode_utils import get_accessible_parrot_ids_by_mode, get_accessible_expense_ids_by_mode, get_accessible_income_ids_by_mode, filter_expenses_by_mode
from datetime import datetime, date
from sqlalchemy import func, desc

expenses_bp = Blueprint('expenses', __name__, url_prefix='/api/expenses')

@expenses_bp.route('', methods=['GET'])
@login_required
def get_expenses():
    """获取支出列表（包括个人和团队共享鹦鹉的支出）"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category', '')
        parrot_id = request.args.get('parrot_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        print(f"[DEBUG] 用户 {user.id} 请求支出列表，模式: {getattr(user, 'user_mode', 'personal')}")
        print(f"[DEBUG] 当前团队ID: {getattr(user, 'current_team_id', None)}")
        
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        print(f"[DEBUG] 可访问的支出ID: {expense_ids}")
        
        if not expense_ids:
            # 如果没有可访问的支出，返回空结果
            return success_response({
                'items': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'has_next': False
            })
        
        # 构建查询 - 查询可访问的支出
        query = Expense.query.filter(Expense.id.in_(expense_ids))
        
        if category:
            query = query.filter(Expense.category == category)
        
        if parrot_id:
            # 确保请求的parrot_id在用户可访问的范围内
            parrot_ids = get_accessible_parrot_ids_by_mode(user)
            if parrot_id in parrot_ids:
                query = query.filter(Expense.parrot_id == parrot_id)
            else:
                return error_response('无权访问该鹦鹉的支出记录', 403)
        
        if start_date:
            query = query.filter(Expense.expense_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            # 与汇总接口保持一致，结束日期使用“严格小于”实现半开区间 [start_date, end_date)
            query = query.filter(Expense.expense_date < datetime.strptime(end_date, '%Y-%m-%d').date())
        
        # 按日期倒序排列
        query = query.order_by(desc(Expense.expense_date), desc(Expense.created_at))
        
        print(f"[DEBUG] 查询SQL: {query}")
        
        # 统计总金额（按当前筛选条件）
        total_amount_value = query.with_entities(func.sum(Expense.amount)).order_by(None).scalar() or 0

        # 分页
        result = paginate_query(query, page, per_page)
        
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
        result['total_amount'] = float(total_amount_value)
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取支出列表失败: {str(e)}')

@expenses_bp.route('', methods=['POST'])
@login_required
def create_expense():
    """创建支出记录"""
    try:
        user = request.current_user
        print(f"[DEBUG] 创建支出记录 - 用户ID: {user.id}, 用户模式: {getattr(user, 'user_mode', 'personal')}")
        
        # 在团队模式下，只有管理员才能添加支出记录
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            if not user.current_team_id:
                return error_response('请先选择团队', 400)
            
            # 检查用户是否是团队管理员
            from team_models import TeamMember
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id, 
                user_id=user.id, 
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能添加支出记录', 403)
        
        data = request.get_json()
        print(f"[DEBUG] 接收到的数据: {data}")
        
        # 验证必填字段
        if not data.get('category') or not data.get('amount'):
            print(f"[DEBUG] 必填字段验证失败 - category: {data.get('category')}, amount: {data.get('amount')}")
            return error_response('类别和金额不能为空')
        
        # 验证类别是否在允许的范围内
        allowed_categories = ['food', 'medical', 'toys', 'cage', 'baby_bird', 'breeding_bird', 'other']
        if data.get('category') not in allowed_categories:
            print(f"[DEBUG] 类别验证失败 - 收到的类别: {data.get('category')}, 允许的类别: {allowed_categories}")
            return error_response(f'不支持的支出类别: {data.get("category")}')
        
        print(f"[DEBUG] 类别验证通过 - 类别: {data.get('category')}")
        
        # 验证金额
        try:
            amount = float(data['amount'])
            if amount <= 0:
                print(f"[DEBUG] 金额验证失败 - 金额必须大于0: {amount}")
                return error_response('金额必须大于0')
            print(f"[DEBUG] 金额验证通过 - 金额: {amount}")
        except (ValueError, TypeError) as e:
            print(f"[DEBUG] 金额格式验证失败 - 错误: {str(e)}, 原始值: {data['amount']}")
            return error_response('金额格式不正确')
        
        # 验证鹦鹉ID（如果提供）
        parrot_id = data.get('parrot_id')
        if parrot_id:
            parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
            if not parrot:
                print(f"[DEBUG] 鹦鹉验证失败 - 鹦鹉ID: {parrot_id}")
                return error_response('鹦鹉不存在')
            print(f"[DEBUG] 鹦鹉验证通过 - 鹦鹉ID: {parrot_id}")
        
        # 解析日期
        expense_date = date.today()
        if data.get('expense_date'):
            try:
                expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
                print(f"[DEBUG] 日期解析成功 - 日期: {expense_date}")
            except ValueError as e:
                print(f"[DEBUG] 日期解析失败 - 错误: {str(e)}, 原始值: {data.get('expense_date')}")
                return error_response('日期格式不正确')
        
        print(f"[DEBUG] 准备创建支出记录 - 用户ID: {user.id}, 类别: {data['category']}, 金额: {amount}")
        
        # 创建支出记录
        expense = Expense(
            user_id=user.id,
            parrot_id=parrot_id,
            category=data['category'],
            amount=amount,
            description=data.get('description', ''),
            expense_date=expense_date,
            team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
        )
        
        print(f"[DEBUG] 支出记录对象创建成功，准备保存到数据库")
        
        db.session.add(expense)
        db.session.commit()
        
        print(f"[DEBUG] 支出记录保存成功 - ID: {expense.id}")
        
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
        print(f"[ERROR] 创建支出记录异常: {str(e)}")
        print(f"[ERROR] 异常类型: {type(e).__name__}")
        import traceback
        print(f"[ERROR] 异常堆栈: {traceback.format_exc()}")
        db.session.rollback()
        return error_response(f'创建支出记录失败: {str(e)}')

@expenses_bp.route('/<int:expense_id>', methods=['GET'])
@login_required
def get_expense(expense_id):
    """获取单个支出记录"""
    try:
        user = request.current_user
        
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        
        # 检查支出是否可访问
        if expense_id not in expense_ids:
            return error_response('支出记录不存在', 404)
        
        expense = Expense.query.get(expense_id)
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
        from team_models import TeamMember
        
        user = request.current_user
        
        # 在团队模式下，检查用户是否为管理员
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能修改支出记录', 403)
        
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        
        # 检查支出是否可访问
        if expense_id not in expense_ids:
            return error_response('支出记录不存在', 404)
        
        expense = Expense.query.get(expense_id)
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
                # 检查鹦鹉是否可访问
                parrot_ids = get_accessible_parrot_ids_by_mode(user)
                if parrot_id not in parrot_ids:
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
        from team_models import TeamMember
        
        user = request.current_user
        
        # 在团队模式下，检查用户是否为管理员
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能删除支出记录', 403)
        
        # 根据用户模式获取可访问的支出ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        
        # 检查支出是否可访问
        if expense_id not in expense_ids:
            return error_response('支出记录不存在', 404)
        
        expense = Expense.query.get(expense_id)
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
        {'value': 'baby_bird', 'label': '幼鸟'},
        {'value': 'breeding_bird', 'label': '种鸟'},
        {'value': 'other', 'label': '其他'}
    ]
    return success_response(categories)

@expenses_bp.route('/summary', methods=['GET'])
@login_required
def get_expense_summary():
    """获取收支汇总"""
    try:
        user = request.current_user
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # 根据用户模式获取可访问的支出和收入ID
        expense_ids = get_accessible_expense_ids_by_mode(user)
        income_ids = get_accessible_income_ids_by_mode(user)
        
        # 构建基础查询
        expense_base_query = db.session.query(func.sum(Expense.amount)).filter(
            Expense.id.in_(expense_ids)
        )
        income_base_query = db.session.query(func.sum(Income.amount)).filter(
            Income.id.in_(income_ids)
        )
        
        # 如果有时间范围参数，使用指定的时间范围
        if start_date and end_date:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            # 总支出（指定时间范围）
            total_expense = expense_base_query.filter(
                Expense.expense_date >= start_date_obj,
                Expense.expense_date < end_date_obj
            ).scalar() or 0
            
            # 总收入（指定时间范围）
            total_income = income_base_query.filter(
                Income.income_date >= start_date_obj,
                Income.income_date < end_date_obj
            ).scalar() or 0
            
            # 按类别统计支出（指定时间范围）
            category_stats = db.session.query(
                Expense.category,
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).filter(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= start_date_obj,
                Expense.expense_date < end_date_obj
            ).group_by(Expense.category).all()
            
        else:
            # 默认使用本月数据
            current_month = date.today().replace(day=1)
            
            # 本月支出
            total_expense = expense_base_query.filter(
                Expense.expense_date >= current_month
            ).scalar() or 0
            
            # 本月收入
            total_income = income_base_query.filter(
                Income.income_date >= current_month
            ).scalar() or 0
            
            # 按类别统计本月支出
            category_stats = db.session.query(
                Expense.category,
                func.sum(Expense.amount).label('total'),
                func.count(Expense.id).label('count')
            ).filter(
                Expense.id.in_(expense_ids),
                Expense.expense_date >= current_month
            ).group_by(Expense.category).all()
        
        categories = []
        for stat in category_stats:
            categories.append({
                'category': stat.category,
                'total': float(stat.total),
                'count': stat.count
            })
        
        # 计算净收入 = 收入 - 支出
        net_income = float(total_income) - float(total_expense)
        
        return success_response({
            'totalExpense': float(total_expense),
            'totalIncome': float(total_income),
            'netIncome': net_income,
            'categories': categories
        })
        
    except Exception as e:
        return error_response(f'获取收支汇总失败: {str(e)}')

# 收入相关API
@expenses_bp.route('/incomes', methods=['GET'])
@login_required
def get_incomes():
    """获取收入列表（包括个人和团队共享鹦鹉的收入）"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category', '')
        parrot_id = request.args.get('parrot_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        print(f"[DEBUG] 用户 {user.id} 请求收入列表，模式: {getattr(user, 'user_mode', 'personal')}")
        print(f"[DEBUG] 当前团队ID: {getattr(user, 'current_team_id', None)}")
        
        # 根据用户模式获取可访问的收入ID
        income_ids = get_accessible_income_ids_by_mode(user)
        print(f"[DEBUG] 可访问的收入ID: {income_ids}")
        
        if not income_ids:
            # 如果没有可访问的收入，返回空结果
            return success_response({
                'items': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'has_next': False
            })
        
        # 构建查询 - 查询可访问的收入
        query = Income.query.filter(Income.id.in_(income_ids))
        
        if category:
            query = query.filter(Income.category == category)
        
        if parrot_id:
            # 确保请求的parrot_id在用户可访问的范围内
            parrot_ids = get_accessible_parrot_ids_by_mode(user)
            if parrot_id in parrot_ids:
                query = query.filter(Income.parrot_id == parrot_id)
            else:
                return error_response('无权访问该鹦鹉的收入记录', 403)
        
        if start_date:
            query = query.filter(Income.income_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        
        if end_date:
            # 与支出接口保持一致，结束日期使用"严格小于"实现半开区间 [start_date, end_date)
            query = query.filter(Income.income_date < datetime.strptime(end_date, '%Y-%m-%d').date())
        
        # 按日期倒序排列
        query = query.order_by(desc(Income.income_date), desc(Income.created_at))
        
        print(f"[DEBUG] 查询SQL: {query}")
        
        # 统计总金额（按当前筛选条件）
        total_amount_value = query.with_entities(func.sum(Income.amount)).order_by(None).scalar() or 0

        # 分页
        result = paginate_query(query, page, per_page)
        
        # 格式化数据
        incomes = []
        for income in result['items']:
            income_data = {
                'id': income.id,
                'category': income.category,
                'amount': float(income.amount),
                'description': income.description,
                'income_date': income.income_date.strftime('%Y-%m-%d'),
                'created_at': income.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'parrot_name': income.parrot.name if income.parrot else None
            }
            incomes.append(income_data)
        
        result['items'] = incomes
        result['total_amount'] = float(total_amount_value)
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取收入列表失败: {str(e)}')

@expenses_bp.route('/incomes', methods=['POST'])
@login_required
def create_income():
    """创建收入记录"""
    try:
        user = request.current_user
        print(f"[DEBUG] 创建收入记录 - 用户ID: {user.id}, 用户模式: {getattr(user, 'user_mode', 'personal')}")
        
        # 在团队模式下，只有管理员才能添加收入记录
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            if not user.current_team_id:
                return error_response('请先选择团队', 400)
            
            # 检查用户是否是团队管理员
            from team_models import TeamMember
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id, 
                user_id=user.id, 
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能添加收入记录', 403)
        
        data = request.get_json()
        print(f"[DEBUG] 接收到的数据: {data}")
        
        # 验证必填字段
        if not data.get('category') or not data.get('amount'):
            print(f"[DEBUG] 必填字段验证失败 - category: {data.get('category')}, amount: {data.get('amount')}")
            return error_response('类别和金额不能为空')
        
        # 验证类别是否在允许的范围内
        allowed_categories = ['breeding_sale', 'bird_sale', 'service', 'competition', 'other']
        if data.get('category') not in allowed_categories:
            print(f"[DEBUG] 类别验证失败 - 收到的类别: {data.get('category')}, 允许的类别: {allowed_categories}")
            return error_response(f'不支持的收入类别: {data.get("category")}')
        
        print(f"[DEBUG] 类别验证通过 - 类别: {data.get('category')}")
        
        # 验证金额
        try:
            amount = float(data['amount'])
            if amount <= 0:
                print(f"[DEBUG] 金额验证失败 - 金额必须大于0: {amount}")
                return error_response('金额必须大于0')
            print(f"[DEBUG] 金额验证通过 - 金额: {amount}")
        except (ValueError, TypeError) as e:
            print(f"[DEBUG] 金额格式验证失败 - 错误: {str(e)}, 原始值: {data['amount']}")
            return error_response('金额格式不正确')
        
        # 验证鹦鹉ID（如果提供）
        parrot_id = data.get('parrot_id')
        if parrot_id:
            parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
            if not parrot:
                print(f"[DEBUG] 鹦鹉验证失败 - 鹦鹉ID: {parrot_id}")
                return error_response('鹦鹉不存在')
            print(f"[DEBUG] 鹦鹉验证通过 - 鹦鹉ID: {parrot_id}")
        
        # 解析日期
        income_date = date.today()
        if data.get('income_date'):
            try:
                income_date = datetime.strptime(data['income_date'], '%Y-%m-%d').date()
                print(f"[DEBUG] 日期解析成功 - 日期: {income_date}")
            except ValueError as e:
                print(f"[DEBUG] 日期解析失败 - 错误: {str(e)}, 原始值: {data.get('income_date')}")
                return error_response('日期格式不正确')
        
        print(f"[DEBUG] 准备创建收入记录 - 用户ID: {user.id}, 类别: {data['category']}, 金额: {amount}")
        
        # 创建收入记录
        income = Income(
            user_id=user.id,
            parrot_id=parrot_id,
            category=data['category'],
            amount=amount,
            description=data.get('description', ''),
            income_date=income_date,
            team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
        )
        
        print(f"[DEBUG] 收入记录对象创建成功，准备保存到数据库")
        
        db.session.add(income)
        db.session.commit()
        
        print(f"[DEBUG] 收入记录保存成功 - ID: {income.id}")
        
        return success_response({
            'id': income.id,
            'category': income.category,
            'amount': float(income.amount),
            'description': income.description,
            'income_date': income.income_date.strftime('%Y-%m-%d'),
            'created_at': income.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'parrot_name': income.parrot.name if income.parrot else None
        }, '收入记录创建成功')
        
    except Exception as e:
        print(f"[ERROR] 创建收入记录异常: {str(e)}")
        print(f"[ERROR] 异常类型: {type(e).__name__}")
        import traceback
        print(f"[ERROR] 异常堆栈: {traceback.format_exc()}")
        db.session.rollback()
        return error_response(f'创建收入记录失败: {str(e)}')

@expenses_bp.route('/incomes/<int:income_id>', methods=['PUT'])
@login_required
def update_income(income_id):
    """更新收入记录"""
    try:
        from team_models import TeamMember

        user = request.current_user

        # 在团队模式下，检查用户是否为管理员
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()

            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能修改收入记录', 403)

        # 根据用户模式获取可访问的收入ID
        income_ids = get_accessible_income_ids_by_mode(user)

        # 检查收入是否可访问
        if income_id not in income_ids:
            return error_response('收入记录不存在', 404)

        income = Income.query.get(income_id)
        if not income:
            return error_response('收入记录不存在', 404)

        data = request.get_json()

        # 验证金额
        if 'amount' in data:
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return error_response('金额必须大于0')
                income.amount = amount
            except (ValueError, TypeError):
                return error_response('金额格式不正确')

        # 验证鹦鹉ID（可选）
        if 'parrot_id' in data:
            parrot_id = data['parrot_id']
            if parrot_id:
                # 检查鹦鹉是否可访问
                parrot_ids = get_accessible_parrot_ids_by_mode(user)
                if parrot_id not in parrot_ids:
                    return error_response('鹦鹉不存在')
            income.parrot_id = parrot_id

        # 验证类别
        if 'category' in data:
            allowed_categories = ['breeding_sale', 'bird_sale', 'service', 'competition', 'other']
            if data['category'] not in allowed_categories:
                return error_response(f'不支持的收入类别: {data.get("category")}')
            income.category = data['category']

        if 'description' in data:
            income.description = data['description']

        if 'income_date' in data:
            try:
                income.income_date = datetime.strptime(data['income_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('日期格式不正确')

        db.session.commit()

        return success_response({
            'id': income.id,
            'category': income.category,
            'amount': float(income.amount),
            'description': income.description,
            'income_date': income.income_date.strftime('%Y-%m-%d'),
            'created_at': income.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'parrot_name': income.parrot.name if income.parrot else None
        }, '收入记录更新成功')

    except Exception as e:
        db.session.rollback()
        return error_response(f'更新收入记录失败: {str(e)}')

@expenses_bp.route('/incomes/<int:income_id>', methods=['DELETE'])
@login_required
def delete_income(income_id):
    """删除收入记录"""
    try:
        from team_models import TeamMember
        
        user = request.current_user
        
        # 在团队模式下，检查用户是否为管理员
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin']:
                return error_response('只有团队管理员才能删除收入记录', 403)
        
        # 根据用户模式获取可访问的收入ID
        income_ids = get_accessible_income_ids_by_mode(user)
        
        # 检查收入是否可访问
        if income_id not in income_ids:
            return error_response('收入记录不存在', 404)
        
        income = Income.query.get(income_id)
        if not income:
            return error_response('收入记录不存在', 404)
        
        db.session.delete(income)
        db.session.commit()
        
        return success_response(None, '收入记录删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除收入记录失败: {str(e)}')

@expenses_bp.route('/incomes/categories', methods=['GET'])
@login_required
def get_income_categories():
    """获取收入类别列表"""
    categories = [
        {'value': 'breeding_sale', 'label': '繁殖销售'},
        {'value': 'bird_sale', 'label': '鸟类销售'},
        {'value': 'service', 'label': '服务收入'},
        {'value': 'competition', 'label': '比赛奖金'},
        {'value': 'other', 'label': '其他'}
    ]
    return success_response(categories)
