from flask import Blueprint, request, jsonify, current_app
from utils import success_response, error_response, login_required, cache_get_json, cache_set_json
from team_mode_utils import get_accessible_parrot_ids_by_mode
from models import Parrot, ParrotSpecies
import os
import json
from datetime import datetime


care_guide_bp = Blueprint('care_guide', __name__, url_prefix='/api/care-guide')


def _get_config_path():
    # 优先使用配置或环境变量指定的路径
    cfg = current_app.config if current_app else {}
    path = (cfg.get('CARE_GUIDE_CONFIG_PATH')
            or os.environ.get('CARE_GUIDE_CONFIG_PATH'))
    if not path:
        # 默认放在 backend/care_guide_config.json
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(backend_dir, 'care_guide_config.json')
    return path


def _ensure_dir(path):
    d = os.path.dirname(path)
    if d and not os.path.exists(d):
        os.makedirs(d, exist_ok=True)


def _default_config():
    # 默认内容：与前端静态文案等价的更结构化版本
    return {
        'title': '护理指南',
        'schema_version': '1.0',
        'sections': [
            {
                'key': 'diet',
                'title': '饮食与营养',
                'items': [
                    {'text': '主食颗粒/配方饲料为主，搭配新鲜蔬果，控制坚果与种子比例。', 'emoji': '🍎'},
                    {'text': '每日更换饮用水，喂食器每日清洗并定期消毒。', 'emoji': '💧'},
                    {'text': '避免巧克力、咖啡因、酒精、洋葱、大蒜、鳄梨等危险食材。', 'emoji': '⚠️'}
                ]
            },
            {
                'key': 'environment',
                'title': '环境与丰富化',
                'items': [
                    {'text': '选择合适尺寸与间距的笼舍，保持通风、避风与日照。', 'emoji': '🏠'},
                    {'text': '每周轮换玩具与栖木材质，减少刻板行为，提升探索乐趣。', 'emoji': '🧸'},
                    {'text': '提供喷雾/浴盆，定期清洁笼舍、食具与栖木。', 'emoji': '🫧'}
                ]
            },
            {
                'key': 'interaction',
                'title': '互动与训练',
                'items': [
                    {'text': '用零食/口令奖励良好行为，避免惩罚与高压训练。', 'emoji': '🏅'},
                    {'text': '每天安排固定的互动时段，维持安全距离与信任建立。', 'emoji': '🤝'},
                    {'text': '从“到手”、“进笼”等基础目标开始，循序渐进。', 'emoji': '🎯'}
                ]
            },
            {
                'key': 'health',
                'title': '健康与监测',
                'items': [
                    {'text': '每周称重并记录趋势，突增/突减需警惕潜在问题。', 'emoji': '⚖️'},
                    {'text': '关注粪便颜色、形态与气味变化，异常及时就医。', 'emoji': '🩺'},
                    {'text': '建议每年完成一次全面体检与必要的筛查。', 'emoji': '📅'}
                ]
            },
            {
                'key': 'emergency',
                'title': '紧急与安全',
                'items': [
                    {'text': '远离热锅、明火、化学清洁剂与开窗户等潜在风险。', 'emoji': '🧯'},
                    {'text': '备好运输笼、急救包与熟悉的宠物医院联系方式。', 'emoji': '🧰'}
                ]
            }
        ],
        'footer_tip': '内容为通用建议，具体健康问题请咨询专业兽医。',
        'updated_at': datetime.utcnow().isoformat()
    }


