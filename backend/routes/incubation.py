from flask import Blueprint, request
from models import db, Egg, IncubationLog, Parrot, BreedingRecord, ParrotSpecies
from utils import login_required, success_response, error_response
from datetime import date, timedelta

incubation_bp = Blueprint('incubation', __name__, url_prefix='/api/incubation')

def _resolve_team_id(user):
    if getattr(user, 'user_mode', 'personal') == 'team':
        return getattr(user, 'current_team_id', None)
    return None

def _can_access_egg(user, egg: Egg):
    if getattr(user, 'user_mode', 'personal') == 'team':
        return egg.team_id and egg.team_id == getattr(user, 'current_team_id', None)
    return egg.team_id is None and egg.created_by_user_id == user.id

def _suggest_ranges(day_index: int, species: ParrotSpecies = None):
    if day_index is None or day_index < 0:
        day_index = 0
    if day_index >= 17:
        target_temp = 37.25
        temp_low = 37.2
        temp_high = 37.3
    else:
        target_temp = 37.2
        temp_low = 37.0
        temp_high = 37.5
    if day_index <= 7:
        humidity_low = 50.0
        humidity_high = 55.0
    elif day_index <= 14:
        humidity_low = 48.0
        humidity_high = 55.0
    elif day_index <= 21:
        humidity_low = 50.0
        humidity_high = 60.0
    else:
        humidity_low = 55.0
        humidity_high = 65.0
    return {
        'temperature_c': {'low': temp_low, 'high': temp_high, 'target': target_temp},
        'humidity_pct': {'low': humidity_low, 'high': humidity_high}
    }

def _generate_advice(egg: Egg, log_date: date, t: float = None, h: float = None):
    day_idx = None
    if egg and egg.incubator_start_date and log_date:
        day_idx = (log_date - egg.incubator_start_date).days
    ranges = _suggest_ranges(day_idx, egg.species)
    tips = []
    tips.append('每日翻蛋3-5次，均匀受热，避免标记面长期朝上')
    tips.append('定期照蛋观察气室与血管生长，发现血环及时处理')
    if day_idx is not None and day_idx >= 18:
        tips.append('临近出雏，适度提高湿度并减少翻蛋')
    if t is not None:
        if t < ranges['temperature_c']['low']:
            tips.append('温度偏低，建议提升至目标范围')
        elif t > ranges['temperature_c']['high']:
            tips.append('温度偏高，建议降低至目标范围')
    if h is not None:
        if h < ranges['humidity_pct']['low']:
            tips.append('湿度偏低，可能导致气室过大，建议加湿')
        elif h > ranges['humidity_pct']['high']:
            tips.append('湿度偏高，可能影响出雏，建议降湿')
    return {
        'day_index': day_idx,
        'ranges': ranges,
        'tips': tips
    }

@incubation_bp.route('/eggs', methods=['POST'])
@login_required
def create_egg():
    try:
        user = request.current_user
        data = request.get_json() or {}
        team_id = _resolve_team_id(user)

        egg = Egg(
            breeding_record_id=data.get('breeding_record_id'),
            mother_parrot_id=data.get('mother_parrot_id'),
            father_parrot_id=data.get('father_parrot_id'),
            species_id=data.get('species_id'),
            label=data.get('label'),
            laid_date=_parse_date(data.get('laid_date')),
            incubator_start_date=_parse_date(data.get('incubator_start_date')),
            status=data.get('status') or 'incubating',
            notes=data.get('notes'),
            created_by_user_id=user.id,
            team_id=team_id
        )
        db.session.add(egg)
        db.session.commit()
        from schemas import egg_schema
        return success_response(egg_schema.dump(egg), '创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')

