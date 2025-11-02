from flask import Blueprint, request, jsonify
from models import db, Parrot, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, FeedType
from schemas import (feeding_record_schema, feeding_records_schema, 
                    health_record_schema, health_records_schema,
                    cleaning_record_schema, cleaning_records_schema,
                    breeding_record_schema, breeding_records_schema,
                    feed_types_schema)
from utils import login_required, success_response, error_response, add_user_points, paginate_query
from team_mode_utils import (get_accessible_parrot_ids_by_mode, filter_records_by_mode, 
                            get_accessible_feeding_record_ids_by_mode, get_accessible_health_record_ids_by_mode,
                            get_accessible_cleaning_record_ids_by_mode, get_accessible_breeding_record_ids_by_mode)
from datetime import datetime, date

records_bp = Blueprint('records', __name__, url_prefix='/api/records')

def _normalize_amount(amount):
    """规范化分量值，将空字符串或无效值转换为None"""
    if amount is None:
        return None
    
    # 如果是字符串，去除空白字符
    if isinstance(amount, str):
        amount = amount.strip()
        if not amount:  # 空字符串
            return None
    
    # 尝试转换为数字
    try:
        # 先尝试整数
        if isinstance(amount, str) and '.' not in amount:
            return int(amount)
        # 再尝试浮点数
        return float(amount)
    except (ValueError, TypeError):
        # 转换失败，返回None
        return None

def add_feeding_record_internal(data):
    """内部函数：添加喂食记录"""
    try:
        user = request.current_user
        parrot_ids = data.get('parrot_ids', [])
        feeding_time_str = data.get('feeding_time') or data.get('record_date', '')
        notes = data.get('notes', '')
        food_amounts = data.get('food_amounts', {})
        photos = data.get('photos', [])
        
        if not parrot_ids:
            return error_response('请选择鹦鹉')
        
        # 解析喂食时间
        if not feeding_time_str:
            feeding_time = datetime.now()
        else:
            try:
                # 尝试解析完整的时间字符串
                if 'T' in feeding_time_str:
                    feeding_time = datetime.fromisoformat(feeding_time_str.replace('Z', '+00:00'))
                else:
                    # 假设是日期格式，添加默认时间
                    feeding_time = datetime.strptime(feeding_time_str, '%Y-%m-%d')
            except ValueError:
                feeding_time = datetime.now()
        
        # 创建喂食记录
        created_records = []
        for parrot_id in parrot_ids:
            # 验证鹦鹉是否属于当前用户（或团队共享）
            accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
            if parrot_id not in accessible_parrot_ids:
                continue
                
            record = FeedingRecord(
                parrot_id=parrot_id,
                feeding_time=feeding_time,
                notes=notes,
                created_by_user_id=user.id,
                team_id=getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
            )
            db.session.add(record)
            created_records.append(record)
        
        db.session.commit()
        
        # 增加喂食记录积分（每日首次添加喂食记录获得1积分）
        if created_records:
            add_user_points(user.id, 1, 'feeding')
        
        return success_response({
            'records': feeding_records_schema.dump(created_records)
        }, '喂食记录添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加喂食记录失败: {str(e)}')

