from flask import Blueprint, request, jsonify
from models import db, Expense, Income, Parrot
from utils import login_required, success_response, error_response, add_user_points
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
        
        # 构建查询
        query = Expense.query.filter(Expense.id.in_(expense_ids))
        
        # 类别筛选
        if category:
            query = query.filter(Expense.category == category)
            
        # 鹦鹉筛选
        if parrot_id:
            query = query.filter(Expense.parrot_id == parrot_id)
            
        # 日期筛选
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Expense.expense_date >= start_dt.date())
            except ValueError:
                pass
                
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(Expense.expense_date <= end_dt.date())
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(Expense.created_at.desc())
        total = query.count()
        expenses = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # 获取相关鹦鹉信息
        parrot_ids = [e.parrot_id for e in expenses if e.parrot_id]
        parrots = {p.id: p for p in Parrot.query.filter(Parrot.id.in_(parrot_ids)).all()} if parrot_ids else {}
        
        items = []
        category_map = {
            'food': '食物',
            'medical': '医疗', 
            'toys': '玩具',
            'cage': '笼具',
            'baby_bird': '幼鸟',
            'breeding_bird': '种鸟',
            'other': '其他'
        }
        
        for expense in expenses:
            parrot = parrots.get(expense.parrot_id) if expense.parrot_id else None
            items.append({
                'id': expense.id,
                'category': expense.category,
                'category_text': category_map.get(expense.category, expense.category),
                'amount': float(expense.amount),
                'description': expense.description,
                'expense_date': expense.expense_date.strftime('%Y-%m-%d'),
                'created_at': expense.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'parrot_id': expense.parrot_id,
                'parrot_name': parrot.name if parrot else None
            })
        
        return success_response({
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page
        })
        
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
        
        # 增加支出记录积分（每日首次添加支出记录获得1积分）
        add_user_points(user.id, 1, 'expense')
        
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

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@login_required
def update_expense(expense_id):
    """更新支出记录"""
    try:
        user = request.current_user
        expense = Expense.query.get(expense_id)
        
        if not expense:
            return error_response('支出记录不存在', 404)
            
        # 检查权限
        if expense.user_id != user.id:
            return error_response('无权限修改此记录', 403)
        
        data = request.get_json()
        
        # 更新字段
        if 'category' in data:
            allowed_categories = ['food', 'medical', 'toys', 'cage', 'baby_bird', 'breeding_bird', 'other']
            if data['category'] not in allowed_categories:
                return error_response(f'不支持的支出类别: {data["category"]}')
            expense.category = data['category']
            
        if 'amount' in data:
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return error_response('金额必须大于0')
                expense.amount = amount
            except (ValueError, TypeError):
                return error_response('金额格式不正确')
                
        if 'description' in data:
            expense.description = data['description']
            
        if 'expense_date' in data:
            try:
                expense_date = datetime.strptime(data['expense_date'], '%Y-%m-%d').date()
                expense.expense_date = expense_date
            except ValueError:
                return error_response('日期格式不正确')
                
        if 'parrot_id' in data:
            if data['parrot_id']:
                parrot = Parrot.query.filter_by(id=data['parrot_id'], user_id=user.id, is_active=True).first()
                if not parrot:
                    return error_response('鹦鹉不存在')
                expense.parrot_id = data['parrot_id']
            else:
                expense.parrot_id = None
        
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
        expense = Expense.query.get(expense_id)
        
        if not expense:
            return error_response('支出记录不存在', 404)
            
        # 检查权限
        if expense.user_id != user.id:
            return error_response('无权限删除此记录', 403)
        
        db.session.delete(expense)
        db.session.commit()
        
        return success_response(None, '支出记录删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除支出记录失败: {str(e)}')

@expenses_bp.route('/incomes', methods=['GET'])
@login_required
def get_incomes():
    """获取收入列表"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category', '')
        parrot_id = request.args.get('parrot_id', type=int)
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # 根据用户模式获取可访问的收入ID
        income_ids = get_accessible_income_ids_by_mode(user)
        
        # 构建查询
        query = Income.query.filter(Income.id.in_(income_ids))
        
        # 类别筛选
        if category:
            query = query.filter(Income.category == category)
            
        # 鹦鹉筛选
        if parrot_id:
            query = query.filter(Income.parrot_id == parrot_id)
            
        # 日期筛选
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.filter(Income.income_date >= start_dt.date())
            except ValueError:
                pass
                
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                query = query.filter(Income.income_date <= end_dt.date())
            except ValueError:
                pass
        
        # 排序和分页
        query = query.order_by(Income.created_at.desc())
        total = query.count()
        incomes = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # 获取相关鹦鹉信息
        parrot_ids = [i.parrot_id for i in incomes if i.parrot_id]
        parrots = {p.id: p for p in Parrot.query.filter(Parrot.id.in_(parrot_ids)).all()} if parrot_ids else {}
        
        items = []
        category_map = {
            'breeding_sale': '繁殖销售',
            'bird_sale': '鸟类销售',
            'service': '服务收入',
            'competition': '比赛奖金',
            'other': '其他收入'
        }
        
        for income in incomes:
            parrot = parrots.get(income.parrot_id) if income.parrot_id else None
            items.append({
                'id': income.id,
                'category': income.category,
                'category_text': category_map.get(income.category, income.category),
                'amount': float(income.amount),
                'description': income.description,
                'income_date': income.income_date.strftime('%Y-%m-%d'),
                'created_at': income.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'parrot_id': income.parrot_id,
                'parrot_name': parrot.name if parrot else None
            })
        
        return success_response({
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page
        })
        
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
        
        # 增加收入记录积分（每日首次添加收入记录获得1积分）
        add_user_points(user.id, 1, 'expense')
        
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
        user = request.current_user
        income = Income.query.get(income_id)
        
        if not income:
            return error_response('收入记录不存在', 404)
            
        # 检查权限
        if income.user_id != user.id:
            return error_response('无权限修改此记录', 403)
        
        data = request.get_json()
        
        # 更新字段
        if 'category' in data:
            allowed_categories = ['breeding_sale', 'bird_sale', 'service', 'competition', 'other']
            if data['category'] not in allowed_categories:
                return error_response(f'不支持的收入类别: {data["category"]}')
            income.category = data['category']
            
        if 'amount' in data:
            try:
                amount = float(data['amount'])
                if amount <= 0:
                    return error_response('金额必须大于0')
                income.amount = amount
            except (ValueError, TypeError):
                return error_response('金额格式不正确')
                
        if 'description' in data:
            income.description = data['description']
            
        if 'income_date' in data:
            try:
                income_date = datetime.strptime(data['income_date'], '%Y-%m-%d').date()
                income.income_date = income_date
            except ValueError:
                return error_response('日期格式不正确')
                
        if 'parrot_id' in data:
            if data['parrot_id']:
                parrot = Parrot.query.filter_by(id=data['parrot_id'], user_id=user.id, is_active=True).first()
                if not parrot:
                    return error_response('鹦鹉不存在')
                income.parrot_id = data['parrot_id']
            else:
                income.parrot_id = None
        
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
        user = request.current_user
        income = Income.query.get(income_id)
        
        if not income:
            return error_response('收入记录不存在', 404)
            
        # 检查权限
        if income.user_id != user.id:
            return error_response('无权限删除此记录', 403)
        
        db.session.delete(income)
        db.session.commit()
        
        return success_response(None, '收入记录删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除收入记录失败: {str(e)}')