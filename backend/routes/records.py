from flask import Blueprint, request, jsonify
from models import db, Parrot, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, FeedType
from schemas import (feeding_record_schema, feeding_records_schema, 
                    health_record_schema, health_records_schema,
                    cleaning_record_schema, cleaning_records_schema,
                    breeding_record_schema, breeding_records_schema,
                    feed_types_schema)
from utils import login_required, success_response, error_response, paginate_query
from team_mode_utils import (get_accessible_parrot_ids_by_mode, filter_records_by_mode, 
                            get_accessible_feeding_record_ids_by_mode, get_accessible_health_record_ids_by_mode,
                            get_accessible_cleaning_record_ids_by_mode, get_accessible_breeding_record_ids_by_mode)
from datetime import datetime, date

records_bp = Blueprint('records', __name__, url_prefix='/api/records')

# 通用记录获取接口
@records_bp.route('/<int:record_id>', methods=['GET'])
@login_required
def get_record(record_id):
    """通过ID获取单个记录"""
    try:
        user = request.current_user
        
        # 获取可访问的记录ID列表
        accessible_feeding_ids = get_accessible_feeding_record_ids_by_mode(user)
        accessible_health_ids = get_accessible_health_record_ids_by_mode(user)
        accessible_cleaning_ids = get_accessible_cleaning_record_ids_by_mode(user)
        accessible_breeding_ids = get_accessible_breeding_record_ids_by_mode(user)
        
        # 查找喂食记录
        if record_id in accessible_feeding_ids:
            feeding_record = FeedingRecord.query.get(record_id)
            if feeding_record:
                result = feeding_record_schema.dump(feeding_record)
                result['type'] = 'feeding'
                result['record_time'] = feeding_record.feeding_time.isoformat() if feeding_record.feeding_time else None
                return success_response(result)
        
        # 查找健康记录
        if record_id in accessible_health_ids:
            health_record = HealthRecord.query.get(record_id)
            if health_record:
                result = health_record_schema.dump(health_record)
                result['type'] = 'health'
                result['record_time'] = health_record.record_date.isoformat() if health_record.record_date else None
                return success_response(result)
        
        # 查找清洁记录
        if record_id in accessible_cleaning_ids:
            cleaning_record = CleaningRecord.query.get(record_id)
            if cleaning_record:
                result = cleaning_record_schema.dump(cleaning_record)
                result['type'] = 'cleaning'
                result['record_time'] = cleaning_record.cleaning_time.isoformat() if cleaning_record.cleaning_time else None
                return success_response(result)
        
        # 查找繁殖记录
        if record_id in accessible_breeding_ids:
            breeding_record = BreedingRecord.query.get(record_id)
            if breeding_record:
                result = breeding_record_schema.dump(breeding_record)
                result['type'] = 'breeding'
                result['record_time'] = breeding_record.mating_date.isoformat() if breeding_record.mating_date else None
                return success_response(result)
        
        return error_response('记录不存在', 404)
        
    except Exception as e:
        return error_response(f'获取记录失败: {str(e)}')

# 通用记录更新接口
@records_bp.route('/<int:record_id>', methods=['PUT'])
@login_required
def update_record(record_id):
    """通用记录更新接口"""
    try:
        user = request.current_user
        data = request.get_json()
        if not data:
            return error_response('请求数据不能为空')
        
        record_type = data.get('type')
        if not record_type:
            return error_response('记录类型不能为空')
        
        # 根据记录类型调用相应的更新方法
        if record_type == 'feeding':
            return update_feeding_record_internal(record_id, data)
        elif record_type == 'health':
            return update_health_record_internal(record_id, data)
        elif record_type == 'cleaning':
            return update_cleaning_record_internal(record_id, data)
        elif record_type == 'breeding':
            return update_breeding_record_internal(record_id, data)
        else:
            return error_response('不支持的记录类型')
            
    except Exception as e:
        return error_response(f'更新记录失败: {str(e)}')

# 通用记录添加接口
@records_bp.route('', methods=['POST'])
@login_required
def add_record():
    """通用记录添加接口"""
    try:
        data = request.get_json()
        if not data:
            return error_response('请求数据不能为空')
        
        record_type = data.get('type')
        if not record_type:
            return error_response('记录类型不能为空')
        
        # 根据记录类型调用相应的添加方法
        if record_type == 'feeding':
            return add_feeding_record_internal(data)
        elif record_type == 'health':
            return add_health_record_internal(data)
        elif record_type == 'cleaning':
            return add_cleaning_record_internal(data)
        elif record_type == 'breeding':
            return add_breeding_record_internal(data)
        else:
            return error_response('不支持的记录类型')
            
    except Exception as e:
        return error_response(f'添加记录失败: {str(e)}')

