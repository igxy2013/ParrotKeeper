from flask import Blueprint, request, jsonify
from models import db, Parrot, FeedingRecord, HealthRecord, CleaningRecord, FeedType
from schemas import (feeding_record_schema, feeding_records_schema, 
                    health_record_schema, health_records_schema,
                    cleaning_record_schema, cleaning_records_schema,
                    feed_types_schema)
from utils import login_required, success_response, error_response, paginate_query
from datetime import datetime, date

records_bp = Blueprint('records', __name__, url_prefix='/api/records')

# 最近记录相关
@records_bp.route('/recent', methods=['GET'])
@login_required
def get_recent_records():
    """获取最近记录"""
    try:
        user = request.current_user
        limit = request.args.get('limit', 5, type=int)
        
        # 获取最近的喂食记录
        recent_feeding = db.session.query(FeedingRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
            Parrot.is_active == True
        ).order_by(FeedingRecord.feeding_time.desc()).limit(limit).all()
        
        # 获取最近的健康记录
        recent_health = db.session.query(HealthRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
            Parrot.is_active == True
        ).order_by(HealthRecord.record_date.desc()).limit(limit).all()
        
        # 获取最近的清洁记录
        recent_cleaning = db.session.query(CleaningRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
            Parrot.is_active == True
        ).order_by(CleaningRecord.cleaning_time.desc()).limit(limit).all()
        
        result = {
            'feeding': feeding_records_schema.dump(recent_feeding),
            'health': health_records_schema.dump(recent_health),
            'cleaning': cleaning_records_schema.dump(recent_cleaning)
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
        
        # 基础查询：只查询用户的鹦鹉的记录
        query = db.session.query(FeedingRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
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

@records_bp.route('/feeding', methods=['POST'])
@login_required
def create_feeding_record():
    """添加喂食记录"""
    try:
        user = request.current_user
        data = request.get_json()
        
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
            notes=data.get('notes')
        )
        
        db.session.add(record)
        db.session.commit()
        
        return success_response(feeding_record_schema.dump(record), '添加成功')
        
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
        record = db.session.query(FeedingRecord).join(Parrot).filter(
            FeedingRecord.id == record_id,
            Parrot.user_id == user.id
        ).first()
        
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
        
        query = db.session.query(HealthRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
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
        user = request.current_user
        data = request.get_json()
        
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
            next_checkup_date=next_checkup_date
        )
        
        db.session.add(record)
        db.session.commit()
        
        return success_response(health_record_schema.dump(record), '添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加健康记录失败: {str(e)}')

# 清洁记录相关
@records_bp.route('/cleaning', methods=['GET'])
@login_required
def get_cleaning_records():
    """获取清洁记录"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = db.session.query(CleaningRecord).join(Parrot).filter(
            Parrot.user_id == user.id,
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

@records_bp.route('/cleaning', methods=['POST'])
@login_required
def create_cleaning_record():
    """添加清洁记录"""
    try:
        user = request.current_user
        data = request.get_json()
        
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
            notes=data.get('notes')
        )
        
        db.session.add(record)
        db.session.commit()
        
        return success_response(cleaning_record_schema.dump(record), '添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加清洁记录失败: {str(e)}')