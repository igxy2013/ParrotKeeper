import xlwt
import io
from flask import Blueprint, request, Response, send_file, jsonify
from models import (
    db, Parrot, Expense, Income, FeedingRecord, HealthRecord, 
    CleaningRecord, BreedingRecord, FeedType, ParrotSpecies
)
from utils import login_required, error_response
from sqlalchemy import or_
from team_mode_utils import (
    get_accessible_parrot_ids_by_mode,
    get_accessible_expense_ids_by_mode,
    get_accessible_income_ids_by_mode,
    get_accessible_breeding_record_ids_by_mode
)

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

def generate_excel(header, rows, sheet_name='Sheet1', col_widths=None):
    """Generate Excel (xls) response using xlwt"""
    wb = xlwt.Workbook(encoding='utf-8')
    ws = wb.add_sheet(sheet_name)
    
    # Set Column Widths
    if col_widths:
        for col_idx, width in col_widths.items():
            ws.col(col_idx).width = width

    # Write Header
    style_header = xlwt.easyxf('font: bold on; align: horiz center')
    for col_idx, h in enumerate(header):
        ws.write(0, col_idx, h, style_header)
        
    # Write Rows
    style_date = xlwt.easyxf(num_format_str='YYYY-MM-DD')
    style_datetime = xlwt.easyxf(num_format_str='YYYY-MM-DD HH:MM:SS')
    
    for row_idx, row in enumerate(rows, start=1):
        for col_idx, cell in enumerate(row):
            # Simple type handling
            if hasattr(cell, 'strftime'): # Date/Datetime
                # Check if it's date or datetime
                if hasattr(cell, 'hour'):
                    ws.write(row_idx, col_idx, cell, style_datetime)
                else:
                    ws.write(row_idx, col_idx, cell, style_date)
            else:
                ws.write(row_idx, col_idx, cell)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output

def _get_parrots_data(user, filters=None):
    accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
    if not accessible_parrot_ids:
        return (
            ['名称', '品种', '性别', '环号', '出生日期', '入住日期', '颜色', '体重(g)', '健康状态', '备注'],
            [],
            {1: 256 * 20, 2: 256 * 8, 3: 256 * 20, 4: 256 * 15, 5: 256 * 15}
        )
    query = Parrot.query.filter(Parrot.id.in_(accessible_parrot_ids), Parrot.is_active.is_(True))

    if filters:
        if filters.get('start_date'):
            query = query.filter(Parrot.acquisition_date >= filters['start_date'])
        if filters.get('end_date'):
            query = query.filter(Parrot.acquisition_date <= filters['end_date'])
        if filters.get('keyword'):
            k = f"%{filters['keyword']}%"
            query = query.outerjoin(ParrotSpecies).filter(or_(
                Parrot.name.ilike(k),
                Parrot.ring_number.ilike(k),
                Parrot.notes.ilike(k),
                ParrotSpecies.name.ilike(k)
            ))
        if filters.get('species_id'):
            try:
                sid = int(filters['species_id'])
                query = query.filter(Parrot.species_id == sid)
            except Exception:
                pass
        if filters.get('gender'):
            query = query.filter(Parrot.gender == filters['gender'])
        if filters.get('health_status'):
            query = query.filter(Parrot.health_status == filters['health_status'])

    parrots = query.order_by(Parrot.created_at.desc()).all()

    header = ['名称', '品种', '性别', '环号', '出生日期', '入住日期', '颜色', '体重(g)', '健康状态', '备注']
    
    # Index: 0:Name, 1:Species, 2:Gender, 3:Ring, 4:Birth, 5:Acquisition, 6:Color, 7:Weight, 8:Health, 9:Notes
    col_widths = {
        1: 256 * 20,
        2: 256 * 8,
        3: 256 * 20,
        4: 256 * 15,
        5: 256 * 15
    }

    rows = []
    for p in parrots:
        species_name = p.species.name if p.species else ''
        gender_map = {'male': '公', 'female': '母', 'unknown': '未知'}
        health_map = {'healthy': '健康', 'sick': '生病', 'recovering': '恢复中', 'observation': '观察中'}
        
        rows.append([
            p.name,
            species_name,
            gender_map.get(p.gender, p.gender),
            p.ring_number or '',
            p.birth_date,
            p.acquisition_date,
            p.color or '',
            p.weight or '',
            health_map.get(p.health_status, p.health_status),
            p.notes or ''
        ])
    return header, rows, col_widths

