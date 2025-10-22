from flask import Blueprint, request, jsonify
from models import db, Parrot, ParrotSpecies, User
from schemas import parrot_schema, parrots_schema, parrot_species_list_schema
from utils import login_required, success_response, error_response, paginate_query, save_uploaded_file
from datetime import datetime, date

parrots_bp = Blueprint('parrots', __name__, url_prefix='/api/parrots')

@parrots_bp.route('/species', methods=['GET'])
def get_species():
    """获取鹦鹉品种列表（游客模式可访问）"""
    try:
        species = ParrotSpecies.query.all()
        return success_response(parrot_species_list_schema.dump(species))
    except Exception as e:
        return error_response(f'获取品种列表失败: {str(e)}')

@parrots_bp.route('', methods=['GET'])
@login_required
def get_parrots():
    """获取用户的鹦鹉列表"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        print(f"[DEBUG] 用户 {user.id} 请求鹦鹉列表，页码: {page}, 每页: {per_page}")
        
        query = Parrot.query.filter_by(user_id=user.id, is_active=True)
        
        # 搜索过滤
        search = request.args.get('search')
        if search:
            # 支持同时搜索名称、编号和脚环号
            query = query.filter(
                db.or_(
                    Parrot.name.contains(search),
                    Parrot.parrot_number.contains(search),
                    Parrot.ring_number.contains(search)
                )
            )
            print(f"[DEBUG] 应用多字段搜索过滤: {search}")
        
        # 品种过滤
        species_id = request.args.get('species_id', type=int)
        if species_id:
            query = query.filter_by(species_id=species_id)
            print(f"[DEBUG] 应用品种过滤: {species_id}")
        
        # 健康状态过滤
        health_status = request.args.get('health_status')
        if health_status:
            query = query.filter_by(health_status=health_status)
            print(f"[DEBUG] 应用健康状态过滤: {health_status}")
        
        # 排序
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        if hasattr(Parrot, sort_by):
            if sort_order == 'asc':
                query = query.order_by(getattr(Parrot, sort_by).asc())
            else:
                query = query.order_by(getattr(Parrot, sort_by).desc())
        
        print(f"[DEBUG] 查询SQL: {str(query)}")
        
        result = paginate_query(query, page, per_page)
        parrots_data = parrots_schema.dump(result['items'])
        
        print(f"[DEBUG] 查询结果: 总数={result['total']}, 当前页数据={len(parrots_data)}")
        
        # 格式化返回数据以匹配前端期望
        response_data = {
            'parrots': parrots_data,
            'total': result['total'],
            'pages': result['pages'],
            'current_page': result['current_page'],
            'per_page': result['per_page'],
            'has_next': result['has_next'],
            'has_prev': result['has_prev']
        }
        
        return success_response(response_data)
        
    except Exception as e:
        return error_response(f'获取鹦鹉列表失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>', methods=['GET'])
@login_required
def get_parrot(parrot_id):
    """获取单个鹦鹉详情"""
    try:
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        return success_response(parrot_schema.dump(parrot))
        
    except Exception as e:
        return error_response(f'获取鹦鹉详情失败: {str(e)}')

@parrots_bp.route('', methods=['POST'])
@login_required
def create_parrot():
    """添加新鹦鹉"""
    try:
        user = request.current_user
        data = request.get_json()
        
        # 验证必填字段
        if not data.get('name'):
            return error_response('鹦鹉名字不能为空')
        
        # 处理日期字段
        birth_date = None
        if data.get('birth_date'):
            try:
                birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('出生日期格式错误，请使用YYYY-MM-DD格式')
        
        acquisition_date = None
        if data.get('acquisition_date'):
            try:
                acquisition_date = datetime.strptime(data['acquisition_date'], '%Y-%m-%d').date()
            except ValueError:
                return error_response('获得日期格式错误，请使用YYYY-MM-DD格式')
        
        # 处理品种ID，空字符串转换为None
        species_id = data.get('species_id')
        if species_id == '':
            species_id = None
        
        parrot = Parrot(
            user_id=user.id,
            name=data['name'],
            species_id=species_id,
            gender=data.get('gender', 'unknown'),
            birth_date=birth_date,
            acquisition_date=acquisition_date,
            color=data.get('color'),
            weight=data.get('weight'),
            health_status=data.get('health_status', 'healthy'),
            photo_url=data.get('photo_url'),
            notes=data.get('notes'),
            parrot_number=data.get('parrot_number'),
            ring_number=data.get('ring_number')
        )
        
        db.session.add(parrot)
        db.session.commit()
        
        return success_response(parrot_schema.dump(parrot), '添加成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'添加鹦鹉失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>', methods=['PUT'])
@login_required
def update_parrot(parrot_id):
    """更新鹦鹉信息"""
    try:
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        data = request.get_json()
        
        # 更新字段
        if 'name' in data:
            parrot.name = data['name']
        if 'species_id' in data:
            # 处理品种ID，空字符串转换为None
            species_id = data['species_id']
            if species_id == '':
                species_id = None
            parrot.species_id = species_id
        if 'gender' in data:
            parrot.gender = data['gender']
        if 'birth_date' in data:
            if data['birth_date']:
                try:
                    parrot.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
                except ValueError:
                    return error_response('出生日期格式错误')
            else:
                parrot.birth_date = None
        if 'acquisition_date' in data:
            if data['acquisition_date']:
                try:
                    parrot.acquisition_date = datetime.strptime(data['acquisition_date'], '%Y-%m-%d').date()
                except ValueError:
                    return error_response('获得日期格式错误')
            else:
                parrot.acquisition_date = None
        if 'color' in data:
            parrot.color = data['color']
        if 'weight' in data:
            parrot.weight = data['weight']
        if 'health_status' in data:
            parrot.health_status = data['health_status']
        if 'photo_url' in data:
            parrot.photo_url = data['photo_url']
        if 'notes' in data:
            parrot.notes = data['notes']
        if 'parrot_number' in data:
            parrot.parrot_number = data['parrot_number']
        if 'ring_number' in data:
            parrot.ring_number = data['ring_number']
        if 'is_active' in data:
            parrot.is_active = data['is_active']
        
        db.session.commit()
        
        return success_response(parrot_schema.dump(parrot), '更新成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新鹦鹉信息失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>', methods=['DELETE'])
@login_required
def delete_parrot(parrot_id):
    """删除鹦鹉（硬删除）"""
    try:
        from models import Expense, BreedingRecord
        
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        # 手动删除没有级联删除的相关记录
        # 删除支出记录
        Expense.query.filter_by(parrot_id=parrot_id).delete()
        
        # 删除繁殖记录（作为雄性或雌性参与的记录）
        BreedingRecord.query.filter(
            (BreedingRecord.male_parrot_id == parrot_id) | 
            (BreedingRecord.female_parrot_id == parrot_id)
        ).delete(synchronize_session=False)
        
        # 硬删除鹦鹉（会自动级联删除相关的喂食、健康、清洁记录和提醒）
        db.session.delete(parrot)
        db.session.commit()
        
        return success_response(message='删除成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除鹦鹉失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>/statistics', methods=['GET'])
@login_required
def get_parrot_statistics(parrot_id):
    """获取单个鹦鹉的统计信息"""
    try:
        from models import FeedingRecord, HealthRecord, CleaningRecord
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        # 计算统计数据
        now = datetime.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # 今日记录统计
        today_feeding = FeedingRecord.query.filter(
            FeedingRecord.parrot_id == parrot_id,
            func.date(FeedingRecord.feeding_time) == today
        ).count()
        
        today_health = HealthRecord.query.filter(
            HealthRecord.parrot_id == parrot_id,
            func.date(HealthRecord.record_date) == today
        ).count()
        
        today_cleaning = CleaningRecord.query.filter(
            CleaningRecord.parrot_id == parrot_id,
            func.date(CleaningRecord.cleaning_time) == today
        ).count()
        
        # 本周记录统计
        week_feeding = FeedingRecord.query.filter(
            FeedingRecord.parrot_id == parrot_id,
            func.date(FeedingRecord.feeding_time) >= week_ago
        ).count()
        
        week_health = HealthRecord.query.filter(
            HealthRecord.parrot_id == parrot_id,
            func.date(HealthRecord.record_date) >= week_ago
        ).count()
        
        week_cleaning = CleaningRecord.query.filter(
            CleaningRecord.parrot_id == parrot_id,
            func.date(CleaningRecord.cleaning_time) >= week_ago
        ).count()
        
        # 本月记录统计
        month_feeding = FeedingRecord.query.filter(
            FeedingRecord.parrot_id == parrot_id,
            func.date(FeedingRecord.feeding_time) >= month_ago
        ).count()
        
        month_health = HealthRecord.query.filter(
            HealthRecord.parrot_id == parrot_id,
            func.date(HealthRecord.record_date) >= month_ago
        ).count()
        
        month_cleaning = CleaningRecord.query.filter(
            CleaningRecord.parrot_id == parrot_id,
            func.date(CleaningRecord.cleaning_time) >= month_ago
        ).count()
        
        statistics = {
            'today': {
                'feeding': today_feeding,
                'health': today_health,
                'cleaning': today_cleaning,
                'total': today_feeding + today_health + today_cleaning
            },
            'week': {
                'feeding': week_feeding,
                'health': week_health,
                'cleaning': week_cleaning,
                'total': week_feeding + week_health + week_cleaning
            },
            'month': {
                'feeding': month_feeding,
                'health': month_health,
                'cleaning': month_cleaning,
                'total': month_feeding + month_health + month_cleaning
            }
        }
        
        return success_response(statistics)
        
    except Exception as e:
        return error_response(f'获取统计信息失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>/records', methods=['GET'])
@login_required
def get_parrot_records(parrot_id):
    """获取单个鹦鹉的记录列表"""
    try:
        from models import FeedingRecord, HealthRecord, CleaningRecord
        from schemas import feeding_records_schema, health_records_schema, cleaning_records_schema
        
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        limit = request.args.get('limit', 10, type=int)
        
        # 获取最近的记录
        feeding_records = FeedingRecord.query.filter_by(parrot_id=parrot_id)\
            .order_by(FeedingRecord.feeding_time.desc()).limit(limit).all()
        
        health_records = HealthRecord.query.filter_by(parrot_id=parrot_id)\
            .order_by(HealthRecord.record_date.desc()).limit(limit).all()
        
        cleaning_records = CleaningRecord.query.filter_by(parrot_id=parrot_id)\
            .order_by(CleaningRecord.cleaning_time.desc()).limit(limit).all()
        
        # 合并所有记录并按时间排序
        all_records = []
        
        for record in feeding_records:
            all_records.append({
                'id': record.id,
                'type': 'feeding',
                'time': record.feeding_time.isoformat(),
                'data': feeding_records_schema.dump([record])[0]
            })
        
        for record in health_records:
            all_records.append({
                'id': record.id,
                'type': 'health',
                'time': record.record_date.isoformat(),
                'data': health_records_schema.dump([record])[0]
            })
        
        for record in cleaning_records:
            all_records.append({
                'id': record.id,
                'type': 'cleaning',
                'time': record.cleaning_time.isoformat(),
                'data': cleaning_records_schema.dump([record])[0]
            })
        
        # 按时间倒序排序
        all_records.sort(key=lambda x: x['time'], reverse=True)
        
        # 限制返回数量
        all_records = all_records[:limit]
        
        return success_response({'records': all_records})
        
    except Exception as e:
        return error_response(f'获取记录失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>/upload-photo', methods=['POST'])
@login_required
def upload_photo(parrot_id):
    """上传鹦鹉照片"""
    try:
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, user_id=user.id).first()
        
        if not parrot:
            return error_response('鹦鹉不存在', 404)
        
        if 'photo' not in request.files:
            return error_response('没有上传文件')
        
        file = request.files['photo']
        if file.filename == '':
            return error_response('没有选择文件')
        
        # 保存文件
        file_path = save_uploaded_file(file, 'parrots')
        if not file_path:
            return error_response('文件格式不支持')
        
        # 更新鹦鹉照片URL
        parrot.photo_url = file_path
        db.session.commit()
        
        return success_response({
            'photo_url': file_path
        }, '照片上传成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'照片上传失败: {str(e)}')