# 最近记录相关
@records_bp.route('/recent', methods=['GET'])
@login_required
def get_recent_records():
    """获取最近记录"""
    try:
        user = request.current_user
        limit = request.args.get('limit', 5, type=int)
        
        # 根据用户模式获取可访问的鹦鹉ID
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 获取最近的喂食记录
        recent_feeding = db.session.query(FeedingRecord).join(Parrot).filter(
            Parrot.id.in_(parrot_ids),
            Parrot.is_active == True
        ).order_by(FeedingRecord.feeding_time.desc()).limit(limit).all()
        
        # 获取最近的健康记录
        recent_health = db.session.query(HealthRecord).join(Parrot).filter(
            Parrot.id.in_(parrot_ids),
            Parrot.is_active == True
        ).order_by(HealthRecord.record_date.desc()).limit(limit).all()
        
        # 获取最近的清洁记录
        recent_cleaning = db.session.query(CleaningRecord).join(Parrot).filter(
            Parrot.id.in_(parrot_ids),
            Parrot.is_active == True
        ).order_by(CleaningRecord.cleaning_time.desc()).limit(limit).all()
        
        # 获取最近的繁殖记录
        recent_breeding = db.session.query(BreedingRecord).join(
            Parrot, BreedingRecord.male_parrot_id == Parrot.id
        ).filter(
            Parrot.id.in_(parrot_ids)
        ).order_by(BreedingRecord.created_at.desc()).limit(limit).all()
        
        result = {
            'feeding': feeding_records_schema.dump(recent_feeding),
            'health': health_records_schema.dump(recent_health),
            'cleaning': cleaning_records_schema.dump(recent_cleaning),
            'breeding': breeding_records_schema.dump(recent_breeding)
        }
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取最近记录失败: {str(e)}')

# 饲料类型相关
@records_bp.route('/feed-types', methods=['GET'])
def get_feed_types():
    """获取饲料类型列表"""
    try:
        feed_types = FeedType.query.all()
        return success_response(feed_types_schema.dump(feed_types))
    except Exception as e:
        return error_response(f'获取饲料类型失败: {str(e)}')

