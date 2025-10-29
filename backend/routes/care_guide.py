from flask import Blueprint, request, jsonify, current_app
from utils import success_response, error_response
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
    path = _get_config_path()
    if not os.path.exists(path):
        # 初次写入默认文件，便于后续动态更新
        cfg = _default_config()
        _ensure_dir(path)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
        except Exception as e:
            # 若写入失败，仍返回内存中的默认配置
            pass
        return cfg
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        # 读取失败时降级为默认配置
        return _default_config()


@care_guide_bp.route('', methods=['GET'])
def get_care_guide():
    cfg = _load_config()
    return success_response(cfg, '获取护理指南成功')


@care_guide_bp.route('', methods=['POST'])
def update_care_guide():
    # 简单安全控制：需要提供管理密钥
    expected_key = (current_app.config.get('CARE_GUIDE_ADMIN_KEY')
                    or os.environ.get('CARE_GUIDE_ADMIN_KEY'))
    admin_key = request.headers.get('X-Admin-Key', '')
    if not expected_key or admin_key != expected_key:
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

    return success_response({'message': '更新成功', 'config': data}, '更新护理指南成功')