@incubation_bp.route('/eggs', methods=['GET'])
@login_required
def list_eggs():
    try:
        user = request.current_user
        q = Egg.query
        if getattr(user, 'user_mode', 'personal') == 'team':
            if not getattr(user, 'current_team_id', None):
                return success_response({'items': [], 'total': 0})
            q = q.filter(Egg.team_id == user.current_team_id)
        else:
            q = q.filter(Egg.team_id.is_(None), Egg.created_by_user_id == user.id)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        pagination = q.order_by(Egg.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        items = pagination.items
        total = pagination.total
        from schemas import eggs_schema
        return success_response({'items': eggs_schema.dump(items), 'total': total, 'page': page, 'per_page': per_page})
    except Exception as e:
        return error_response(f'获取失败: {str(e)}')

@incubation_bp.route('/eggs/<int:egg_id>', methods=['GET'])
@login_required
def get_egg(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        from schemas import egg_schema, incubation_logs_schema
        logs = IncubationLog.query.filter_by(egg_id=egg.id).order_by(IncubationLog.log_date.asc()).all()
        return success_response({'egg': egg_schema.dump(egg), 'logs': incubation_logs_schema.dump(logs)})
    except Exception as e:
        return error_response(f'获取失败: {str(e)}')

@incubation_bp.route('/eggs/<int:egg_id>', methods=['PUT'])
@login_required
def update_egg(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        data = request.get_json() or {}
        for f in ['label', 'laid_date', 'incubator_start_date', 'status', 'hatch_date', 'notes', 'species_id', 'mother_parrot_id', 'father_parrot_id', 'breeding_record_id']:
            if f in data:
                val = data.get(f)
                if f in ['laid_date', 'incubator_start_date', 'hatch_date']:
                    val = _parse_date(val)
                setattr(egg, f, val)
        db.session.commit()
        from schemas import egg_schema
        return success_response(egg_schema.dump(egg), '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')

@incubation_bp.route('/eggs/<int:egg_id>', methods=['DELETE'])
@login_required
def delete_egg(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        db.session.delete(egg)
        db.session.commit()
        return success_response({'id': egg_id}, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')

@incubation_bp.route('/eggs/<int:egg_id>/logs', methods=['POST'])
@login_required
def add_log(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        data = request.get_json() or {}
        log_date = data.get('log_date') or date.today()
        temperature_c = data.get('temperature_c')
        humidity_pct = data.get('humidity_pct')
        weight_g = data.get('weight_g')
        advice_obj = _generate_advice(egg, log_date, temperature_c, humidity_pct)
        advice_text = '\n'.join(advice_obj.get('tips') or [])
        team_id = _resolve_team_id(user)
        log = IncubationLog(
            egg_id=egg.id,
            log_date=log_date,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
            weight_g=weight_g,
            advice=advice_text,
            notes=data.get('notes'),
            image_urls=data.get('image_urls'),
            created_by_user_id=user.id,
            team_id=team_id
        )
        db.session.add(log)
        db.session.commit()
        from schemas import incubation_log_schema
        payload = incubation_log_schema.dump(log)
        payload['suggest'] = advice_obj
        return success_response(payload, '记录成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'记录失败: {str(e)}')

@incubation_bp.route('/eggs/<int:egg_id>/calendar', methods=['GET'])
@login_required
def get_calendar(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        logs = IncubationLog.query.filter_by(egg_id=egg.id).order_by(IncubationLog.log_date.asc()).all()
        calendar = {}
        for l in logs:
            d = l.log_date.isoformat() if hasattr(l.log_date, 'isoformat') else str(l.log_date)
            calendar[d] = {
                'temperature_c': float(l.temperature_c) if l.temperature_c is not None else None,
                'humidity_pct': float(l.humidity_pct) if l.humidity_pct is not None else None,
                'weight_g': float(l.weight_g) if l.weight_g is not None else None,
                'advice': l.advice,
                'notes': l.notes
            }
        return success_response({'calendar': calendar})
    except Exception as e:
        return error_response(f'获取失败: {str(e)}')

@incubation_bp.route('/suggestions', methods=['GET'])
@login_required
def get_suggestions():
    try:
        day = request.args.get('day', type=int)
        ranges = _suggest_ranges(day, None)
        return success_response({'day_index': day, 'ranges': ranges})
    except Exception as e:
        return error_response(f'获取失败: {str(e)}')
def _parse_date(val):
    if not val:
        return None
    try:
        # 支持 'YYYY-MM-DD' 或 ISO 格式
        s = str(val)
        if 'T' in s:
            # 去掉时区 Z，统一解析为日期
            from datetime import datetime
            dt = datetime.fromisoformat(s.replace('Z', '+00:00'))
            return dt.date()
        from datetime import datetime
        return datetime.strptime(s, '%Y-%m-%d').date()
    except Exception:
        try:
            # 直接传入 date 对象的情况
            from datetime import date as _date
            if isinstance(val, _date):
                return val
        except Exception:
            pass
    return None