# 喂食记录相关
@records_bp.route('/feeding', methods=['GET'])
@login_required
def get_feeding_records():
    """获取喂食记录"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 获取可访问的鹦鹉ID列表（根据用户模式）
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 基础查询：只查询可访问鹦鹉的记录
        query = db.session.query(FeedingRecord).join(Parrot).filter(
            FeedingRecord.parrot_id.in_(parrot_ids),
            Parrot.is_active == True
        )
        
        # 鹦鹉过滤
        parrot_id = request.args.get('parrot_id', type=int)
        if parrot_id:
            query = query.filter(FeedingRecord.parrot_id == parrot_id)
        
        # 日期过滤
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(FeedingRecord.feeding_time) >= start_date)
            except ValueError:
                return error_response('开始日期格式错误')
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(FeedingRecord.feeding_time) <= end_date)
            except ValueError:
                return error_response('结束日期格式错误')
        
        # 排序
        query = query.order_by(FeedingRecord.feeding_time.desc())
        
        result = paginate_query(query, page, per_page)
        result['items'] = feeding_records_schema.dump(result['items'])
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取喂食记录失败: {str(e)}')

def update_feeding_record_internal(record_id, data):
    """内部喂食记录更新方法"""
    user = request.current_user
    
    # 检查记录是否可访问
    accessible_ids = get_accessible_feeding_record_ids_by_mode(user)
    if record_id not in accessible_ids:
        return error_response('记录不存在', 404)
    
    record = FeedingRecord.query.get(record_id)
    if not record:
        return error_response('记录不存在', 404)
    
    if 'feed_type_id' in data:
        record.feed_type_id = data['feed_type_id']
    if 'amount' in data:
        record.amount = data['amount']
    if 'feeding_time' in data:
        if data['feeding_time']:
            try:
                record.feeding_time = datetime.strptime(data['feeding_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('喂食时间格式错误')
    if 'notes' in data:
        record.notes = data['notes']
    
    db.session.commit()
    
    return success_response(feeding_record_schema.dump(record), '更新成功')

def update_health_record_internal(record_id, data):
    """内部健康记录更新方法"""
    user = request.current_user
    
    # 检查记录是否可访问
    accessible_ids = get_accessible_health_record_ids_by_mode(user)
    if record_id not in accessible_ids:
        return error_response('记录不存在', 404)
    
    record = HealthRecord.query.get(record_id)
    if not record:
        return error_response('记录不存在', 404)
    
    if 'record_type' in data:
        record.record_type = data['record_type']
    if 'description' in data:
        record.description = data['description']
    if 'weight' in data:
        record.weight = data['weight']
    if 'temperature' in data:
        record.temperature = data['temperature']
    if 'symptoms' in data:
        record.symptoms = data['symptoms']
    if 'treatment' in data:
        record.treatment = data['treatment']
    if 'medication' in data:
        record.medication = data['medication']
    if 'vet_name' in data:
        record.vet_name = data['vet_name']
    if 'cost' in data:
        record.cost = data['cost']
    if 'record_date' in data:
        if data['record_date']:
            try:
                record.record_date = datetime.strptime(data['record_date'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('记录时间格式错误')
    if 'next_checkup_date' in data:
        if data['next_checkup_date']:
            try:
                record.next_checkup_date = datetime.strptime(data['next_checkup_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('下次检查日期格式错误')
    if 'notes' in data:
        record.notes = data['notes']
    
    db.session.commit()
    
    return success_response(health_record_schema.dump(record), '更新成功')

def update_cleaning_record_internal(record_id, data):
    """内部清洁记录更新方法"""
    user = request.current_user
    
    # 检查记录是否可访问
    accessible_ids = get_accessible_cleaning_record_ids_by_mode(user)
    if record_id not in accessible_ids:
        return error_response('记录不存在', 404)
    
    record = CleaningRecord.query.get(record_id)
    if not record:
        return error_response('记录不存在', 404)
    
    if 'cleaning_type' in data:
        record.cleaning_type = data['cleaning_type']
    if 'description' in data:
        record.description = data['description']
    if 'cleaning_time' in data:
        if data['cleaning_time']:
            try:
                record.cleaning_time = datetime.strptime(data['cleaning_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('清洁时间格式错误')
    if 'notes' in data:
        record.notes = data['notes']
    
    db.session.commit()
    
    return success_response(cleaning_record_schema.dump(record), '更新成功')

def update_breeding_record_internal(record_id, data):
    """内部繁殖记录更新方法"""
    user = request.current_user
    
    # 检查记录是否可访问
    accessible_ids = get_accessible_breeding_record_ids_by_mode(user)
    if record_id not in accessible_ids:
        return error_response('记录不存在', 404)
    
    record = BreedingRecord.query.get(record_id)
    if not record:
        return error_response('记录不存在', 404)
    
    if 'male_parrot_id' in data:
        record.male_parrot_id = data['male_parrot_id']
    if 'female_parrot_id' in data:
        record.female_parrot_id = data['female_parrot_id']
    if 'mating_date' in data:
        if data['mating_date']:
            try:
                record.mating_date = datetime.strptime(data['mating_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('交配日期格式错误')
    if 'egg_laying_date' in data:
        if data['egg_laying_date']:
            try:
                record.egg_laying_date = datetime.strptime(data['egg_laying_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('产蛋日期格式错误')
    if 'egg_count' in data:
        record.egg_count = data['egg_count']
    if 'hatching_date' in data:
        if data['hatching_date']:
            try:
                record.hatching_date = datetime.strptime(data['hatching_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('孵化日期格式错误')
    if 'chick_count' in data:
        record.chick_count = data['chick_count']
    if 'success_rate' in data:
        record.success_rate = data['success_rate']
    if 'notes' in data:
        record.notes = data['notes']
    
    db.session.commit()
    
    return success_response(breeding_record_schema.dump(record), '更新成功')

def add_feeding_record_internal(data):
    """内部喂食记录添加方法"""
    user = request.current_user
    
    parrot_id = data.get('parrot_id')
    if not parrot_id:
        return error_response('请选择鹦鹉')
    
    # 验证鹦鹉是否属于当前用户
    parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
    if not parrot:
        return error_response('鹦鹉不存在')
    
    # 处理喂食时间
    feeding_time = datetime.utcnow()
    if data.get('feeding_time'):
        try:
            feeding_time = datetime.strptime(data['feeding_time'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return error_response('喂食时间格式错误')
    
    record = FeedingRecord(
        parrot_id=parrot_id,
        feed_type_id=data.get('feed_type_id'),
        amount=data.get('amount'),
        feeding_time=feeding_time,
        notes=data.get('notes'),
        created_by_user_id=user.id,  # 记录创建者
        team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
    )
    
    db.session.add(record)
    db.session.commit()
    
    return success_response(feeding_record_schema.dump(record), '添加成功')

@records_bp.route('/feeding', methods=['POST'])
@login_required
def create_feeding_record():
    """添加喂食记录"""
    try:
        data = request.get_json()
        return add_feeding_record_internal(data)
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加喂食记录失败: {str(e)}')

@records_bp.route('/feeding/<int:record_id>', methods=['PUT'])
@login_required
def update_feeding_record(record_id):
    """更新喂食记录"""
    try:
        user = request.current_user
        record = db.session.query(FeedingRecord).join(Parrot).filter(
            FeedingRecord.id == record_id,
            Parrot.user_id == user.id
        ).first()
        
        if not record:
            return error_response('记录不存在', 404)
        
        data = request.get_json()
        
        if 'feed_type_id' in data:
            record.feed_type_id = data['feed_type_id']
        if 'amount' in data:
            record.amount = data['amount']
        if 'feeding_time' in data:
            if data['feeding_time']:
                try:
                    record.feeding_time = datetime.strptime(data['feeding_time'], '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    return error_response('喂食时间格式错误')
        if 'notes' in data:
            record.notes = data['notes']
        
        db.session.commit()
        
        return success_response(feeding_record_schema.dump(record), '更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新喂食记录失败: {str(e)}')

@records_bp.route('/feeding/<int:record_id>', methods=['DELETE'])
@login_required
def delete_feeding_record(record_id):
    """删除喂食记录"""
    try:
        user = request.current_user
        
        # 检查记录是否可访问
        accessible_ids = get_accessible_feeding_record_ids_by_mode(user)
        if record_id not in accessible_ids:
            return error_response('记录不存在', 404)
        
        record = FeedingRecord.query.get(record_id)
        if not record:
            return error_response('记录不存在', 404)
        
        db.session.delete(record)
        db.session.commit()
        
        return success_response(message='删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除喂食记录失败: {str(e)}')

# 健康记录相关
@records_bp.route('/health', methods=['GET'])
@login_required
def get_health_records():
    """获取健康记录"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 获取可访问的鹦鹉ID列表（根据用户模式）
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        query = db.session.query(HealthRecord).join(Parrot).filter(
            HealthRecord.parrot_id.in_(parrot_ids),
            Parrot.is_active == True
        )
        
        # 鹦鹉过滤
        parrot_id = request.args.get('parrot_id', type=int)
        if parrot_id:
            query = query.filter(HealthRecord.parrot_id == parrot_id)
        
        # 记录类型过滤
        record_type = request.args.get('record_type')
        if record_type:
            query = query.filter(HealthRecord.record_type == record_type)
        
        # 日期过滤
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(HealthRecord.record_date) >= start_date)
            except ValueError:
                return error_response('开始日期格式错误')
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(HealthRecord.record_date) <= end_date)
            except ValueError:
                return error_response('结束日期格式错误')
        
        query = query.order_by(HealthRecord.record_date.desc())
        
        result = paginate_query(query, page, per_page)
        result['items'] = health_records_schema.dump(result['items'])
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取健康记录失败: {str(e)}')

