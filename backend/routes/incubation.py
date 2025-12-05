from flask import Blueprint, request
from models import db, Egg, IncubationLog, Parrot, BreedingRecord, ParrotSpecies
from models import IncubationSuggestion
from utils import login_required, success_response, error_response
from datetime import date, timedelta, datetime
from decimal import Decimal

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
    # 优先匹配自定义建议（按品种与天数范围）
    try:
        if species and species.id is not None and day_index is not None and day_index >= 1:
            sug = IncubationSuggestion.query.filter(
                IncubationSuggestion.species_id == species.id,
                IncubationSuggestion.day_start <= day_index,
                IncubationSuggestion.day_end >= day_index
            ).order_by(IncubationSuggestion.day_start.asc()).first()
            if sug:
                return {
                    'temperature_c': {
                        'low': float(sug.temperature_low) if sug.temperature_low is not None else None,
                        'high': float(sug.temperature_high) if sug.temperature_high is not None else None,
                        'target': float(sug.temperature_target) if sug.temperature_target is not None else None
                    },
                    'humidity_pct': {
                        'low': float(sug.humidity_low) if sug.humidity_low is not None else None,
                        'high': float(sug.humidity_high) if sug.humidity_high is not None else None
                    }
                }
    except Exception:
        pass
    # 默认建议
    if day_index is None or day_index < 1:
        day_index = 1
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
        start_dt = egg.incubator_start_date
        if isinstance(start_dt, date) and not isinstance(start_dt, datetime):
            start_dt = datetime.combine(start_dt, datetime.min.time())
        log_dt = datetime.combine(log_date, datetime.min.time())
        diff = log_dt - start_dt
        day_idx = diff.days + 1
        if day_idx < 1:
            day_idx = 1
    ranges = _suggest_ranges(day_idx, egg.species)
    tips = []
    user_tips = []
    
    try:
        if egg.species and egg.species.id is not None and day_idx is not None and day_idx >= 1:
            sug = IncubationSuggestion.query.filter(
                IncubationSuggestion.species_id == egg.species.id,
                IncubationSuggestion.day_start <= day_idx,
                IncubationSuggestion.day_end >= day_idx
            ).order_by(IncubationSuggestion.day_start.asc()).first()
            if sug and sug.tips:
                tips.append(sug.tips)
                user_tips.append(sug.tips)
            turning_required = bool(sug.turning_required) if sug is not None else None
            candling_required = bool(sug.candling_required) if sug is not None else None
        else:
            turning_required = None
            candling_required = None
    except Exception:
        turning_required = None
        candling_required = None
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
        'tips': tips,
        'user_tips': user_tips,
        'turning_required': turning_required,
        'candling_required': candling_required
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
            incubator_start_date=_parse_datetime(data.get('incubator_start_date')),
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
                if f == 'incubator_start_date':
                    val = _parse_datetime(val)
                elif f in ['laid_date', 'hatch_date']:
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
        # 解析日志日期，支持 'YYYY-MM-DD' 或 ISO 格式，未提供则为今日
        log_date = _parse_date(data.get('log_date')) or date.today()
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

@incubation_bp.route('/logs/<int:log_id>', methods=['PUT'])
@login_required
def update_log(log_id):
    try:
        user = request.current_user
        log = IncubationLog.query.get(log_id)
        if not log:
            return error_response('不存在')
        egg = Egg.query.get(log.egg_id)
        if not egg or not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        data = request.get_json() or {}
        if 'log_date' in data:
            val = _parse_date(data.get('log_date'))
            if val:
                log.log_date = val
        for f in ['temperature_c', 'humidity_pct', 'weight_g', 'notes', 'image_urls']:
            if f in data:
                setattr(log, f, data.get(f))
        db.session.commit()
        from schemas import incubation_log_schema
        payload = incubation_log_schema.dump(log)
        return success_response(payload, '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')