def _load_config():
    key = 'care_guide_config_v1'
    cached = cache_get_json(key)
    if isinstance(cached, dict):
        return cached
    path = _get_config_path()
    if not os.path.exists(path):
        cfg = _default_config()
        _ensure_dir(path)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
        cache_set_json(key, cfg, 3600)
        return cfg
    try:
        with open(path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            cache_set_json(key, cfg, 3600)
            return cfg
    except Exception:
        cfg = _default_config()
        cache_set_json(key, cfg, 3600)
        return cfg


@care_guide_bp.route('', methods=['GET'])
def get_care_guide():
    cfg = _load_config()
    return success_response(cfg, '获取护理指南成功')


@care_guide_bp.route('', methods=['POST'])
def update_care_guide():
    # 允许两种方式：1）提供有效管理密钥；2）已登录且为超级管理员
    expected_key = (current_app.config.get('CARE_GUIDE_ADMIN_KEY')
                    or os.environ.get('CARE_GUIDE_ADMIN_KEY'))
    admin_key = request.headers.get('X-Admin-Key', '')

    authorized = False
    # 方式一：管理密钥
    if expected_key and admin_key == expected_key:
        authorized = True
    else:
        # 方式二：超级管理员（需要请求头携带 X-OpenID）
        try:
            from models import User
            openid = request.headers.get('X-OpenID')
            user = None
            if openid:
                user = User.query.filter_by(openid=openid).first()
                if not user and openid.startswith('account_'):
                    try:
                        user_id = int(openid.replace('account_', ''))
                        user = User.query.filter_by(id=user_id, login_type='account').first()
                    except ValueError:
                        user = None
            if user and getattr(user, 'role', 'user') == 'super_admin':
                authorized = True
        except Exception:
            authorized = False

    if not authorized:
        return error_response('无权限更新护理指南', 403)

    data = request.get_json() or {}
    if 'sections' not in data or not isinstance(data['sections'], list):
        return error_response('无效的内容结构：需要 sections 数组')

    # 更新元数据
    data['updated_at'] = datetime.utcnow().isoformat()
    if 'title' not in data:
        data['title'] = '护理指南'
    if 'schema_version' not in data:
        data['schema_version'] = '1.0'

    # 写入文件
    path = _get_config_path()
    _ensure_dir(path)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return error_response(f'保存失败：{str(e)}')
    try:
        cache_set_json('care_guide_config_v1', data, 3600)
    except Exception:
        pass

    return success_response({'message': '更新成功', 'config': data}, '更新护理指南成功')


# === 个性化：按品种输出专业建议与知识科普 ===
def _normalize_species_key(name: str | None) -> str:
    if not name:
        return 'unknown'
    n = name.strip().lower()
    # 常见中文/英文别名归一化
    mapping = {
        '虎皮鹦鹉': 'budgerigar', '虎皮': 'budgerigar', 'budgerigar': 'budgerigar', 'budgie': 'budgerigar',
        '玄凤鹦鹉': 'cockatiel', '玄凤': 'cockatiel', 'cockatiel': 'cockatiel',
        '金刚鹦鹉': 'macaw', '金刚': 'macaw', 'macaw': 'macaw',
        '非洲灰鹦鹉': 'african_grey', '非洲灰': 'african_grey', 'african grey': 'african_grey', 'african_grey': 'african_grey',
        '亚马逊鹦鹉': 'amazon', '亚马逊': 'amazon', 'amazon': 'amazon'
    }
    # 英文名全小写匹配
    if n in mapping:
        return mapping[n]
    # 中文包含匹配
    for k, v in mapping.items():
        if k in name:
            return v
    return n.replace(' ', '_')


def _build_species_sections(base_cfg: dict, key: str) -> list:
    # 基于通用内容复制一份作为基础
    sections = json.loads(json.dumps(base_cfg.get('sections', [])))
    # 建立标题索引（中文标题）以便合并
    title_to_idx = {sec.get('title'): i for i, sec in enumerate(sections)}
    # 英文key到中文标题的映射
    key_to_title = {
        'diet': '饮食',
        'environment': '环境',
        'interaction': '互动',
        'health': '健康',
        'emergency': '紧急情况',
    }

    # 追加或替换部分条目
    extra = []
    if key == 'budgerigar':
        extra = [
            {'key': 'diet', 'items': [
                {'text': '以颗粒饲料为主，少量种子作为奖励，避免长期高脂肪种子。', 'emoji': '🌾'},
                {'text': '每日补充新鲜蔬叶如小松菜、菠菜（适量），提供钙源。', 'emoji': '🥬'}
            ]},
            {'key': 'environment', 'items': [
                {'text': '笼条间距建议≤1.2cm，避免逃脱与卡头。', 'emoji': '📏'},
                {'text': '提供沙浴或喷雾浴，保持羽毛清洁。', 'emoji': '🫧'}
            ]}
        ]
    elif key == 'cockatiel':
        extra = [
            {'key': 'diet', 'items': [
                {'text': '注意补钙与维生素D3，繁殖期尤需关注。', 'emoji': '🦴'}
            ]},
            {'key': 'interaction', 'items': [
                {'text': '口哨与模仿训练效果好，以短时高频互动建立信任。', 'emoji': '🎶'}
            ]}
        ]
    elif key == 'macaw':
        extra = [
            {'key': 'environment', 'items': [
                {'text': '提供超大笼舍与坚固栖木，防止啃咬破坏。', 'emoji': '🪵'},
                {'text': '每日安排高强度玩耍与觅食任务，避免无聊与破坏性行为。', 'emoji': '🏋️'}
            ]},
            {'key': 'diet', 'items': [
                {'text': '以配方颗粒为主，搭配多样蔬果与少量坚果，控制总能量。', 'emoji': '🥗'}
            ]}
        ]
    elif key == 'african_grey':
        extra = [
            {'key': 'diet', 'items': [
                {'text': '易低钙：关注钙与D3摄入，适度阳光或UVB灯。', 'emoji': '🌞'}
            ]},
            {'key': 'interaction', 'items': [
                {'text': '智商高需高强度认知丰富化，定期更换解谜玩具。', 'emoji': '🧩'}
            ]}
        ]
    elif key == 'amazon':
        extra = [
            {'key': 'diet', 'items': [
                {'text': '易肥胖：以低脂颗粒与蔬菜为主，坚果严格限量。', 'emoji': '⚖️'}
            ]},
            {'key': 'health', 'items': [
                {'text': '定期称重与记录体脂趋势，适度飞行训练控制体重。', 'emoji': '📈'}
            ]}
        ]

    # 将 extra 按中文标题合并到现有 sections
    if extra:
        for block in extra:
            k = block.get('key')
            items = block.get('items', [])
            cn_title = key_to_title.get(k, k)
            if cn_title in title_to_idx:
                sections[title_to_idx[cn_title]].setdefault('items', []).extend(items)
            else:
                sections.append({ 'title': cn_title, 'items': items })
    return sections


@care_guide_bp.route('/personalized', methods=['GET'])
@login_required
def get_personalized_care_guide():
    """根据用户所养品种返回个性化护理建议与知识科普。
    返回结构：
    {
      title, schema_version,
      species: [{id, name, key}],
      general: { sections: [...] },
      guides: { key: { display_name, sections } },
      updated_at
    }
    """
    try:
        user = request.current_user
        cfg = _load_config()

        # 获取用户可访问的鹦鹉对应品种
        accessible_ids = get_accessible_parrot_ids_by_mode(user)
        if not accessible_ids:
            # 无数据时返回通用内容
            return success_response({
                'title': cfg.get('title', '护理指南'),
                'schema_version': '1.1',
                'species': [],
                'general': { 'sections': cfg.get('sections', []) },
                'guides': {},
                'updated_at': datetime.utcnow().isoformat()
            })

        parrots = Parrot.query.filter(Parrot.id.in_(accessible_ids), Parrot.is_active == True).all()
        species_ids = set([p.species_id for p in parrots if p.species_id])
        species_rows = ParrotSpecies.query.filter(ParrotSpecies.id.in_(species_ids)).all() if species_ids else []

        species_info = []
        guides = {}
        for s in species_rows:
            key = _normalize_species_key(s.name)
            species_info.append({ 'id': s.id, 'name': s.name, 'key': key })
            guides[key] = {
                'display_name': s.name,
                'sections': _build_species_sections(cfg, key)
            }

        # 若无已知映射的品种，仍返回通用内容
        return success_response({
            'title': cfg.get('title', '护理指南'),
            'schema_version': '1.1',
            'species': species_info,
            'general': { 'sections': cfg.get('sections', []) },
            'guides': guides,
            'updated_at': datetime.utcnow().isoformat()
        }, '获取个性化护理指南成功')
    except Exception as e:
        return error_response(f'获取个性化护理指南失败: {str(e)}')