def add_health_record_internal(data):
    """内部健康记录添加方法"""
    user = request.current_user
    
    parrot_id = data.get('parrot_id')
    if not parrot_id:
        return error_response('请选择鹦鹉')
    
    parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
    if not parrot:
        return error_response('鹦鹉不存在')
    
    # 处理记录时间
    record_date = datetime.utcnow()
    if data.get('record_date'):
        try:
            record_date = datetime.strptime(data['record_date'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return error_response('记录时间格式错误')
    
    # 处理下次检查日期
    next_checkup_date = None
    if data.get('next_checkup_date'):
        try:
            next_checkup_date = datetime.strptime(data['next_checkup_date'], '%Y-%m-%d').date()
        except ValueError:
            return error_response('下次检查日期格式错误')
    
    record = HealthRecord(
        parrot_id=parrot_id,
        record_type=data.get('record_type'),
        description=data.get('description'),
        weight=data.get('weight'),
        temperature=data.get('temperature'),
        symptoms=data.get('symptoms'),
        treatment=data.get('treatment'),
        medication=data.get('medication'),
        vet_name=data.get('vet_name'),
        cost=data.get('cost'),
        record_date=record_date,
        next_checkup_date=next_checkup_date,
        created_by_user_id=user.id,  # 记录创建者
        team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
    )
    
    db.session.add(record)
    db.session.commit()
    
    return success_response(health_record_schema.dump(record), '添加成功')

@records_bp.route('/health', methods=['POST'])
@login_required
def create_health_record():
    """添加健康记录"""
    try:
        data = request.get_json()
        return add_health_record_internal(data)
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加健康记录失败: {str(e)}')

@records_bp.route('/health/<int:record_id>', methods=['DELETE'])
@login_required
def delete_health_record(record_id):
    """删除健康记录"""
    try:
        user = request.current_user
        
        # 检查记录是否可访问
        accessible_ids = get_accessible_health_record_ids_by_mode(user)
        if record_id not in accessible_ids:
            return error_response('记录不存在', 404)
        
        record = HealthRecord.query.get(record_id)
        if not record:
            return error_response('记录不存在', 404)
        
        db.session.delete(record)
        db.session.commit()
        
        return success_response(message='删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除健康记录失败: {str(e)}')

# 清洁记录相关
@records_bp.route('/cleaning', methods=['GET'])
@login_required
def get_cleaning_records():
    """获取清洁记录"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # 获取可访问的鹦鹉ID列表（根据用户模式）
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        query = db.session.query(CleaningRecord).join(Parrot).filter(
            CleaningRecord.parrot_id.in_(parrot_ids),
            Parrot.is_active == True
        )
        
        # 鹦鹉过滤
        parrot_id = request.args.get('parrot_id', type=int)
        if parrot_id:
            query = query.filter(CleaningRecord.parrot_id == parrot_id)
        
        # 清洁类型过滤
        cleaning_type = request.args.get('cleaning_type')
        if cleaning_type:
            query = query.filter(CleaningRecord.cleaning_type == cleaning_type)
        
        # 日期过滤
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(CleaningRecord.cleaning_time) >= start_date)
            except ValueError:
                return error_response('开始日期格式错误')
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(CleaningRecord.cleaning_time) <= end_date)
            except ValueError:
                return error_response('结束日期格式错误')
        
        query = query.order_by(CleaningRecord.cleaning_time.desc())
        
        result = paginate_query(query, page, per_page)
        result['items'] = cleaning_records_schema.dump(result['items'])
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取清洁记录失败: {str(e)}')

def add_cleaning_record_internal(data):
    """内部清洁记录添加方法"""
    user = request.current_user
    
    parrot_id = data.get('parrot_id')
    if not parrot_id:
        return error_response('请选择鹦鹉')
    
    parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id, is_active=True).first()
    if not parrot:
        return error_response('鹦鹉不存在')
    
    # 处理清洁时间
    cleaning_time = datetime.utcnow()
    if data.get('cleaning_time'):
        try:
            cleaning_time = datetime.strptime(data['cleaning_time'], '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return error_response('清洁时间格式错误')
    
    record = CleaningRecord(
        parrot_id=parrot_id,
        cleaning_type=data.get('cleaning_type'),
        description=data.get('description'),
        cleaning_time=cleaning_time,
        notes=data.get('notes'),
        created_by_user_id=user.id,  # 记录创建者
        team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
    )
    
    db.session.add(record)
    db.session.commit()
    
    return success_response(cleaning_record_schema.dump(record), '添加成功')

@records_bp.route('/cleaning', methods=['POST'])
@login_required
def create_cleaning_record():
    """添加清洁记录"""
    try:
        data = request.get_json()
        return add_cleaning_record_internal(data)
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加清洁记录失败: {str(e)}')

@records_bp.route('/cleaning/<int:record_id>', methods=['DELETE'])
@login_required
def delete_cleaning_record(record_id):
    """删除清洁记录"""
    try:
        user = request.current_user
        
        # 检查记录是否可访问
        accessible_ids = get_accessible_cleaning_record_ids_by_mode(user)
        if record_id not in accessible_ids:
            return error_response('记录不存在', 404)
        
        record = CleaningRecord.query.get(record_id)
        if not record:
            return error_response('记录不存在', 404)
        
        db.session.delete(record)
        db.session.commit()
        
        return success_response(message='删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除清洁记录失败: {str(e)}')

# 繁殖记录相关接口
@records_bp.route('/breeding', methods=['GET'])
@login_required
def get_breeding_records():
    """获取繁殖记录列表"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('limit', 20, type=int)
        
        # 获取可访问的鹦鹉ID列表（根据用户模式）
        parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        # 筛选参数
        male_parrot_id = request.args.get('male_parrot_id', type=int)
        female_parrot_id = request.args.get('female_parrot_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # 构建查询，使用options预加载关联数据
        from sqlalchemy.orm import joinedload
        query = db.session.query(BreedingRecord).options(
            joinedload(BreedingRecord.male_parrot),
            joinedload(BreedingRecord.female_parrot)
        ).filter(
            BreedingRecord.male_parrot_id.in_(parrot_ids)
        )
        
        # 应用筛选条件
        if male_parrot_id:
            query = query.filter(BreedingRecord.male_parrot_id == male_parrot_id)
        if female_parrot_id:
            query = query.filter(BreedingRecord.female_parrot_id == female_parrot_id)
        if start_date:
            query = query.filter(BreedingRecord.mating_date >= start_date)
        if end_date:
            query = query.filter(BreedingRecord.mating_date <= end_date)
        
        # 排序和分页
        query = query.order_by(BreedingRecord.mating_date.desc())
        result = paginate_query(query, page, per_page)
        
        return success_response({
            'items': breeding_records_schema.dump(result['items']),
            'total': result['total'],
            'pages': result['pages'],
            'current_page': result['current_page'],
            'per_page': result['per_page'],
            'has_next': result['has_next'],
            'has_prev': result['has_prev']
        })
        
    except Exception as e:
        return error_response(f'获取繁殖记录失败: {str(e)}')

def add_breeding_record_internal(data):
    """内部繁殖记录添加方法"""
    try:
        # 验证必需字段
        male_parrot_id = data.get('male_parrot_id')
        female_parrot_id = data.get('female_parrot_id')
        
        if not male_parrot_id:
            return error_response('雄性鹦鹉ID不能为空')
        if not female_parrot_id:
            return error_response('雌性鹦鹉ID不能为空')
        if male_parrot_id == female_parrot_id:
            return error_response('雄性和雌性鹦鹉不能是同一只')
        
        # 验证鹦鹉是否存在且属于当前用户
        user = request.current_user
        male_parrot = Parrot.query.filter_by(id=male_parrot_id, user_id=user.id).first()
        female_parrot = Parrot.query.filter_by(id=female_parrot_id, user_id=user.id).first()
        
        if not male_parrot:
            return error_response('雄性鹦鹉不存在')
        if not female_parrot:
            return error_response('雌性鹦鹉不存在')
        
        # 创建繁殖记录
        breeding_record = BreedingRecord(
            male_parrot_id=male_parrot_id,
            female_parrot_id=female_parrot_id,
            mating_date=datetime.strptime(data.get('mating_date'), '%Y-%m-%d').date() if data.get('mating_date') else None,
            egg_laying_date=datetime.strptime(data.get('egg_laying_date'), '%Y-%m-%d').date() if data.get('egg_laying_date') else None,
            egg_count=data.get('egg_count', 0),
            hatching_date=datetime.strptime(data.get('hatching_date'), '%Y-%m-%d').date() if data.get('hatching_date') else None,
            chick_count=data.get('chick_count', 0),
            success_rate=data.get('success_rate'),
            notes=data.get('notes', ''),
            created_by_user_id=user.id,  # 记录创建者
            team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
        )
        
        db.session.add(breeding_record)
        db.session.commit()
        
        return success_response(breeding_record_schema.dump(breeding_record), '繁殖记录添加成功')
        
    except ValueError as e:
        return error_response(f'日期格式错误: {str(e)}')
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加繁殖记录失败: {str(e)}')

@records_bp.route('/breeding', methods=['POST'])
@login_required
def create_breeding_record():
    """创建繁殖记录"""
    try:
        data = request.get_json()
        return add_breeding_record_internal(data)
    except Exception as e:
        return error_response(f'添加繁殖记录失败: {str(e)}')

@records_bp.route('/breeding/<int:record_id>', methods=['DELETE'])
@login_required
def delete_breeding_record(record_id):
    """删除繁殖记录"""
    try:
        user = request.current_user
        
        # 检查记录是否可访问
        accessible_ids = get_accessible_breeding_record_ids_by_mode(user)
        if record_id not in accessible_ids:
            return error_response('记录不存在', 404)
        
        record = BreedingRecord.query.get(record_id)
        if not record:
            return error_response('记录不存在', 404)
        
        db.session.delete(record)
        db.session.commit()
        
        return success_response(message='删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除繁殖记录失败: {str(e)}')