def _get_expenses_data(user, filters=None):
    expense_ids = get_accessible_expense_ids_by_mode(user)
    income_ids = get_accessible_income_ids_by_mode(user)
    expenses = []
    incomes = []
    
    if expense_ids:
        q = Expense.query.filter(Expense.id.in_(expense_ids))
        if filters:
            if filters.get('start_date'):
                q = q.filter(Expense.expense_date >= filters['start_date'])
            if filters.get('end_date'):
                q = q.filter(Expense.expense_date <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                q = q.filter(or_(Expense.description.ilike(k), Expense.category.ilike(k)))
            if filters.get('category'):
                q = q.filter(Expense.category == filters['category'])
        expenses = q.order_by(Expense.expense_date.desc()).all()
        
    if income_ids:
        q = Income.query.filter(Income.id.in_(income_ids))
        if filters:
            if filters.get('start_date'):
                q = q.filter(Income.income_date >= filters['start_date'])
            if filters.get('end_date'):
                q = q.filter(Income.income_date <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                q = q.filter(or_(Income.description.ilike(k), Income.category.ilike(k)))
            if filters.get('category'):
                q = q.filter(Income.category == filters['category'])
        incomes = q.order_by(Income.income_date.desc()).all()
    
    header = ['类型', '日期', '类别', '金额', '描述']
    
    col_widths = {
        1: 256 * 15,
        4: 256 * 40
    }
    
    category_map = {
        'food': '食物', 'toys': '玩具', 'medical': '医疗', 
        'cage': '笼舍', 'supplies': '用品', 'other': '其他',
        'sales': '销售', 'breeding': '繁殖', 'salary': '工资',
        'bonus': '奖金', 'investment': '投资',
        'baby_bird': '幼鸟', 'breeding_bird': '种鸟',
        'breeding_sale': '繁殖销售', 'bird_sale': '鸟类销售',
        'service': '服务收入', 'competition': '比赛奖金'
    }

    combined = []
    for e in expenses:
        cat_name = category_map.get(e.category, e.category) if e.category else ''
        combined.append({
            'type': '支出',
            'date': e.expense_date,
            'category': cat_name,
            'amount': e.amount,
            'desc': e.description,
            'created_at': e.created_at
        })
        
    for i in incomes:
        cat_name = category_map.get(i.category, i.category) if i.category else ''
        combined.append({
            'type': '收入',
            'date': i.income_date,
            'category': cat_name,
            'amount': i.amount,
            'desc': i.description,
            'created_at': i.created_at
        })
        
    # 流向过滤（支出/收入）
    if filters and filters.get('flow') in ['expense', 'income']:
        flow = filters['flow']
        combined = [x for x in combined if x['type'] == ('支出' if flow == 'expense' else '收入')]

    # Sort by date desc
    combined.sort(key=lambda x: x['date'] or x['created_at'].date(), reverse=True)
    
    rows = []
    for item in combined:
        rows.append([
            item['type'],
            item['date'],
            item['category'],
            item['amount'],
            item['desc'] or ''
        ])
    return header, rows, col_widths

def _get_feeding_data(user, filters=None):
    parrot_ids = get_accessible_parrot_ids_by_mode(user)
    records = []
    if parrot_ids:
        query = (
            db.session.query(FeedingRecord)
            .join(Parrot)
            .outerjoin(FeedType)
            .filter(
                FeedingRecord.parrot_id.in_(parrot_ids),
                Parrot.is_active.is_(True)
            )
        )
        if filters:
            if filters.get('start_date'):
                query = query.filter(FeedingRecord.feeding_time >= filters['start_date'])
            if filters.get('end_date'):
                query = query.filter(FeedingRecord.feeding_time <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                query = query.filter(or_(
                    Parrot.name.ilike(k),
                    FeedType.name.ilike(k),
                    FeedingRecord.notes.ilike(k)
                ))
            if filters.get('parrot_id'):
                try:
                    pid = int(filters['parrot_id'])
                    query = query.filter(FeedingRecord.parrot_id == pid)
                except Exception:
                    pass
            if filters.get('feed_type_id'):
                try:
                    fid = int(filters['feed_type_id'])
                    query = query.filter(FeedingRecord.feed_type_id == fid)
                except Exception:
                    pass
        records = query.order_by(FeedingRecord.feeding_time.desc()).all()
    
    header = ['鹦鹉', '食物类型', '数量', '单位', '记录时间', '备注', '记录人']
    
    # Define column widths
    # Index: 0:Parrot, 1:FoodType, 2:Amount, 3:Unit, 4:Time, 5:Notes, 6:Creator
    col_widths = {
        0: 256 * 15, # Parrot
        4: 256 * 22, # Time (Widened as requested)
        5: 256 * 30  # Notes
    }
    
    rows = []
    
    for r in records:
        feed_name = r.feed_type.name if r.feed_type else '未知'
        unit = r.feed_type.unit if r.feed_type else ''
        creator = r.created_by.nickname if r.created_by else ''
        
        rows.append([
            r.parrot.name if r.parrot else '',
            feed_name,
            r.amount,
            unit,
            r.feeding_time,
            r.notes or '',
            creator
        ])
    return header, rows, col_widths

def _get_health_data(user, filters=None):
    parrot_ids = get_accessible_parrot_ids_by_mode(user)
    records = []
    if parrot_ids:
        query = (
            db.session.query(HealthRecord)
            .join(Parrot)
            .filter(
                HealthRecord.parrot_id.in_(parrot_ids),
                Parrot.is_active.is_(True)
            )
        )
        if filters:
            if filters.get('start_date'):
                query = query.filter(HealthRecord.record_date >= filters['start_date'])
            if filters.get('end_date'):
                query = query.filter(HealthRecord.record_date <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                query = query.filter(or_(
                    Parrot.name.ilike(k),
                    HealthRecord.notes.ilike(k),
                    HealthRecord.record_type.ilike(k),
                    HealthRecord.health_status.ilike(k)
                ))
            if filters.get('parrot_id'):
                try:
                    pid = int(filters['parrot_id'])
                    query = query.filter(HealthRecord.parrot_id == pid)
                except Exception:
                    pass
            if filters.get('record_type'):
                query = query.filter(HealthRecord.record_type == filters['record_type'])
            if filters.get('health_status'):
                query = query.filter(HealthRecord.health_status == filters['health_status'])
        records = query.order_by(HealthRecord.record_date.desc()).all()
    
    header = ['鹦鹉', '记录类型', '健康状态', '体重(g)', '记录时间', '记录人']
    
    # Define column widths
    # Index: 4:Time
    col_widths = {
        4: 256 * 22  # Record Time
    }
    
    rows = []
    
    type_map = {
        'checkup': '常规检查', 'illness': '生病', 'treatment': '治疗', 
        'vaccination': '疫苗', 'weight': '称重'
    }
    status_map = {'healthy': '健康', 'sick': '生病', 'recovering': '恢复中', 'observation': '观察中'}
    
    for r in records:
        rows.append([
            r.parrot.name if r.parrot else '',
            type_map.get(r.record_type, r.record_type),
            status_map.get(r.health_status, r.health_status),
            r.weight or '',
            r.record_date,
            r.created_by.nickname if r.created_by else ''
        ])
    return header, rows, col_widths

def _get_cleaning_data(user, filters=None):
    parrot_ids = get_accessible_parrot_ids_by_mode(user)
    records = []
    if parrot_ids:
        query = (
            db.session.query(CleaningRecord)
            .join(Parrot)
            .filter(
                CleaningRecord.parrot_id.in_(parrot_ids),
                Parrot.is_active.is_(True)
            )
        )
        if filters:
            if filters.get('start_date'):
                query = query.filter(CleaningRecord.cleaning_time >= filters['start_date'])
            if filters.get('end_date'):
                query = query.filter(CleaningRecord.cleaning_time <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                query = query.filter(or_(
                    Parrot.name.ilike(k),
                    CleaningRecord.cleaning_type.ilike(k),
                    CleaningRecord.description.ilike(k),
                    CleaningRecord.notes.ilike(k)
                ))
            if filters.get('parrot_id'):
                try:
                    pid = int(filters['parrot_id'])
                    query = query.filter(CleaningRecord.parrot_id == pid)
                except Exception:
                    pass
            if filters.get('cleaning_type'):
                query = query.filter(CleaningRecord.cleaning_type == filters['cleaning_type'])
        records = query.order_by(CleaningRecord.cleaning_time.desc()).all()
    
    header = ['鹦鹉', '清洁类型', '描述', '记录时间', '备注', '记录人']
    
    # Define column widths
    # Index: 3:Time
    col_widths = {
        3: 256 * 22  # Record Time
    }
    
    rows = []
    
    type_map = {
        'cage': '笼舍', 'toys': '玩具', 'perches': '站架', 'food_water': '食具水具', 
        'disinfection': '环境消毒', 'water_change': '换水', 
        'water_bowl_clean': '清洗水碗', 'bath': '洗澡'
    }
    
    for r in records:
        rows.append([
            r.parrot.name if r.parrot else '',
            type_map.get(r.cleaning_type, r.cleaning_type),
            r.description or '',
            r.cleaning_time,
            r.notes or '',
            r.created_by.nickname if r.created_by else ''
        ])
    return header, rows, col_widths

def _get_breeding_data(user, filters=None):
    record_ids = get_accessible_breeding_record_ids_by_mode(user)
    records = []
    if record_ids:
        # Use aliased joins for male and female parrots to search by name
        from sqlalchemy.orm import aliased
        MaleParrot = aliased(Parrot)
        FemaleParrot = aliased(Parrot)
        
        query = (
            BreedingRecord.query
            .outerjoin(MaleParrot, BreedingRecord.male_parrot_id == MaleParrot.id)
            .outerjoin(FemaleParrot, BreedingRecord.female_parrot_id == FemaleParrot.id)
            .filter(BreedingRecord.id.in_(record_ids))
        )
        
        if filters:
            if filters.get('start_date'):
                query = query.filter(BreedingRecord.mating_date >= filters['start_date'])
            if filters.get('end_date'):
                query = query.filter(BreedingRecord.mating_date <= filters['end_date'])
            if filters.get('keyword'):
                k = f"%{filters['keyword']}%"
                query = query.filter(or_(
                    MaleParrot.name.ilike(k),
                    FemaleParrot.name.ilike(k),
                    BreedingRecord.notes.ilike(k)
                ))
            if filters.get('male_parrot_id'):
                try:
                    mid = int(filters['male_parrot_id'])
                    query = query.filter(BreedingRecord.male_parrot_id == mid)
                except Exception:
                    pass
            if filters.get('female_parrot_id'):
                try:
                    fid = int(filters['female_parrot_id'])
                    query = query.filter(BreedingRecord.female_parrot_id == fid)
                except Exception:
                    pass
        
        records = query.order_by(BreedingRecord.created_at.desc()).all()
    
    header = ['种公', '种母', '配对日期', '产蛋日期', '产蛋数', '孵化日期', '出壳数', '成功率', '备注']
    
    # Define column widths
    # Index: 2:Mating, 3:EggLaying, 5:Hatching
    col_widths = {
        2: 256 * 18,
        3: 256 * 18,
        5: 256 * 18
    }
    
    rows = []
    
    for r in records:
        rows.append([
            r.male_parrot.name if r.male_parrot else '',
            r.female_parrot.name if r.female_parrot else '',
            r.mating_date,
            r.egg_laying_date,
            r.egg_count,
            r.hatching_date,
            r.chick_count,
            f"{r.success_rate}%" if r.success_rate is not None else '',
            r.notes or ''
        ])
    return header, rows, col_widths

def _serialize_for_json(rows):
    """Convert date/datetime objects to strings for JSON response"""
    json_rows = []
    for row in rows:
        json_row = []
        for cell in row:
            if hasattr(cell, 'isoformat'):
                json_row.append(cell.isoformat())
            else:
                json_row.append(cell)
        json_rows.append(json_row)
    return json_rows

def _get_filters_from_request():
    filters = {
        'keyword': request.args.get('keyword', '').strip() or None,
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        # type-specific
        'species_id': request.args.get('species_id'),
        'gender': request.args.get('gender'),
        'health_status': request.args.get('health_status'),
        'flow': request.args.get('flow'),
        'category': request.args.get('category'),
        'parrot_id': request.args.get('parrot_id'),
        'feed_type_id': request.args.get('feed_type_id'),
        'record_type': request.args.get('record_type'),
        'cleaning_type': request.args.get('cleaning_type'),
        'male_parrot_id': request.args.get('male_parrot_id'),
        'female_parrot_id': request.args.get('female_parrot_id'),
    }
    if filters['end_date'] and len(filters['end_date']) == 10:
         filters['end_date'] += ' 23:59:59'
    return filters

@reports_bp.route('/data/<report_type>', methods=['GET'])
@login_required
def get_report_data(report_type):
    """Get report data in JSON format for preview"""
    try:
        user = request.current_user
        filters = _get_filters_from_request()
        
        header = []
        rows = []
        col_widths = None
        
        if report_type == 'parrots':
            header, rows, col_widths = _get_parrots_data(user, filters)
        elif report_type == 'expenses':
            header, rows, col_widths = _get_expenses_data(user, filters)
        elif report_type == 'feeding':
            header, rows, col_widths = _get_feeding_data(user, filters)
        elif report_type == 'health':
            header, rows, col_widths = _get_health_data(user, filters)
        elif report_type == 'cleaning':
            header, rows, col_widths = _get_cleaning_data(user, filters)
        elif report_type == 'breeding':
            header, rows, col_widths = _get_breeding_data(user, filters)
        else:
            return error_response('未知的报表类型')
            
        return jsonify({
            'header': header, 
            'rows': _serialize_for_json(rows)
        })
    except Exception as e:
        return error_response(f'获取数据失败: {str(e)}')

@reports_bp.route('/export/parrots', methods=['GET'])
@login_required
def export_parrots():
    """Export parrots data"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_parrots_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '鹦鹉档案', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='parrots.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')

@reports_bp.route('/export/expenses', methods=['GET'])
@login_required
def export_expenses():
    """Export expenses and incomes"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_expenses_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '收支记录', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='expenses.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')

@reports_bp.route('/export/feeding', methods=['GET'])
@login_required
def export_feeding():
    """Export feeding records"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_feeding_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '喂食记录', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='feeding.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')

@reports_bp.route('/export/health', methods=['GET'])
@login_required
def export_health():
    """Export health records"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_health_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '健康记录', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='health.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')

@reports_bp.route('/export/cleaning', methods=['GET'])
@login_required
def export_cleaning():
    """Export cleaning records"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_cleaning_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '清洁记录', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='cleaning.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')

@reports_bp.route('/export/breeding', methods=['GET'])
@login_required
def export_breeding():
    """Export breeding records"""
    try:
        filters = _get_filters_from_request()
        header, rows, col_widths = _get_breeding_data(request.current_user, filters)
        excel_file = generate_excel(header, rows, '繁殖记录', col_widths)
        return send_file(
            excel_file,
            mimetype='application/vnd.ms-excel',
            as_attachment=True,
            download_name='breeding.xls'
        )
    except Exception as e:
        return error_response(f'导出失败: {str(e)}')
