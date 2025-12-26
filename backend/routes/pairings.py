from flask import Blueprint, request
from models import db, PairingRecord
from utils import login_required, success_response, error_response
import json

pairings_bp = Blueprint('pairings', __name__, url_prefix='/api/pairings')

@pairings_bp.route('', methods=['GET'])
@login_required
def list_pairings():
    try:
        user = request.current_user
        q = PairingRecord.query.filter_by(created_by_user_id=user.id)
        if user.user_mode == 'team':
            q = q.filter(PairingRecord.team_id == user.current_team_id)
        else:
            q = q.filter(PairingRecord.team_id.is_(None))
        q = q.order_by(PairingRecord.created_at.desc())
        from schemas import pairing_records_schema
        return success_response(pairing_records_schema.dump(q.all()), '获取配对记录成功')
    except Exception as e:
        return error_response(f'获取配对记录失败: {str(e)}')

@pairings_bp.route('', methods=['POST'])
@login_required
def create_pairing():
    try:
        user = request.current_user
        data = request.get_json() or {}
        species = str(data.get('species') or '').strip()
        mother_color = str(data.get('motherColor') or data.get('mother_color') or '').strip()
        father_color = str(data.get('fatherColor') or data.get('father_color') or '').strip()
        mother_splits = data.get('motherSplits') or data.get('mother_splits') or []
        father_splits = data.get('fatherSplits') or data.get('father_splits') or []
        results = data.get('results') or []
        expected_avg_price = data.get('expectedAveragePrice') or data.get('expected_average_price')

        if not species:
            return error_response('缺少品种字段')
        if not mother_color or not father_color:
            return error_response('缺少配对颜色信息')

        pr = PairingRecord(
            created_by_user_id=user.id,
            species=species,
            mother_color=mother_color,
            father_color=father_color,
            mother_splits_json=json.dumps(mother_splits, ensure_ascii=False),
            father_splits_json=json.dumps(father_splits, ensure_ascii=False),
            results_json=json.dumps(results, ensure_ascii=False),
            expected_average_price=expected_avg_price if expected_avg_price is not None else None,
            team_id=(user.current_team_id if user.user_mode == 'team' else None)
        )
        db.session.add(pr)
        db.session.commit()

        from schemas import pairing_record_schema
        return success_response(pairing_record_schema.dump(pr), '保存配对记录成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'保存配对记录失败: {str(e)}')

@pairings_bp.route('/<int:record_id>', methods=['DELETE'])
@login_required
def delete_pairing(record_id):
    try:
        user = request.current_user
        q = PairingRecord.query.filter(PairingRecord.id == record_id, PairingRecord.created_by_user_id == user.id)
        if user.user_mode == 'team':
            q = q.filter(PairingRecord.team_id == user.current_team_id)
        else:
            q = q.filter(PairingRecord.team_id.is_(None))
        pr = q.first()
        if not pr:
            return error_response('记录不存在或无权限')
        db.session.delete(pr)
        db.session.commit()
        return success_response({'id': record_id}, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')

@pairings_bp.route('', methods=['DELETE'])
@login_required
def clear_pairings():
    try:
        user = request.current_user
        q = PairingRecord.query.filter(PairingRecord.created_by_user_id == user.id)
        if user.user_mode == 'team':
            q = q.filter(PairingRecord.team_id == user.current_team_id)
        else:
            q = q.filter(PairingRecord.team_id.is_(None))
        deleted = q.delete()
        db.session.commit()
        return success_response({'deleted': deleted}, '已清空')
    except Exception as e:
        db.session.rollback()
        return error_response(f'清空失败: {str(e)}')