@incubation_bp.route('/logs/<int:log_id>', methods=['DELETE'])
@login_required
def delete_log(log_id):
    try:
        user = request.current_user
        log = IncubationLog.query.get(log_id)
        if not log:
            return error_response('不存在')
        egg = Egg.query.get(log.egg_id)
        if not egg or not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        db.session.delete(log)
        db.session.commit()
        return success_response({'id': log_id}, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')

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

@incubation_bp.route('/eggs/<int:egg_id>/advice', methods=['GET'])
@login_required
def get_egg_advice(egg_id):
    try:
        user = request.current_user
        egg = Egg.query.get(egg_id)
        if not egg:
            return error_response('不存在')
        if not _can_access_egg(user, egg):
            return error_response('权限不足', 403)
        d = request.args.get('date')
        log_date = _parse_date(d) or date.today()
        advice_obj = _generate_advice(egg, log_date, None, None)
        return success_response(advice_obj)
    except Exception as e:
        return error_response(f'获取失败: {str(e)}')

@incubation_bp.route('/suggestions', methods=['GET'])
@login_required
def get_suggestions():
    try:
        species_id = request.args.get('species_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        q = IncubationSuggestion.query
        if species_id:
            q = q.filter(IncubationSuggestion.species_id == species_id)
        pagination = q.order_by(IncubationSuggestion.species_id.asc(), IncubationSuggestion.day_start.asc()).paginate(page=page, per_page=per_page, error_out=False)
        items = pagination.items
        from schemas import incubation_suggestions_schema
        return success_response({'items': incubation_suggestions_schema.dump(items), 'total': pagination.total, 'page': page, 'per_page': per_page})
    except Exception as e:
        try:
            from sqlalchemy import text
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 50, type=int)
            offset = (page - 1) * per_page
            sid = request.args.get('species_id', type=int)
            count_sql = 'SELECT COUNT(*) AS cnt FROM incubation_suggestions' + (' WHERE species_id=:sid' if sid else '')
            total = db.session.execute(text(count_sql), ({'sid': sid} if sid else {})).scalar() or 0
            base_sql = 'SELECT s.id,s.species_id,ps.name AS species_name,s.day_start,s.day_end,s.temperature_target,s.temperature_low,s.temperature_high,s.humidity_low,s.humidity_high,s.turning_required,s.candling_required,s.tips,s.created_at,s.updated_at FROM incubation_suggestions s LEFT JOIN parrot_species ps ON s.species_id = ps.id' + (' WHERE s.species_id=:sid' if sid else '') + ' ORDER BY s.species_id ASC, s.day_start ASC LIMIT :limit OFFSET :offset'
            params = {'limit': per_page, 'offset': offset}
            if sid:
                params['sid'] = sid
            rows = db.session.execute(text(base_sql), params).mappings().all()
            items = []
            for r in rows:
                items.append({
                    'id': r.get('id'),
                    'species_id': r.get('species_id'),
                    'species_name': r.get('species_name'),
                    'day_start': r.get('day_start'),
                    'day_end': r.get('day_end'),
                    'temperature_target': r.get('temperature_target'),
                    'temperature_low': r.get('temperature_low'),
                    'temperature_high': r.get('temperature_high'),
                    'humidity_low': r.get('humidity_low'),
                    'humidity_high': r.get('humidity_high'),
                    'turning_required': r.get('turning_required'),
                    'candling_required': r.get('candling_required'),
                    'tips': r.get('tips')
                })
            return success_response({'items': items, 'total': total, 'page': page, 'per_page': per_page})
        except Exception:
            return error_response(f'获取失败: {str(e)}')

@incubation_bp.route('/suggestions', methods=['POST'])
@login_required
def create_suggestion():
    try:
        user = request.current_user
        if getattr(user, 'role', 'user') not in ['admin', 'super_admin']:
            return error_response('仅管理员可操作', 403)
        data = request.get_json() or {}
        def _num_or_none(v):
            if v is None: return None
            s = str(v).strip()
            if s == '': return None
            try:
                return Decimal(s)
            except Exception:
                return None
        def _int_or_default(v, d):
            try:
                return int(v)
            except Exception:
                return d
        sug = IncubationSuggestion(
            species_id=_int_or_default(data.get('species_id'), None),
            day_start=_int_or_default(data.get('day_start'), 1),
            day_end=_int_or_default(data.get('day_end'), 21),
            temperature_target=_num_or_none(data.get('temperature_target')),
            temperature_low=_num_or_none(data.get('temperature_low')),
            temperature_high=_num_or_none(data.get('temperature_high')),
            humidity_low=_num_or_none(data.get('humidity_low')),
            humidity_high=_num_or_none(data.get('humidity_high')),
            turning_required=bool(data.get('turning_required')),
            candling_required=bool(data.get('candling_required')),
            tips=data.get('tips'),
            created_by_user_id=user.id,
            team_id=_resolve_team_id(user)
        )
        db.session.add(sug)
        db.session.commit()
        from schemas import incubation_suggestion_schema
        return success_response(incubation_suggestion_schema.dump(sug), '创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')

@incubation_bp.route('/suggestions/<int:sug_id>', methods=['PUT'])
@login_required
def update_suggestion(sug_id):
    try:
        user = request.current_user
        if getattr(user, 'role', 'user') not in ['admin', 'super_admin']:
            return error_response('仅管理员可操作', 403)
        sug = IncubationSuggestion.query.get(sug_id)
        if not sug:
            return error_response('不存在')
        data = request.get_json() or {}
        def _num_or_none(v):
            if v is None: return None
            s = str(v).strip()
            if s == '': return None
            try:
                return Decimal(s)
            except Exception:
                return None
        def _int_or_none(v):
            try:
                return int(v)
            except Exception:
                return None
        if 'species_id' in data:
            sug.species_id = _int_or_none(data.get('species_id'))
        if 'day_start' in data:
            sug.day_start = _int_or_none(data.get('day_start')) or sug.day_start
        if 'day_end' in data:
            sug.day_end = _int_or_none(data.get('day_end')) or sug.day_end
        if 'temperature_target' in data:
            sug.temperature_target = _num_or_none(data.get('temperature_target'))
        if 'temperature_low' in data:
            sug.temperature_low = _num_or_none(data.get('temperature_low'))
        if 'temperature_high' in data:
            sug.temperature_high = _num_or_none(data.get('temperature_high'))
        if 'humidity_low' in data:
            sug.humidity_low = _num_or_none(data.get('humidity_low'))
        if 'humidity_high' in data:
            sug.humidity_high = _num_or_none(data.get('humidity_high'))
        if 'turning_required' in data:
            sug.turning_required = bool(data.get('turning_required'))
        if 'candling_required' in data:
            sug.candling_required = bool(data.get('candling_required'))
        if 'tips' in data:
            sug.tips = data.get('tips')
        db.session.commit()
        from schemas import incubation_suggestion_schema
        return success_response(incubation_suggestion_schema.dump(sug), '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')

@incubation_bp.route('/suggestions/<int:sug_id>', methods=['DELETE'])
@login_required
def delete_suggestion(sug_id):
    try:
        user = request.current_user
        if getattr(user, 'role', 'user') not in ['admin', 'super_admin']:
            return error_response('仅管理员可操作', 403)
        sug = IncubationSuggestion.query.get(sug_id)
        if not sug:
            return error_response('不存在')
        db.session.delete(sug)
        db.session.commit()
        return success_response({'id': sug_id}, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')

def _parse_datetime(val):
    if not val:
        return None
    try:
        s = str(val)
        from datetime import datetime
        if 'T' in s:
            s = s.replace('Z', '+00:00')
            return datetime.fromisoformat(s)
        if ' ' in s:
            if len(s.split(':')) == 2:
                return datetime.strptime(s, '%Y-%m-%d %H:%M')
            return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')
        return datetime.strptime(s, '%Y-%m-%d')
    except Exception:
        return None

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