def add_health_record_internal(data):
    """内部函数：添加健康记录"""
    try:
        user = request.current_user
        parrot_ids = data.get('parrot_ids', [])
        record_date_str = data.get('record_date') or data.get('record_date', '')
        record_type = data.get('record_type', 'checkup')
        health_status = data.get('health_status', 'healthy')
        description = data.get('description', '')
        weight = _normalize_amount(data.get('weight'))
        temperature = _normalize_amount(data.get('temperature'))
        symptoms = data.get('symptoms', '')
        treatment = data.get('treatment', '')
        medication = data.get('medication', '')
        vet_name = data.get('vet_name', '')
        cost = _normalize_amount(data.get('cost'))
        image_urls = data.get('photos', [])
        next_checkup_date_str = data.get('next_checkup_date', '')
        
        if not parrot_ids:
            return error_response('请选择鹦鹉')
        
        # 解析记录日期
        if not record_date_str:
            record_date = date.today()
        else:
            try:
                record_date = datetime.strptime(record_date_str, '%Y-%m-%d').date()
            except ValueError:
                record_date = date.today()
        
        # 解析下次检查日期
        next_checkup_date = None
        if next_checkup_date_str:
            try:
                next_checkup_date = datetime.strptime(next_checkup_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # 创建健康记录
        created_records = []
        for parrot_id in parrot_ids:
            # 验证鹦鹉是否属于当前用户（或团队共享）
            accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
            if parrot_id not in accessible_parrot_ids:
                continue
                
            record = HealthRecord(
                parrot_id=parrot_id,
                record_type=record_type,
                health_status=health_status,
                description=description,
                weight=weight,
                temperature=temperature,
                symptoms=symptoms,
                treatment=treatment,
                medication=medication,
                vet_name=vet_name,
                cost=cost,
                image_urls=','.join(image_urls) if image_urls else None,
                record_date=record_date,
                next_checkup_date=next_checkup_date,
                created_by_user_id=user.id,
                team_id=getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
            )
            db.session.add(record)
            created_records.append(record)
        
        db.session.commit()
        
        # 增加健康记录积分（每日首次添加健康记录获得1积分）
        if created_records:
            add_user_points(user.id, 1, 'health')
        
        return success_response({
            'records': health_records_schema.dump(created_records)
        }, '健康记录添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加健康记录失败: {str(e)}')

def add_cleaning_record_internal(data):
    """内部函数：添加清洁记录"""
    try:
        user = request.current_user
        parrot_ids = data.get('parrot_ids', [])
        cleaning_time_str = data.get('cleaning_time') or data.get('record_date', '')
        cleaning_types = data.get('cleaning_types', [])
        description = data.get('description', '')
        photos = data.get('photos', [])
        
        if not parrot_ids:
            return error_response('请选择鹦鹉')
        
        # 解析清洁时间
        if not cleaning_time_str:
            cleaning_time = datetime.now()
        else:
            try:
                # 尝试解析完整的时间字符串
                if 'T' in cleaning_time_str:
                    cleaning_time = datetime.fromisoformat(cleaning_time_str.replace('Z', '+00:00'))
                else:
                    # 假设是日期格式，添加默认时间
                    cleaning_time = datetime.strptime(cleaning_time_str, '%Y-%m-%d')
            except ValueError:
                cleaning_time = datetime.now()
        
        # 创建清洁记录
        created_records = []
        for parrot_id in parrot_ids:
            # 验证鹦鹉是否属于当前用户（或团队共享）
            accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
            if parrot_id not in accessible_parrot_ids:
                continue
                
            # 为每种清洁类型创建一条记录
            for cleaning_type in cleaning_types:
                record = CleaningRecord(
                    parrot_id=parrot_id,
                    cleaning_type=cleaning_type,
                    description=description,
                    cleaning_time=cleaning_time,
                    created_by_user_id=user.id,
                    team_id=getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
                )
                db.session.add(record)
                created_records.append(record)
        
        db.session.commit()
        
        # 增加清洁记录积分（每日首次添加清洁记录获得1积分）
        if created_records:
            add_user_points(user.id, 1, 'cleaning')
        
        return success_response({
            'records': cleaning_records_schema.dump(created_records)
        }, '清洁记录添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加清洁记录失败: {str(e)}')

def add_breeding_record_internal(data):
    """内部函数：添加繁殖记录"""
    try:
        user = request.current_user
        male_parrot_id = data.get('male_parrot_id')
        female_parrot_id = data.get('female_parrot_id')
        mating_date_str = data.get('mating_date', '')
        egg_laying_date_str = data.get('egg_laying_date', '')
        egg_count = data.get('egg_count', 0)
        hatching_date_str = data.get('hatching_date', '')
        chick_count = data.get('chick_count', 0)
        success_rate = data.get('success_rate')
        notes = data.get('notes', '')
        
        if not male_parrot_id or not female_parrot_id:
            return error_response('请选择公鸟和母鸟')
        
        # 验证鹦鹉是否属于当前用户（或团队共享）
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        if male_parrot_id not in accessible_parrot_ids or female_parrot_id not in accessible_parrot_ids:
            return error_response('选择的鹦鹉不在您的访问范围内')
        
        # 解析日期
        mating_date = None
        if mating_date_str:
            try:
                mating_date = datetime.strptime(mating_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        egg_laying_date = None
        if egg_laying_date_str:
            try:
                egg_laying_date = datetime.strptime(egg_laying_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        hatching_date = None
        if hatching_date_str:
            try:
                hatching_date = datetime.strptime(hatching_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        # 创建繁殖记录
        record = BreedingRecord(
            male_parrot_id=male_parrot_id,
            female_parrot_id=female_parrot_id,
            mating_date=mating_date,
            egg_laying_date=egg_laying_date,
            egg_count=egg_count,
            hatching_date=hatching_date,
            chick_count=chick_count,
            success_rate=success_rate,
            notes=notes,
            created_by_user_id=user.id,
            team_id=getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
        )
        db.session.add(record)
        db.session.commit()
        
        # 增加繁殖记录积分（每日首次添加繁殖记录获得1积分）
        add_user_points(user.id, 1, 'breeding')
        
        return success_response({
            'record': breeding_record_schema.dump(record)
        }, '繁殖记录添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加繁殖记录失败: {str(e)}')

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
            # 前置清洗：将空字符串分量统一转换为None
            amt = data.get('amount')
            if isinstance(amt, str) and amt.strip() == '':
                data['amount'] = None
            fa = data.get('food_amounts')
            if isinstance(fa, dict):
                for k, v in list(fa.items()):
                    if isinstance(v, str) and v.strip() == '':
                        fa[k] = None
                data['food_amounts'] = fa
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
        normalized_amount = _normalize_amount(data['amount'])
        if normalized_amount is None:
            return error_response('分量值无效', 400)
        record.amount = normalized_amount
    if 'feeding_time' in data:
        if data['feeding_time']:
            try:
                record.feeding_time = datetime.strptime(data['feeding_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                return error_response('喂食时间格式错误')
    if 'notes' in data:
        record.notes = data['notes']
    if 'photos' in data:
        try:
            import json
            photos = data.get('photos') or []
            if isinstance(photos, list):
                record.image_urls = json.dumps(photos, ensure_ascii=False)
        except Exception:
            pass
    
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
    if 'health_status' in data:
        record.health_status = data['health_status']
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
    
    # 处理多清洁类型的编辑
    if 'cleaning_types' in data and isinstance(data['cleaning_types'], list):
        cleaning_types = [ct for ct in data['cleaning_types'] if ct and ct != '']
        
        if len(cleaning_types) > 1:
            # 多清洁类型：需要删除原记录，创建多个新记录
            original_parrot_id = record.parrot_id
            original_description = record.description
            original_cleaning_time = record.cleaning_time
            original_notes = record.notes
            original_created_by_user_id = record.created_by_user_id
            original_team_id = record.team_id
            
            # 删除原记录
            db.session.delete(record)
            
            # 为每个清洁类型创建新记录
            created_records = []
            for cleaning_type in cleaning_types:
                new_record = CleaningRecord(
                    parrot_id=original_parrot_id,
                    cleaning_type=cleaning_type,
                    description=data.get('description', original_description),
                    cleaning_time=datetime.strptime(data['cleaning_time'], '%Y-%m-%d %H:%M:%S') if data.get('cleaning_time') else original_cleaning_time,
                    notes=data.get('notes', original_notes),
                    created_by_user_id=original_created_by_user_id,
                    team_id=original_team_id
                )
                db.session.add(new_record)
                created_records.append(new_record)
            
            db.session.commit()
            
            # 返回第一个记录作为代表
            return success_response(cleaning_record_schema.dump(created_records[0]), '更新成功')
        
        elif len(cleaning_types) == 1:
            # 单清洁类型：正常更新
            record.cleaning_type = cleaning_types[0]
        else:
            # 空清洁类型
            record.cleaning_type = None
    elif 'cleaning_type' in data:
        # 向后兼容单个cleaning_type
        cleaning_type = data['cleaning_type']
        if cleaning_type == '':
            record.cleaning_type = None
        else:
            record.cleaning_type = cleaning_type
    
    # 更新其他字段
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
        egg_count = data['egg_count']
        if egg_count == '' or egg_count is None:
            record.egg_count = 0
        else:
            try:
                record.egg_count = int(egg_count)
            except (ValueError, TypeError):
                record.egg_count = 0
    if 'hatching_date' in data:
        if data['hatching_date']:
            try:
                record.hatching_date = datetime.strptime(data['hatching_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('孵化日期格式错误')
    if 'chick_count' in data:
        chick_count = data['chick_count']
        if chick_count == '' or chick_count is None:
            record.chick_count = 0
        else:
            try:
                record.chick_count = int(chick_count)
            except (ValueError, TypeError):
                record.chick_count = 0
    if 'success_rate' in data:
        success_rate = data['success_rate']
        if success_rate == '' or success_rate is None:
            record.success_rate = None
        else:
            try:
                record.success_rate = float(success_rate)
            except (ValueError, TypeError):
                record.success_rate = None
    if 'notes' in data:
        record.notes = data['notes']
    
    db.session.commit()
    
    return success_response(breeding_record_schema.dump(record), '更新成功')

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
                return error_response('只有团队管理员才能修改喂食记录', 403)
        
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
            normalized_amount = _normalize_amount(data['amount'])
            if normalized_amount is None:
                return error_response('分量值无效', 400)
            record.amount = normalized_amount
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
                return error_response('只有团队管理员才能删除喂食记录', 403)
        
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

@records_bp.route('/cleaning/batch-update', methods=['PUT'])
@login_required
def batch_update_cleaning_records():
    """批量更新清洁记录"""
    try:
        data = request.get_json()
        user = request.current_user
        
        # 获取要更新的记录ID列表
        record_ids = data.get('record_ids', [])
        if not record_ids:
            return error_response('缺少记录ID列表')
        
        # 检查所有记录是否可访问
        accessible_ids = get_accessible_cleaning_record_ids_by_mode(user)
        for record_id in record_ids:
            if record_id not in accessible_ids:
                return error_response(f'记录 {record_id} 不存在或无权限访问', 404)
        
        # 获取所有旧记录以收集原始鹦鹉ID
        old_records = CleaningRecord.query.filter(CleaningRecord.id.in_(record_ids)).all()
        if not old_records:
            return error_response('记录不存在', 404)
        
        # 收集原始鹦鹉ID和其他信息
        original_parrot_ids = list(set([record.parrot_id for record in old_records]))
        first_record = old_records[0]
        original_created_by_user_id = first_record.created_by_user_id
        original_team_id = first_record.team_id
        
        # 删除所有旧记录
        for record in old_records:
            db.session.delete(record)
        
        # 确定要使用的鹦鹉ID列表
        parrot_ids = data.get('parrot_ids', original_parrot_ids)
        if not parrot_ids:
            parrot_ids = original_parrot_ids
        
        # 处理清洁类型
        cleaning_types = data.get('cleaning_types', [])
        if not cleaning_types:
            # 如果没有清洁类型，为每个鹦鹉创建一个空记录
            for parrot_id in parrot_ids:
                new_record = CleaningRecord(
                    parrot_id=parrot_id,
                    cleaning_type=None,
                    description=data.get('description', ''),
                    cleaning_time=datetime.strptime(data['record_time'], '%Y-%m-%d %H:%M:%S') if data.get('record_time') else first_record.cleaning_time,
                    notes=data.get('notes', ''),
                    created_by_user_id=original_created_by_user_id,
                    team_id=original_team_id
                )
                db.session.add(new_record)
        else:
            # 为每个鹦鹉和每个清洁类型创建新记录
            for parrot_id in parrot_ids:
                for cleaning_type in cleaning_types:
                    new_record = CleaningRecord(
                        parrot_id=parrot_id,
                        cleaning_type=cleaning_type,
                        description=data.get('description', ''),
                        cleaning_time=datetime.strptime(data['record_time'], '%Y-%m-%d %H:%M:%S') if data.get('record_time') else first_record.cleaning_time,
                        notes=data.get('notes', ''),
                        created_by_user_id=original_created_by_user_id,
                        team_id=original_team_id
                    )
                    db.session.add(new_record)
        
        db.session.commit()
        return success_response({}, '批量更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量更新清洁记录失败: {str(e)}')



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
        per_page = request.args.get('per_page', 20, type=int)
        
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
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(BreedingRecord.mating_date) >= start_date)
            except ValueError:
                return error_response('开始日期格式错误')
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(db.func.date(BreedingRecord.mating_date) <= end_date)
            except ValueError:
                return error_response('结束日期格式错误')
        
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

# 批量更新喂食记录
@records_bp.route('/feeding/batch', methods=['PUT'])
@login_required
def update_feeding_records_batch_route():
    try:
        data = request.get_json()
        return update_feeding_records_batch(data)
    except Exception as e:
        db.session.rollback()
        return error_response(f'批量更新喂食记录失败: {str(e)}')

def update_feeding_records_batch(data):
    """批量更新喂食记录"""
    user = request.current_user
    records = data.get('records')
    if not isinstance(records, list) or len(records) == 0:
        return error_response('records 列表不能为空', 400)
    # 提取并校验ID
    record_ids = []
    for item in records:
        rid = item.get('id') or item.get('record_id')
        if rid is None:
            return error_response('每项必须包含记录ID', 400)
        record_ids.append(rid)
    accessible_ids = set(get_accessible_feeding_record_ids_by_mode(user))
    if not set(record_ids).issubset(accessible_ids):
        return error_response('部分记录不存在或无权限访问', 403)
    # 批量更新
    updated_records = []
    for item in records:
        rid = item.get('id') or item.get('record_id')
        record = FeedingRecord.query.get(rid)
        if not record:
            return error_response(f'记录不存在: {rid}', 404)
        if 'feed_type_id' in item:
            record.feed_type_id = item['feed_type_id']
        if 'amount' in item:
            normalized_amount = _normalize_amount(item['amount'])
            if normalized_amount is None:
                return error_response(f'记录{rid}的分量值无效', 400)
            record.amount = normalized_amount
        if 'feeding_time' in item:
            if item['feeding_time']:
                try:
                    record.feeding_time = datetime.strptime(item['feeding_time'], '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    return error_response(f'喂食时间格式错误: {item["feeding_time"]}', 400)
        if 'notes' in item:
            record.notes = item['notes']
        updated_records.append(record)
    db.session.commit()
    return success_response({
        'records': feeding_records_schema.dump(updated_records),
        'count': len(updated_records)
    }, f'成功更新{len(updated_records)}条喂食记录')

@records_bp.route('/feeding/upsert-by-time', methods=['PUT'])
@login_required
def upsert_feeding_records_by_time_route():
    try:
        data = request.get_json()
        return upsert_feeding_records_by_time(data)
    except Exception as e:
        db.session.rollback()
        return error_response(f'按时间批量更新喂食记录失败: {str(e)}')

def upsert_feeding_records_by_time(data):
    """按时间对选中鹦鹉的喂食记录进行批量更新/新增（多食物类型+多分量）"""
    user = request.current_user

    # 团队模式权限校验（与单条更新保持一致）
    if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
        from team_models import TeamMember
        member = TeamMember.query.filter_by(
            team_id=user.current_team_id,
            user_id=user.id,
            is_active=True
        ).first()
        if not member or member.role not in ['owner', 'admin']:
            return error_response('只有团队管理员才能批量编辑喂食记录', 403)

    parrot_ids = data.get('parrot_ids') or []
    if not parrot_ids:
        pid = data.get('parrot_id')
        if pid:
            parrot_ids = [pid]
    if not parrot_ids:
        return error_response('请选择鹦鹉', 400)

    # 校验可访问鹦鹉
    accessible_parrots = set(get_accessible_parrot_ids_by_mode(user))
    if not set(parrot_ids).issubset(accessible_parrots):
        return error_response('部分鹦鹉不存在或无权限访问', 403)

    # 解析喂食时间
    feeding_time_str = data.get('feeding_time')
    if not feeding_time_str:
        return error_response('喂食时间不能为空', 400)
    try:
        feeding_time = datetime.strptime(feeding_time_str, '%Y-%m-%d %H:%M:%S')
    except ValueError:
        return error_response('喂食时间格式错误', 400)

    # 目标食物类型集合
    food_types = data.get('food_types') or []
    food_amounts = data.get('food_amounts') or {}
    if not food_types and isinstance(food_amounts, dict) and len(food_amounts) > 0:
        # 用 food_amounts 的键作为类型集合（兼容字符串/数字键）
        food_types = [int(k) for k in food_amounts.keys() if str(k).isdigit()]
    # 兼容旧的单个 feed_type_id
    if not food_types and data.get('feed_type_id'):
        food_types = [data.get('feed_type_id')]
    if not food_types:
        return error_response('请至少选择一种食物类型', 400)

    created_records = []
    updated_records = []

    for parrot_id in parrot_ids:
        # 查找该时间点已有的喂食记录映射（按食物类型）
        existing = db.session.query(FeedingRecord).filter(
            FeedingRecord.parrot_id == parrot_id,
            FeedingRecord.feeding_time == feeding_time
        ).all()
        existing_map = {r.feed_type_id: r for r in existing if r.feed_type_id is not None}

        for food_type_id in food_types:
            # 计算分量：优先每类型，其次全局 amount
            amount_value = None
            if isinstance(food_amounts, dict):
                amount_value = food_amounts.get(str(food_type_id))
                if amount_value is None:
                    amount_value = food_amounts.get(food_type_id)
            if amount_value is None:
                amount_value = data.get('amount')
            
            # 规范化分量值
            normalized_amount = _normalize_amount(amount_value)
            # 单食物类型允许分量为空；多食物类型必须提供每项分量
            if normalized_amount is None and len(food_types) > 1:
                return error_response('请为每个食物类型填写分量', 400)

            if food_type_id in existing_map:
                record = existing_map[food_type_id]
                record.amount = normalized_amount
                record.notes = data.get('notes')
                updated_records.append(record)
            else:
                record = FeedingRecord(
                    parrot_id=parrot_id,
                    feed_type_id=food_type_id,
                    amount=normalized_amount,
                    feeding_time=feeding_time,
                    notes=data.get('notes'),
                    created_by_user_id=user.id,
                    team_id=user.current_team_id if user.user_mode == 'team' else None
                )
                db.session.add(record)
                created_records.append(record)

    db.session.commit()

    return success_response({
        'created': feeding_records_schema.dump(created_records),
        'updated': feeding_records_schema.dump(updated_records),
        'created_count': len(created_records),
        'updated_count': len(updated_records)
    }, f'批量编辑完成：新增{len(created_records)}条，更新{len(updated_records)}条')
