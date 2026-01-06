from flask import Blueprint, request
from models import db, User, RedemptionCode
from utils import login_required, success_response, error_response
from datetime import datetime, timedelta
import uuid

redemption_bp = Blueprint('redemption', __name__, url_prefix='/api/redemption')

@redemption_bp.route('/codes', methods=['POST'])
@login_required
def create_codes():
    """批量创建兑换码（仅管理员）"""
    try:
        user = request.current_user
        if user.role != 'super_admin':
            return error_response('无权限', 403)
            
        data = request.get_json() or {}
        count = int(data.get('count', 1))
        tier = data.get('tier', 'pro')
        duration_days = int(data.get('duration_days', 30))
        
        if count < 1 or count > 100:
            return error_response('单次创建数量限制为 1-100')
            
        created_codes = []
        for _ in range(count):
            code_str = uuid.uuid4().hex[:8].upper()
            # 确保唯一性
            while RedemptionCode.query.filter_by(code=code_str).first():
                code_str = uuid.uuid4().hex[:8].upper()
                
            new_code = RedemptionCode(
                code=code_str,
                tier=tier,
                duration_days=duration_days,
                status='active',
                created_by_user_id=user.id
            )
            db.session.add(new_code)
            created_codes.append(code_str)
            
        db.session.commit()
        
        return success_response({
            'count': len(created_codes),
            'codes': created_codes
        }, '创建成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建失败: {str(e)}')

@redemption_bp.route('/codes', methods=['GET'])
@login_required
def list_codes():
    """获取兑换码列表（仅管理员）"""
    try:
        user = request.current_user
        if user.role != 'super_admin':
            return error_response('无权限', 403)
            
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = RedemptionCode.query.order_by(RedemptionCode.created_at.desc())
        
        if status and status != 'all':
            query = query.filter_by(status=status)
            
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        items = []
        for item in pagination.items:
            items.append({
                'id': item.id,
                'code': item.code,
                'tier': item.tier,
                'duration_days': item.duration_days,
                'status': item.status,
                'created_at': item.created_at.isoformat() if item.created_at else None,
                'used_at': item.used_at.isoformat() if item.used_at else None,
                'used_by_user_id': item.used_by_user_id
            })
            
        return success_response({
            'items': items,
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total
        })
        
    except Exception as e:
        return error_response(f'获取列表失败: {str(e)}')

@redemption_bp.route('/redeem', methods=['POST'])
@login_required
def redeem_code():
    """核销兑换码"""
    try:
        user = request.current_user
        data = request.get_json() or {}
        code_str = (data.get('code') or '').strip().upper()
        
        if not code_str:
            return error_response('请输入兑换码')
            
        code_record = RedemptionCode.query.filter_by(code=code_str).first()
        
        if not code_record:
            return error_response('兑换码无效')
            
        if code_record.status != 'active':
            return error_response('兑换码已被使用或已过期')
            
        # 激活会员逻辑
        now = datetime.utcnow()
        
        # 1. 更新用户会员状态
        # 如果当前已经是会员且未过期，在原过期时间基础上顺延
        # 如果不是会员或已过期，从现在开始计算
        if user.subscription_tier == code_record.tier and user.subscription_expire_at and user.subscription_expire_at > now:
            new_expire_at = user.subscription_expire_at + timedelta(days=code_record.duration_days)
        else:
            new_expire_at = now + timedelta(days=code_record.duration_days)
            # 如果是不同等级，可能需要考虑降级/升级策略，这里简化为直接覆盖为新等级
            user.subscription_tier = code_record.tier
            
        user.subscription_expire_at = new_expire_at
        
        # 2. 更新兑换码状态
        code_record.status = 'used'
        code_record.used_at = now
        code_record.used_by_user_id = user.id
        
        db.session.commit()
        
        # 计划标签
        dd = int(code_record.duration_days or 0)
        if dd >= 36500:
            plan_label = '永久会员'
        elif dd >= 365:
            plan_label = '年卡会员'
        elif dd >= 30:
            plan_label = '月卡会员'
        else:
            plan_label = f'{dd}天会员'

        return success_response({
            'tier': user.subscription_tier,
            'expire_at': user.subscription_expire_at.isoformat(),
            'duration_days': dd,
            'plan_label': plan_label,
            'message': f'成功兑换 {code_record.duration_days} 天 {code_record.tier.upper()} 会员'
        }, '兑换成功')
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'兑换失败: {str(e)}')

@redemption_bp.route('/codes/<key>', methods=['DELETE'])
@login_required
def delete_code(key):
    try:
        user = request.current_user
        if user.role != 'super_admin':
            return error_response('无权限', 403)

        k = (key or '').strip()
        record = None
        if k.isdigit():
            record = RedemptionCode.query.get(int(k))
        else:
            record = RedemptionCode.query.filter_by(code=k.upper()).first()

        if not record:
            return error_response('兑换码不存在', 404)

        data = { 'id': record.id, 'code': record.code }
        db.session.delete(record)
        db.session.commit()
        return success_response(data, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除失败: {str(e)}')
