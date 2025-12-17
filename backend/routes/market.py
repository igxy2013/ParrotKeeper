from flask import Blueprint, request
from models import db, MarketPrice
from utils import login_required, success_response, error_response

market_bp = Blueprint('market', __name__, url_prefix='/api/market')

@market_bp.route('/prices', methods=['GET'])
@login_required
def get_prices():
    try:
        species = (request.args.get('species') or '').strip()
        gender = (request.args.get('gender') or '').strip()
        query = MarketPrice.query
        if species:
            query = query.filter(MarketPrice.species == species)
        if gender in ('male', 'female'):
            query = query.filter(MarketPrice.gender == gender)
        items = query.order_by(MarketPrice.color_name.asc()).all()
        data = [
            {
                'id': it.id,
                'species': it.species,
                'color_name': it.color_name,
                'gender': it.gender,
                'currency': it.currency,
                'reference_price': float(it.reference_price or 0),
                'updated_at': it.updated_at.isoformat() if it.updated_at else None,
                'source': it.source or ''
            }
            for it in items
        ]
        return success_response({'prices': data})
    except Exception as e:
        return error_response(f'获取市场价格失败: {str(e)}')

@market_bp.route('/prices', methods=['POST'])
@login_required
def create_price():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        data = request.get_json() or {}
        species = (data.get('species') or '').strip()
        color_name = (data.get('color_name') or '').strip()
        gender = (data.get('gender') or '').strip()
        currency = (data.get('currency') or 'CNY').strip()
        reference_price = data.get('reference_price')
        source = (data.get('source') or '').strip()
        if not species or not color_name or reference_price is None:
            return error_response('参数不完整')
        item = MarketPrice(
            species=species,
            color_name=color_name,
            gender=gender if gender in ('male', 'female') else None,
            currency=currency,
            reference_price=reference_price,
            source=source
        )
        db.session.add(item)
        db.session.commit()
        return success_response({'id': item.id}, '创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')

@market_bp.route('/prices/<int:price_id>', methods=['PUT'])
@login_required
def update_price(price_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        item = MarketPrice.query.get(price_id)
        if not item:
            return error_response('记录不存在', 404)
        data = request.get_json() or {}
        if 'species' in data:
            item.species = (data.get('species') or '').strip()
        if 'color_name' in data:
            item.color_name = (data.get('color_name') or '').strip()
        if 'gender' in data:
            g = (data.get('gender') or '').strip()
            item.gender = g if g in ('male', 'female') else None
        if 'currency' in data:
            item.currency = (data.get('currency') or 'CNY').strip()
        if 'reference_price' in data:
            item.reference_price = data.get('reference_price')
        if 'source' in data:
            item.source = (data.get('source') or '').strip()
        db.session.commit()
        return success_response({'id': item.id}, '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新失败: {str(e)}')

@market_bp.route('/prices/<int:price_id>', methods=['DELETE'])
@login_required
def delete_price(price_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        item = MarketPrice.query.get(price_id)
        if not item:
            return error_response('记录不存在', 404)
        db.session.delete(item)
        db.session.commit()
        return success_response({'id': price_id}, '已删除')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')
