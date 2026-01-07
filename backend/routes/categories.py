from flask import Blueprint, request, jsonify
from models import db, TransactionCategory, FeedType
from utils import login_required, success_response, error_response
from sqlalchemy import or_, text

categories_bp = Blueprint('categories', __name__, url_prefix='/api/categories')

# ================= Transaction Categories =================

@categories_bp.route('/transactions', methods=['GET'])
@login_required
def get_transaction_categories():
    user = request.current_user
    type_filter = request.args.get('type') # 'expense' or 'income'
    
    query = TransactionCategory.query.filter(
        or_(
            TransactionCategory.user_id == None,
            TransactionCategory.user_id == user.id
        )
    )
    
    if type_filter:
        query = query.filter(TransactionCategory.type == type_filter)
        
    categories = query.filter(TransactionCategory.is_active == True).all()
    
    result = []
    for cat in categories:
        result.append({
            'id': cat.id,
            'name': cat.name,
            'type': cat.type,
            'icon': cat.icon,
            'is_custom': cat.user_id is not None
        })
        
    return success_response(result)

@categories_bp.route('/transactions', methods=['POST'])
@login_required
def add_transaction_category():
    user = request.current_user
    if getattr(user, 'user_mode', 'personal') == 'team':
        tid = getattr(user, 'current_team_id', None)
        if not tid:
            return error_response('请先选择团队', 400)
        from team_models import TeamMember
        member = TeamMember.query.filter_by(team_id=tid, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('只有团队成员可以管理类别', 403)
        if member.role not in ['owner', 'admin']:
            from team_utils import compute_effective_permissions
            perms = compute_effective_permissions(tid, user.id)
            if not (perms.get('finance.category.manage') or perms.get('all')):
                return error_response('无权限管理收支类别', 403)
    data = request.get_json()
    
    name = data.get('name')
    cat_type = data.get('type')
    icon = data.get('icon')
    
    if not name or not cat_type:
        return error_response('Name and type are required')
        
    if cat_type not in ['expense', 'income']:
        return error_response('Invalid type')
        
    # Check duplicate for this user
    existing = TransactionCategory.query.filter_by(user_id=user.id, name=name, type=cat_type).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.session.commit()
            return success_response({'id': existing.id}, 'Category restored')
        return error_response('Category already exists')
        
    new_cat = TransactionCategory(
        user_id=user.id,
        name=name,
        type=cat_type,
        icon=icon
    )
    db.session.add(new_cat)
    db.session.commit()
    
    return success_response({'id': new_cat.id}, 'Category added')

@categories_bp.route('/transactions/<int:id>', methods=['DELETE'])
@login_required
def delete_transaction_category(id):
    user = request.current_user
    if getattr(user, 'user_mode', 'personal') == 'team':
        tid = getattr(user, 'current_team_id', None)
        if not tid:
            return error_response('请先选择团队', 400)
        from team_models import TeamMember
        member = TeamMember.query.filter_by(team_id=tid, user_id=user.id, is_active=True).first()
        if not member:
            return error_response('只有团队成员可以管理类别', 403)
        if member.role not in ['owner', 'admin']:
            from team_utils import compute_effective_permissions
            perms = compute_effective_permissions(tid, user.id)
            if not (perms.get('finance.category.manage') or perms.get('all')):
                return error_response('无权限管理收支类别', 403)
    cat = TransactionCategory.query.filter_by(id=id, user_id=user.id).first()
    
    if not cat:
        return error_response('Category not found or not authorized')
        
    # Soft delete
    cat.is_active = False
    db.session.commit()
    return success_response(None, 'Category deleted')

# ================= Feed Types =================

@categories_bp.route('/feed-types', methods=['GET'])
@login_required
def get_feed_types():
    user = request.current_user
    
    query = FeedType.query.filter(
        or_(
            FeedType.user_id == None,
            FeedType.user_id == user.id
        )
    )
    
    try:
        feed_types = query.all()
        result = []
        for ft in feed_types:
            result.append({
                'id': ft.id,
                'name': ft.name,
                'type': ft.type,
                'price': float(ft.price) if ft.price else None,
                'unit': getattr(ft, 'unit', 'g') or 'g',
                'is_custom': ft.user_id is not None
            })
        return success_response(result)
    except Exception as e:
        try:
            rows = db.session.execute(text("SELECT id, name, type, price, user_id, unit FROM feed_types")).fetchall()
            result = []
            for r in rows:
                rid, name, ftype, price, user_id, unit = r[0], r[1], r[2], r[3], r[4], r[5]
                result.append({
                    'id': rid,
                    'name': name,
                    'type': ftype,
                    'price': float(price) if price is not None else None,
                    'unit': unit or 'g',
                    'is_custom': user_id is not None
                })
            return success_response(result)
        except Exception as e2:
            return error_response(f'获取食物类型失败: {str(e)}', 500)

@categories_bp.route('/feed-types', methods=['POST'])
@login_required
def add_feed_type():
    user = request.current_user
    data = request.get_json()
    
    name = data.get('name')
    feed_type_enum = data.get('type') # seed, pellet, etc.
    price = data.get('price')
    unit = data.get('unit') or 'g'
    if unit not in ['g', 'ml']:
        unit = 'g'
    
    if not name:
        return error_response('Name is required')
        
    try:
        new_ft = FeedType(
            user_id=user.id,
            name=name,
            type=feed_type_enum,
            price=price,
            unit=unit
        )
        db.session.add(new_ft)
        db.session.commit()
        return success_response({'id': new_ft.id}, 'Feed type added')
    except Exception as e:
        db.session.rollback()
        try:
            db.session.execute(
                text("INSERT INTO feed_types (user_id, name, type, price, unit) VALUES (:uid, :name, :type, :price, :unit)"),
                { 'uid': user.id, 'name': name, 'type': feed_type_enum, 'price': price, 'unit': unit }
            )
            new_id = db.session.execute(text("SELECT LAST_INSERT_ID()")).scalar()
            db.session.commit()
            return success_response({'id': int(new_id or 0)}, 'Feed type added')
        except Exception as e2:
            return error_response(f'添加失败: {str(e)}', 500)

@categories_bp.route('/feed-types/<int:id>', methods=['PUT'])
@login_required
def update_feed_type(id):
    user = request.current_user
    ft = FeedType.query.filter_by(id=id, user_id=user.id).first()
    if not ft:
        return error_response('Feed type not found or not authorized')
    data = request.get_json() or {}
    name = data.get('name')
    feed_type_enum = data.get('type')
    price = data.get('price')
    unit = data.get('unit')
    if name is not None:
        ft.name = name
    if feed_type_enum is not None:
        ft.type = feed_type_enum
    if price is not None:
        ft.price = price
    if unit in ['g', 'ml']:
        ft.unit = unit
    try:
        db.session.commit()
        return success_response({'id': ft.id}, 'Feed type updated')
    except Exception as e:
        db.session.rollback()
        try:
            fields = {}
            if name is not None:
                fields['name'] = name
            if feed_type_enum is not None:
                fields['type'] = feed_type_enum
            if price is not None:
                fields['price'] = price
            if not fields:
                return error_response('无可更新字段')
            sets = ", ".join([f"{k} = :{k}" for k in fields.keys()])
            params = { **fields, 'id': id, 'uid': user.id }
            db.session.execute(text(f"UPDATE feed_types SET {sets} WHERE id = :id AND user_id = :uid"), params)
            db.session.commit()
            return success_response({'id': ft.id}, 'Feed type updated')
        except Exception as e2:
            return error_response(f'更新失败: {str(e)}', 500)

@categories_bp.route('/feed-types/<int:id>', methods=['DELETE'])
@login_required
def delete_feed_type(id):
    user = request.current_user
    try:
        ft = FeedType.query.filter_by(id=id, user_id=user.id).first()
        if not ft:
            return error_response('Feed type not found or not authorized')
        try:
            db.session.delete(ft)
            db.session.commit()
            return success_response(None, 'Feed type deleted')
        except Exception:
            db.session.rollback()
            return error_response('Cannot delete this feed type because it is being used.')
    except Exception as e:
        # ORM 加载失败（例如 ENUM 非法值），回退到原生 SQL 删除
        try:
            row = db.session.execute(text("SELECT id, user_id FROM feed_types WHERE id = :id"), { 'id': id }).fetchone()
            if not row:
                return error_response('Feed type not found', 404)
            uid = row[1]
            if int(uid or 0) != int(user.id):
                return error_response('Not authorized to delete this feed type', 403)
            try:
                db.session.execute(text("DELETE FROM feed_types WHERE id = :id AND user_id = :uid"), { 'id': id, 'uid': user.id })
                db.session.commit()
                return success_response(None, 'Feed type deleted')
            except Exception:
                db.session.rollback()
                return error_response('Cannot delete this feed type because it is being used.')
        except Exception as e2:
            return error_response('服务器内部错误', 500)
