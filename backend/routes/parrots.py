from flask import Blueprint, request, jsonify
from models import db, Parrot, ParrotSpecies, User, ParrotTransferCode
from schemas import parrot_schema, parrots_schema, parrot_species_list_schema
from utils import login_required, success_response, error_response, paginate_query, save_uploaded_file
from team_utils import parrot_access_required
from team_mode_utils import get_accessible_parrot_ids_by_mode
from datetime import datetime, date
import json
import random
import string

parrots_bp = Blueprint('parrots', __name__, url_prefix='/api/parrots')

@parrots_bp.route('/species', methods=['GET'])
def get_species():
    """获取鹦鹉品种列表（游客模式可访问）"""
    try:
        species = ParrotSpecies.query.all()
        return success_response(parrot_species_list_schema.dump(species))
    except Exception as e:
        return error_response(f'获取品种列表失败: {str(e)}')

@parrots_bp.route('/species', methods=['POST'])
@login_required
def create_species():
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return error_response('品种名称不能为空')
        care_level = data.get('care_level') or 'medium'
        if care_level not in ['easy', 'medium', 'hard']:
            return error_response('养护难度取值无效')
        avg_lifespan_min = data.get('avg_lifespan_min')
        avg_lifespan_max = data.get('avg_lifespan_max')
        avg_size_min_cm = data.get('avg_size_min_cm')
        avg_size_max_cm = data.get('avg_size_max_cm')
        reference_weight_min_g = data.get('reference_weight_min_g')
        reference_weight_max_g = data.get('reference_weight_max_g')
        species = ParrotSpecies(
            name=name,
            description=data.get('description'),
            avg_lifespan_min=avg_lifespan_min,
            avg_lifespan_max=avg_lifespan_max,
            avg_size_min_cm=avg_size_min_cm,
            avg_size_max_cm=avg_size_max_cm,
            care_level=care_level,
            reference_weight_g=data.get('reference_weight_g'),
            reference_weight_min_g=reference_weight_min_g,
            reference_weight_max_g=reference_weight_max_g,
            plumage_json=data.get('plumage_json') or data.get('plumage')
        )
        db.session.add(species)
        db.session.commit()
        from schemas import ParrotSpeciesSchema
        return success_response(ParrotSpeciesSchema().dump(species), '创建成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'创建品种失败: {str(e)}')

@parrots_bp.route('/species/<int:species_id>', methods=['PUT'])
@login_required
def update_species(species_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        species = ParrotSpecies.query.get(species_id)
        if not species:
            return error_response('品种不存在', 404)
        data = request.get_json() or {}
        if 'name' in data:
            name = (data.get('name') or '').strip()
            if not name:
                return error_response('品种名称不能为空')
            species.name = name
        if 'description' in data:
            species.description = data.get('description')
        if 'avg_lifespan_min' in data:
            species.avg_lifespan_min = data.get('avg_lifespan_min')
        if 'avg_lifespan_max' in data:
            species.avg_lifespan_max = data.get('avg_lifespan_max')
        if 'avg_size_min_cm' in data:
            species.avg_size_min_cm = data.get('avg_size_min_cm')
        if 'avg_size_max_cm' in data:
            species.avg_size_max_cm = data.get('avg_size_max_cm')
        if 'care_level' in data:
            care_level = data.get('care_level') or 'medium'
            if care_level not in ['easy', 'medium', 'hard']:
                return error_response('养护难度取值无效')
            species.care_level = care_level
        if 'reference_weight_g' in data:
            species.reference_weight_g = data.get('reference_weight_g')
        if 'reference_weight_min_g' in data:
            species.reference_weight_min_g = data.get('reference_weight_min_g')
        if 'reference_weight_max_g' in data:
            species.reference_weight_max_g = data.get('reference_weight_max_g')
        if 'plumage_json' in data or 'plumage' in data:
            species.plumage_json = data.get('plumage_json') or data.get('plumage')
        db.session.commit()
        from schemas import ParrotSpeciesSchema
        return success_response(ParrotSpeciesSchema().dump(species), '更新成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'更新品种失败: {str(e)}')

@parrots_bp.route('/species/<int:species_id>', methods=['DELETE'])
@login_required
def delete_species(species_id):
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限', 403)
        species = ParrotSpecies.query.get(species_id)
        if not species:
            return error_response('品种不存在', 404)
        # 保护：若有鹦鹉引用该品种，禁止删除
        has_parrots = Parrot.query.filter_by(species_id=species_id).first()
        if has_parrots:
            return error_response('存在引用该品种的鹦鹉，不可删除')
        db.session.delete(species)
        db.session.commit()
        return success_response({'id': species_id}, '已删除')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除品种失败: {str(e)}')

@parrots_bp.route('', methods=['GET'])
@login_required
def get_parrots():
    """获取用户可访问的鹦鹉列表（基于团队模式过滤）"""
    try:
        user = request.current_user
        page = request.args.get('page', 1, type=int)

        # 兼容旧参数：前端有的地方使用 limit 表示每页数量
        per_page = request.args.get('per_page', type=int)
        if per_page is None:
            per_page = request.args.get('limit', 20, type=int)
        if not per_page:
            per_page = 20
        
        print(f"[DEBUG] 用户 {user.id} 请求鹦鹉列表，页码: {page}, 每页: {per_page}, 模式: {getattr(user, 'user_mode', 'personal')}")
        
        # 使用团队模式过滤逻辑获取可访问的鹦鹉ID
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        
        if not accessible_parrot_ids:
            # 如果没有可访问的鹦鹉，返回空结果
            return success_response({
                'parrots': [],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': 0,
                    'pages': 0
                }
            })
        
        query = Parrot.query.filter(Parrot.id.in_(accessible_parrot_ids))
        
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

        # 性别过滤
        gender = request.args.get('gender')
        if gender:
            query = query.filter_by(gender=gender)
            print(f"[DEBUG] 应用性别过滤: {gender}")
        
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
@parrot_access_required('view')
def get_parrot(parrot_id):
    """获取单个鹦鹉详情"""
    try:
        parrot = request.current_parrot
        return success_response(parrot_schema.dump(parrot))
        
    except Exception as e:
        return error_response(f'获取鹦鹉详情失败: {str(e)}')

@parrots_bp.route('', methods=['POST'])
@login_required
def create_parrot():
    """添加新鹦鹉"""
    try:
        user = request.current_user
        
        # 在团队模式下，只有管理员才能添加鹦鹉
        if hasattr(user, 'user_mode') and user.user_mode == 'team':
            if not user.current_team_id:
                return error_response('请先选择团队', 400)
            
            # 检查用户是否是团队管理员
            from team_models import TeamMember
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id, 
                user_id=user.id, 
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin', 'member']:
                return error_response('只有团队成员才能添加鹦鹉', 403)
        
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
        
        # 处理体重字段，空字符串转换为None
        weight = data.get('weight')
        if weight == '' or weight is None:
            weight = None
        
        parrot = Parrot(
            user_id=user.id,
            name=data['name'],
            species_id=species_id,
            gender=data.get('gender', 'unknown'),
            birth_date=birth_date,
            acquisition_date=acquisition_date,
            color=data.get('color'),
            birth_place=data.get('birth_place'),
            birth_place_province=data.get('birth_place_province'),
            birth_place_city=data.get('birth_place_city'),
            birth_place_county=data.get('birth_place_county'),
            plumage_splits_json=(json.dumps(data.get('plumage_split_ids')) if isinstance(data.get('plumage_split_ids'), list) else None),
            weight=weight,
            health_status=data.get('health_status', 'healthy'),
            photo_url=data.get('photo_url'),
            avatar_url=data.get('avatar_url'),
            notes=data.get('notes'),
            parrot_number=data.get('parrot_number'),
            ring_number=data.get('ring_number'),
            team_id=user.current_team_id if user.user_mode == 'team' else None  # 根据用户当前模式设置团队标识
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
        from team_models import TeamMember
        
        user = request.current_user
        
        # 在团队模式下，检查用户是否为管理员
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()
            
            if not member or member.role not in ['owner', 'admin', 'member']:
                return error_response('只有团队成员才能修改鹦鹉信息', 403)
        
        # 使用团队模式过滤逻辑检查访问权限
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        if parrot_id not in accessible_parrot_ids:
            return error_response('鹦鹉不存在或无权限访问', 404)
        
        parrot = Parrot.query.filter_by(id=parrot_id).first()
        
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
        if 'birth_place' in data:
            parrot.birth_place = data.get('birth_place')
        if 'birth_place_province' in data:
            parrot.birth_place_province = data.get('birth_place_province')
        if 'birth_place_city' in data:
            parrot.birth_place_city = data.get('birth_place_city')
        if 'birth_place_county' in data:
            parrot.birth_place_county = data.get('birth_place_county')
        if 'plumage_split_ids' in data:
            try:
                ids = data.get('plumage_split_ids')
                parrot.plumage_splits_json = json.dumps(ids if isinstance(ids, list) else [])
            except Exception:
                parrot.plumage_splits_json = None
        if 'weight' in data:
            weight = data['weight']
            if weight == '' or weight is None:
                parrot.weight = None
            else:
                parrot.weight = weight
        if 'health_status' in data:
            parrot.health_status = data['health_status']
        if 'photo_url' in data:
            # 空字符串表示清空照片
            parrot.photo_url = None if (data['photo_url'] == '' or data['photo_url'] is None) else data['photo_url']
        if 'avatar_url' in data:
            parrot.avatar_url = data['avatar_url']
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

@parrots_bp.route('/<int:parrot_id>/transfer', methods=['POST'])
@login_required
def transfer_parrot(parrot_id):
    """鹦鹉过户：仅当前拥有者可执行，将鹦鹉转移给新主人
    支持通过 target_user_id / target_openid / target_username / target_phone 指定新主人
    
    变更内容：
    - 更新 Parrot.user_id 为新主人
    - 根据新主人的当前团队，更新 Parrot.team_id（个人模式为 None，团队模式为 current_team_id）
    - 取消所有 TeamParrot 分享记录（置为不激活），避免旧团队继续访问
    - 将与该鹦鹉相关的提醒（Reminder）转移到新主人名下，并同步提醒的 team_id
    """
    try:
        from team_models import TeamParrot
        from models import Reminder

        user = request.current_user

        # 仅允许当前拥有者执行
        parrot = Parrot.query.filter_by(id=parrot_id, is_active=True).first()
        if not parrot:
            return error_response('鹦鹉不存在或已被删除', 404)
        if parrot.user_id != user.id:
            return error_response('只有当前主人可以执行过户', 403)

        data = request.get_json() or {}
        target_user = None

        # 优先级：id > openid > username > phone
        target_user_id = data.get('target_user_id')
        target_openid = data.get('target_openid')
        target_username = data.get('target_username')
        target_phone = data.get('target_phone')

        if target_user_id:
            target_user = User.query.filter_by(id=target_user_id).first()
        elif target_openid:
            target_user = User.query.filter_by(openid=target_openid).first()
        elif target_username:
            target_user = User.query.filter_by(username=target_username).first()
        elif target_phone:
            target_user = User.query.filter_by(phone=target_phone).first()

        if not target_user:
            return error_response('未找到目标用户，请检查输入信息', 404)

        if target_user.id == parrot.user_id:
            return error_response('目标用户已是该鹦鹉的主人，无需过户')

        # 执行过户
        parrot.user_id = target_user.id

        # 根据目标用户模式更新团队标识
        if hasattr(target_user, 'user_mode') and target_user.user_mode == 'team' and target_user.current_team_id:
            parrot.team_id = target_user.current_team_id
        else:
            parrot.team_id = None

        # 取消所有团队分享记录
        TeamParrot.query.filter_by(parrot_id=parrot.id).update({TeamParrot.is_active: False})

        # 将提醒转移到新主人名下
        Reminder.query.filter_by(parrot_id=parrot.id).update({
            Reminder.user_id: target_user.id,
            Reminder.team_id: parrot.team_id
        })

        db.session.commit()

        return success_response(parrot_schema.dump(parrot), '过户成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'过户失败: {str(e)}')

# 生成随机过户码（8位，大写字母与数字）
def _generate_transfer_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(random.choices(alphabet, k=length))

@parrots_bp.route('/<int:parrot_id>/transfer/code', methods=['POST'])
@login_required
def generate_transfer_code(parrot_id):
    """生成一次性过户码：仅当前主人可生成
    返回 { code }
    """
    try:
        user = request.current_user
        parrot = Parrot.query.filter_by(id=parrot_id, is_active=True).first()
        if not parrot:
            return error_response('鹦鹉不存在或已被删除', 404)
        if parrot.user_id != user.id:
            return error_response('只有当前主人可以生成过户码', 403)

        # 生成唯一过户码
        code = _generate_transfer_code()
        # 确保唯一性，最多尝试5次
        attempts = 0
        while ParrotTransferCode.query.filter_by(code=code).first() and attempts < 5:
            code = _generate_transfer_code()
            attempts += 1
        if ParrotTransferCode.query.filter_by(code=code).first():
            return error_response('生成过户码失败，请重试')

        ptc = ParrotTransferCode(
            parrot_id=parrot.id,
            code=code,
            created_by_user_id=user.id
        )
        db.session.add(ptc)
        db.session.commit()

        return success_response({ 'code': code }, '过户码已生成')
    except Exception as e:
        db.session.rollback()
        return error_response(f'生成过户码失败: {str(e)}')

@parrots_bp.route('/transfer/claim', methods=['POST'])
@login_required
def claim_parrot_by_code():
    """通过一次性过户码认领鹦鹉，成功后完成过户并失效过户码"""
    try:
        from team_models import TeamParrot
        from models import Reminder

        user = request.current_user
        data = request.get_json() or {}
        code = data.get('code')
        if not code:
            return error_response('请提供过户码')

        ptc = ParrotTransferCode.query.filter_by(code=code).first()
        if not ptc:
            return error_response('过户码不存在', 404)
        if ptc.used:
            return error_response('过户码已被使用', 400)

        parrot = Parrot.query.filter_by(id=ptc.parrot_id, is_active=True).first()
        if not parrot:
            return error_response('对应鹦鹉不存在或已被删除', 404)

        if parrot.user_id == user.id:
            return error_response('您已是该鹦鹉的主人，无需认领')

        # 执行过户
        parrot.user_id = user.id
        # 认领成功后，将入住/获得日期更新为认领当天
        parrot.acquisition_date = date.today()
        # 根据当前用户模式更新团队标识
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            parrot.team_id = user.current_team_id
        else:
            parrot.team_id = None

        # 取消所有团队分享记录
        TeamParrot.query.filter_by(parrot_id=parrot.id).update({TeamParrot.is_active: False})

        # 将提醒转移到新主人名下
        Reminder.query.filter_by(parrot_id=parrot.id).update({
            Reminder.user_id: user.id,
            Reminder.team_id: parrot.team_id
        })

        # 标记过户码已使用
        ptc.used = True
        ptc.used_by_user_id = user.id
        ptc.used_at = datetime.utcnow()

        db.session.commit()

        return success_response(parrot_schema.dump(parrot), '认领成功，过户已完成')
    except Exception as e:
        db.session.rollback()
        return error_response(f'认领失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>', methods=['DELETE'])
@login_required
def delete_parrot(parrot_id):
    """删除鹦鹉（软删除：仅标记，不物理删除）"""
    try:
        from team_models import TeamMember
        user = request.current_user

        # 团队模式下权限校验
        if hasattr(user, 'user_mode') and user.user_mode == 'team' and user.current_team_id:
            member = TeamMember.query.filter_by(
                team_id=user.current_team_id,
                user_id=user.id,
                is_active=True
            ).first()
            if not member or member.role not in ['owner', 'admin', 'member']:
                return error_response('只有团队成员才能删除鹦鹉', 403)

        # 访问权限校验
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        if parrot_id not in accessible_parrot_ids:
            return error_response('鹦鹉不存在或无权限访问', 404)

        parrot = Parrot.query.filter_by(id=parrot_id).first()
        if not parrot:
            return error_response('鹦鹉不存在', 404)

        # 软删除：仅将 is_active 置为 False
        parrot.is_active = False
        db.session.commit()

        return success_response({'id': parrot_id}, '已标记删除')

    except Exception as e:
        db.session.rollback()
        return error_response(f'删除鹦鹉失败: {str(e)}')

@parrots_bp.route('/<int:parrot_id>/statistics', methods=['GET'])
@login_required
@parrot_access_required('view')
def get_parrot_statistics(parrot_id):
    """获取鹦鹉统计数据"""
    try:
        from models import FeedingRecord, HealthRecord, CleaningRecord
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        parrot = request.current_parrot
        
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
@parrot_access_required('view')
def get_parrot_records(parrot_id):
    """获取单个鹦鹉的记录列表"""
    try:
        from models import FeedingRecord, HealthRecord, CleaningRecord
        from schemas import feeding_records_schema, health_records_schema, cleaning_records_schema
        
        parrot = request.current_parrot
        
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
        
        # 使用团队模式过滤逻辑检查访问权限
        accessible_parrot_ids = get_accessible_parrot_ids_by_mode(user)
        if parrot_id not in accessible_parrot_ids:
            return error_response('鹦鹉不存在或无权限访问', 404)
        
        parrot = Parrot.query.filter_by(id=parrot_id).first()
        
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
