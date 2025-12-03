from flask import Blueprint, request, current_app
from utils import login_required, success_response, error_response, cache_get_json, cache_set_json
from models import db, Parrot, ParrotSpecies, FeedingRecord, HealthRecord, CleaningRecord, UserSetting
from datetime import datetime, timedelta, date
from team_mode_utils import get_accessible_parrot_ids_by_mode
from sqlalchemy import func
import os
import json
import re
import traceback

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


def _detect_record_type(text: str, default_type: str = None) -> str:
    """根据文本关键词检测记录类型。
    优先关键词匹配；若无匹配，则回退到默认类型或清洁。
    """
    t = text.lower()

    # 喂食相关关键词（覆盖更广的表达）
    feeding_kw = ['喂食', '喂饭', '投喂', '喂', '吃', '食', '饲料', '奶粉', '泡奶', '喝奶']
    # 清洁相关关键词
    cleaning_kw = ['清洁', '清理', '清笼', '打扫', '消毒', '擦拭', '换水']
    # 健康相关关键词
    health_kw = ['健康', '检查', '体重', '称重', '精神', '便便']
    # 繁殖相关关键词
    breeding_kw = ['繁殖', '交配', '产蛋', '孵化']

    if any(k in text for k in feeding_kw) or any(k in t for k in feeding_kw):
        return 'feeding'
    if any(k in text for k in cleaning_kw) or any(k in t for k in cleaning_kw):
        return 'cleaning'
    if any(k in text for k in health_kw) or any(k in t for k in health_kw):
        return 'health'
    if any(k in text for k in breeding_kw) or any(k in t for k in breeding_kw):
        return 'breeding'

    # 未匹配关键词时回退默认类型
    if default_type in ('feeding', 'cleaning', 'health', 'breeding'):
        return default_type
    return default_type or 'cleaning'


def _parse_date_time(text: str) -> tuple[str, str, float]:
    """返回 (record_date: YYYY-MM-DD, record_time: HH:MM) 与时间解析置信度"""
    now = datetime.now()
    base_date = now.date()
    confidence = 0.2

    # 日期词
    if '今天' in text:
        base_date = now.date(); confidence = max(confidence, 0.5)
    elif '昨天' in text:
        base_date = (now - timedelta(days=1)).date(); confidence = max(confidence, 0.5)
    elif '前天' in text:
        base_date = (now - timedelta(days=2)).date(); confidence = max(confidence, 0.5)
    elif '明天' in text:
        base_date = (now + timedelta(days=1)).date(); confidence = max(confidence, 0.5)

    # 具体日期 YYYY-MM-DD 或 YYYY/MM/DD
    m_date = re.search(r'(20\d{2})[-/](\d{1,2})[-/](\d{1,2})', text)
    if m_date:
        y, m, d = map(int, m_date.groups())
        try:
            base_date = date(y, m, d)
            confidence = max(confidence, 0.7)
        except Exception:
            pass

    # 时间解析
    hh = now.hour
    mm = now.minute

    # 09:30 或 9:05
    m_clock = re.search(r'(\d{1,2}):(\d{2})', text)
    if m_clock:
        hh = int(m_clock.group(1)); mm = int(m_clock.group(2)); confidence = max(confidence, 0.7)
    else:
        # 9点30分 / 9点半 / 9点
        m_cn = re.search(r'(\d{1,2})\s*点(?:\s*(\d{1,2})\s*分)?', text)
        if m_cn:
            hh = int(m_cn.group(1))
            mm = int(m_cn.group(2)) if m_cn.group(2) else 0
            confidence = max(confidence, 0.6)
        elif '点半' in text:
            m_half = re.search(r'(\d{1,2})\s*点半', text)
            if m_half:
                hh = int(m_half.group(1)); mm = 30; confidence = max(confidence, 0.6)

    # 上下午语义
    if any(k in text for k in ['下午', '傍晚', '晚上']):
        if hh < 12:
            hh = (hh + 12) if hh != 12 else hh
            confidence = max(confidence, 0.55)
    elif any(k in text for k in ['上午', '早上', '清晨']):
        if hh >= 12:
            hh = hh - 12
            confidence = max(confidence, 0.55)

    record_date = f"{base_date.year}-{str(base_date.month).zfill(2)}-{str(base_date.day).zfill(2)}"
    record_time = f"{str(hh).zfill(2)}:{str(mm).zfill(2)}"
    return record_date, record_time, confidence


def _get_accessible_parrots_for_user(user):
    try:
        ids = get_accessible_parrot_ids_by_mode(user)
        if not ids:
            return []
        return Parrot.query.filter(Parrot.id.in_(ids)).all()
    except Exception:
        return []


def _match_parrot_ids(text: str, parrots: list[Parrot]) -> list[int]:
    text_simplified = text
    matched = []
    for p in parrots:
        name = (p.name or '').strip()
        if not name:
            continue
        try:
            if name in text_simplified:
                matched.append(p.id)
        except Exception:
            # 防御: 任意编码问题时跳过
            continue
    # 去重
    return list(dict.fromkeys(matched))


def _parse_cleaning(text: str) -> dict:
    """将中文关键词映射到前端清洁类型ID数组与描述"""
    # add-record 页面清洁类型：cage / toys / perches / food_water / disinfection
    mapping = [
        ('cage', ['清笼', '清理笼子', '笼子清洁', '打扫笼子', '清洁笼子', '清理鸟笼']),
        ('toys', ['玩具清洁', '清洁玩具', '刷玩具', '洗玩具']),
        ('perches', ['栖木清洁', '清洁栖木', '擦栖木', '刷栖木']),
        ('food_water', ['换水', '更换饮水', '清洁食盆', '清洁水碗', '食物和水清洁', '洗水碗', '洗食盆']),
        ('disinfection', ['消毒', '消杀'])
    ]
    selected = []
    lowered = text.lower()
    for type_id, keywords in mapping:
        for kw in keywords:
            if kw in text or kw in lowered:
                selected.append(type_id)
                break
    # 若未识别，默认给出一个通用类型以便用户调整
    if not selected and any(k in text for k in ['清洁', '清理', '打扫']):
        selected = ['cage']
    return {
        'cleaning_types': selected,
        'description': text.strip()
    }


def _parse_health(text: str) -> dict:
    """解析健康检查中的体重与健康状态"""
    result = {}
    # 体重: 123g / 123.4 g / 0.12kg
    m_g = re.search(r'(\d{1,3}(?:\.\d{1,2})?)\s*(g|克)\b', text, re.IGNORECASE)
    if m_g:
        result['weight'] = float(m_g.group(1))
    else:
        m_kg = re.search(r'(\d(?:\.\d{1,2})?)\s*(kg|千克)\b', text, re.IGNORECASE)
        if m_kg:
            kg_val = float(m_kg.group(1))
            result['weight'] = round(kg_val * 1000, 2)

    # 健康状态
    if any(k in text for k in ['健康', '正常']):
        result['health_status'] = 'healthy'
    elif any(k in text for k in ['生病', '不适', '异常']):
        result['health_status'] = 'sick'
    elif any(k in text for k in ['康复', '好转']):
        result['health_status'] = 'recovering'
    elif any(k in text for k in ['观察']):
        result['health_status'] = 'observation'
    return result


def _parse_feeding(text: str) -> dict:
    """解析喂食类型与分量。返回按类型的集合与全局分量。
    前端的 feedTypeList 每项包含字段 type: 'seed'|'pellet'|'fruit'|'vegetable'|'supplement'|'milk_powder'
    这里不直接返回具体 ID，而是返回类型列表，由前端据此匹配选择项。
    """
    lowered = text.lower()
    result: dict = {}

    type_keywords = {
        'fruit': ['水果', '苹果', '香蕉', '葡萄', '梨', '橙子', '莓'],
        'vegetable': ['蔬菜', '胡萝卜', '青菜', '玉米', '菜叶', '南瓜'],
        'milk_powder': ['奶粉', '幼鸟奶粉', '泡奶'],
        'pellet': ['颗粒', '配方粮', '饲料颗粒'],
        'seed': ['种子', '谷子', '黍子', '葵花籽'],
        'supplement': ['保健品', '维生素', '钙片', '益生菌']
    }

    selected_types = []
    for t, kws in type_keywords.items():
        for kw in kws:
            if kw in text or kw in lowered:
                selected_types.append(t)
                break
    # 去重
    selected_types = list(dict.fromkeys(selected_types))
    if selected_types:
        result['food_types_by_type'] = selected_types

    # 分量：支持 g/克 与 ml/毫升（常见为固体克重）
    # 说明：\b 在中文场景下对“克奶粉”等不一定命中，这里改用更稳健的结尾判断
    m_g = re.search(r'(\d{1,3}(?:\.\d{1,2})?)\s*(?:g(?![a-z])|克)', text, re.IGNORECASE)
    if m_g:
        try:
            result['amount'] = float(m_g.group(1))
        except Exception:
            pass
    else:
        m_ml = re.search(r'(\d{1,3}(?:\.\d{1,2})?)\s*(?:ml(?![a-z])|毫升)', text, re.IGNORECASE)
        if m_ml:
            try:
                # 毫升直接作为 amount 保留，前端视具体食物类型决定含义
                result['amount'] = float(m_ml.group(1))
            except Exception:
                pass
    return result


@ai_bp.route('/parse-record', methods=['POST'])
@login_required
def parse_record():
    try:
        data = request.get_json(force=True) or {}
        text = str(data.get('text', '')).strip()
        default_type = data.get('default_record_type') or data.get('record_type')
        if not text:
            return error_response('请输入需要解析的自然语言文本')

        user = request.current_user
        record_type = _detect_record_type(text, default_type)
        record_date, record_time, time_conf = _parse_date_time(text)

        # 解析基础字段
        parsed = {
            'record_type': record_type,
            'record_date': record_date,
            'record_time': record_time
        }

        # 尝试匹配鹦鹉名称到ID
        parrots = _get_accessible_parrots_for_user(user)
        matched_ids = _match_parrot_ids(text, parrots)
        if matched_ids:
            parsed['parrot_ids'] = matched_ids

        # 类型特定解析
        if record_type == 'cleaning':
            parsed.update(_parse_cleaning(text))
        elif record_type == 'health':
            parsed.update(_parse_health(text))
        elif record_type == 'feeding':
            parsed.update(_parse_feeding(text))
        # 可扩展 feeding / breeding 的解析在后续迭代加入

        # 置信度估算：根据是否识别到关键字段
        score = time_conf
        if 'parrot_ids' in parsed:
            score += 0.2
        if record_type == 'cleaning' and parsed.get('cleaning_types'):
            score += 0.2
        if record_type == 'health' and (parsed.get('weight') or parsed.get('health_status')):
            score += 0.2
        if record_type == 'feeding' and (parsed.get('food_types_by_type') or parsed.get('amount')):
            score += 0.2
        score = max(0.1, min(0.95, score))

        return success_response({
            'parsed': parsed,
            'confidence': round(score, 2)
        })
    except Exception as e:
        return error_response(f'解析失败: {str(e)}')


# ======================== AI 护理教练 ==========================

def _get_age_days(parrot: Parrot) -> int | None:
    try:
        if parrot.birth_date:
            return (date.today() - parrot.birth_date).days
        return None
    except Exception:
        return None


def _age_category(age_days: int | None) -> str:
    if age_days is None:
        return 'unknown'
    if age_days < 90:
        return 'chick'  # 雏鸟
    if age_days < 365:
        return 'juvenile'  # 幼年
    if age_days < 1825:
        return 'adult'  # 成鸟（约<5年）
    return 'senior'  # 老年


def _season_for_date(d: date | None = None) -> str:
    m = (d or date.today()).month
    if m in (3, 4, 5):
        return 'spring'
    if m in (6, 7, 8):
        return 'summer'
    if m in (9, 10, 11):
        return 'autumn'
    return 'winter'


def _get_care_guide_path() -> str:
    cfg = current_app.config if current_app else {}
    path = (cfg.get('CARE_GUIDE_CONFIG_PATH') or os.environ.get('CARE_GUIDE_CONFIG_PATH'))
    if not path:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(backend_dir, 'care_guide_config.json')
    return path


def _default_care_guide_config():
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
            }
        ],
        'footer_tip': '内容为通用建议，具体健康问题请咨询专业兽医。',
        'updated_at': datetime.utcnow().isoformat()
    }


def _load_care_guide_config() -> dict:
    key = 'care_guide_config_v1'
    cached = cache_get_json(key)
    if isinstance(cached, dict):
        return cached
    path = _get_care_guide_path()
    try:
        if not os.path.exists(path):
            cfg = _default_care_guide_config()
            cache_set_json(key, cfg, 3600)
            return cfg
        with open(path, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            cache_set_json(key, cfg, 3600)
            return cfg
    except Exception:
        cfg = _default_care_guide_config()
        cache_set_json(key, cfg, 3600)
        return cfg


def _default_preferences():
    return {
        'feeding': {
            'min_per_week': 14,
            'max_seed_ratio': 0.3
        },
        'cleaning': {
            'min_per_14d': 2
        },
        'health': {
            'alert_weight_change_pct_14d': 5.0
        },
        'delivery': {
            'subscription_enabled': False,
            'template_id': None,
            'page': 'pages/index/index'
        }
    }


def _load_user_preferences(user) -> dict:
    try:
        team_id = None if getattr(user, 'user_mode', 'personal') == 'personal' else getattr(user, 'current_team_id', None)
        setting = UserSetting.query.filter_by(user_id=user.id, team_id=team_id, key='care_coach_preferences').first()
        prefs = _default_preferences()
        if setting and setting.value:
            try:
                data = json.loads(setting.value)
                if isinstance(data, dict):
                    def merge(a, b):
                        for k, v in b.items():
                            if k not in a:
                                a[k] = v
                            elif isinstance(v, dict) and isinstance(a.get(k), dict):
                                a[k] = merge(a[k], v)
                        return a
                    prefs = merge(data, _default_preferences())
            except Exception:
                pass
        return prefs
    except Exception:
        return _default_preferences()


# ========== LLM 生成建议（可选） ==========
def _get_openai_client():
    """创建 OpenAI 客户端（若环境未配置则返回 None）。
    使用环境变量：OPENAI_API_KEY 或 AI_API_KEY（可选）；OPENAI_BASE_URL 或 AI_BASE_URL（可选）。
    """
    try:
        from openai import OpenAI
        api_key = os.environ.get('OPENAI_API_KEY') or os.environ.get('AI_API_KEY')
        if not api_key:
            return None
        base_url = os.environ.get('OPENAI_BASE_URL') or os.environ.get('AI_BASE_URL')
        if base_url:
            client = OpenAI(api_key=api_key, base_url=base_url)
        else:
            client = OpenAI(api_key=api_key)
        return client
    except Exception:
        return None


def _build_llm_prompt(parrot: Parrot, metrics: dict, knowledge: dict, season: str, age_cat: str) -> tuple[str, str]:
    """构造 LLM 提示词（系统与用户）。
    要求模型输出 JSON，包含一个 advice 数组，每项包含：
    - category: 'diet'|'environment'|'interaction'|'health'
    - suggestion: 简短中文建议
    - priority: 'low'|'medium'|'high'
    - tags: [string]
    - short_reason: 简短原因
    """
    system_msg = (
        "你是资深鸟类兽医与行为学专家。请基于给定的鹦鹉基础信息、近况指标与通用护理指南上下文，"
        "生成3-6条专业、可操作的中文建议。避免空话，保持简洁。输出必须是严格的JSON对象，"
        "字段为 {\"advice\": [{\"category\": ..., \"suggestion\": ..., \"priority\": ..., \"tags\": [...], \"short_reason\": ...}] }."
    )
    user_payload = {
        'parrot': {
            'id': parrot.id,
            'name': parrot.name,
            'species': parrot.species.name if parrot.species else None,
            'age_days': _get_age_days(parrot),
            'age_category': age_cat
        },
        'season': season,
        'metrics': metrics,
        'knowledge_context': {
            'diet': knowledge.get('diet'),
            'environment': knowledge.get('environment'),
            'health': knowledge.get('health')
        }
    }
    try:
        user_msg = json.dumps(user_payload, ensure_ascii=False)
    except Exception:
        user_msg = str(user_payload)
    return system_msg, user_msg


def _llm_generate_advice(parrot: Parrot, metrics: dict, knowledge: dict, season: str, age_cat: str, prefs: dict) -> dict:
    """调用 LLM 生成护理建议；若不可用或失败则回退到规则版。"""
    client = _get_openai_client()
    model = os.environ.get('OPENAI_MODEL') or os.environ.get('AI_MODEL') or 'gpt-4o-mini'
    timeout_s = float(os.environ.get('AI_TIMEOUT', '15') or 15)

    if not client:
        # 回退规则版
        return _generate_advice(parrot, metrics, knowledge, season, age_cat, prefs)

    system_msg, user_msg = _build_llm_prompt(parrot, metrics, knowledge, season, age_cat)
    llm_advice = []
    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ]
        )
        content = resp.choices[0].message.content if resp and resp.choices else None
        data = None
        if content:
            try:
                data = json.loads(content)
            except Exception:
                # 尝试截取到第一个/最后一个大括号
                start = content.find('{')
                end = content.rfind('}')
                if start != -1 and end != -1 and end > start:
                    try:
                        data = json.loads(content[start:end+1])
                    except Exception:
                        data = None
        if isinstance(data, dict):
            for item in (data.get('advice') or []):
                llm_advice.append({
                    'category': item.get('category') or 'health',
                    'suggestion': item.get('suggestion') or item.get('content') or '',
                    'priority': item.get('priority') or 'medium',
                    'tags': item.get('tags') or [],
                    'short_reason': item.get('short_reason') or item.get('reason') or ''
                })
    except Exception:
        traceback.print_exc()

    # 若LLM输出不可用则回退规则版
    if not llm_advice:
        return _generate_advice(parrot, metrics, knowledge, season, age_cat, prefs)

    # 构造与规则版一致的返回结构
    result = {
        'parrot_id': parrot.id,
        'parrot_name': parrot.name,
        'species_name': parrot.species.name if parrot.species else None,
        'age_days': _get_age_days(parrot),
        'age_category': age_cat,
        'season': season,
        'metrics': metrics,
        'advice': llm_advice,
        'sources': {
            'knowledge_context': knowledge.get('context'),
            'diet_refs': knowledge.get('diet'),
            'environment_refs': knowledge.get('environment'),
            'health_refs': knowledge.get('health'),
            'llm': {'provider': 'openai', 'model': model}
        }
    }

    # 若开启订阅建议（偏好），附上简要payload建议
    delivery = prefs.get('delivery', {})
    if bool(delivery.get('subscription_enabled')):
        summary = llm_advice[0]['suggestion'] if llm_advice else '保持规律护理与健康监测'
        result['subscription_payload'] = {
            'template_id': delivery.get('template_id'),
            'page': delivery.get('page', 'pages/index/index'),
            'data': {
                'thing1': {'value': '护理建议'},
                'thing2': {'value': summary},
                'time1': {'value': datetime.now().strftime('%Y-%m-%d %H:%M')},
                'phrase1': {'value': llm_advice[0]['category'] if llm_advice else 'health'}
            }
        }
    return result


def _compute_recent_metrics(parrot_id: int) -> dict:
    today = date.today()
    d7 = today - timedelta(days=7)
    d14 = today - timedelta(days=14)

    # 喂食统计（近7天次数、最近日期）
    feeding_count_7d = db.session.query(func.count(FeedingRecord.id)).filter(
        FeedingRecord.parrot_id == parrot_id,
        func.date(FeedingRecord.feeding_time) >= d7
    ).scalar() or 0

    last_feeding_date = db.session.query(func.max(func.date(FeedingRecord.feeding_time))).filter(
        FeedingRecord.parrot_id == parrot_id
    ).scalar()

    # 清洁统计（近14天次数、最近日期）
    cleaning_count_14d = db.session.query(func.count(CleaningRecord.id)).filter(
        CleaningRecord.parrot_id == parrot_id,
        func.date(CleaningRecord.cleaning_time) >= d14
    ).scalar() or 0

    last_cleaning_date = db.session.query(func.max(func.date(CleaningRecord.cleaning_time))).filter(
        CleaningRecord.parrot_id == parrot_id
    ).scalar()

    # 健康检查最近日期与体重趋势（近14天）
    last_health_date = db.session.query(func.max(func.date(HealthRecord.record_date))).filter(
        HealthRecord.parrot_id == parrot_id
    ).scalar()

    weights_rows = db.session.query(
        func.date(HealthRecord.record_date).label('d'),
        HealthRecord.weight.label('w')
    ).filter(
        HealthRecord.parrot_id == parrot_id,
        HealthRecord.weight.isnot(None),
        func.date(HealthRecord.record_date) >= d14
    ).order_by(func.date(HealthRecord.record_date).asc()).all()
    weights = [(r.d, float(r.w)) for r in weights_rows if r.w is not None]

    weight_trend = None
    weight_change_pct = None
    if len(weights) >= 2:
        w0 = weights[0][1]
        w1 = weights[-1][1]
        if w0 > 0:
            weight_change_pct = round((w1 - w0) / w0 * 100.0, 2)
        if w1 - w0 < -0.0:
            weight_trend = 'decline' if (w1 < w0) else 'stable'
        else:
            weight_trend = 'increase' if (w1 > w0) else 'stable'

    return {
        'feeding_count_7d': int(feeding_count_7d),
        'last_feeding_date': last_feeding_date.isoformat() if hasattr(last_feeding_date, 'isoformat') and last_feeding_date else (str(last_feeding_date) if last_feeding_date else None),
        'cleaning_count_14d': int(cleaning_count_14d),
        'last_cleaning_date': last_cleaning_date.isoformat() if hasattr(last_cleaning_date, 'isoformat') and last_cleaning_date else (str(last_cleaning_date) if last_cleaning_date else None),
        'last_health_date': last_health_date.isoformat() if hasattr(last_health_date, 'isoformat') and last_health_date else (str(last_health_date) if last_health_date else None),
        'weight_change_pct_14d': weight_change_pct,
        'weight_trend_14d': weight_trend
    }


def _retrieve_knowledge(species_name: str | None, age_cat: str, season: str, cfg: dict) -> dict:
    sections = {s.get('key'): s for s in (cfg.get('sections') or []) if isinstance(s, dict)}
    diet_items = [i.get('text') for i in (sections.get('diet', {}).get('items') or []) if isinstance(i, dict)]
    env_items = [i.get('text') for i in (sections.get('environment', {}).get('items') or []) if isinstance(i, dict)]
    health_items = [i.get('text') for i in (sections.get('health', {}).get('items') or []) if isinstance(i, dict)]

    base = {
        'diet': diet_items[:3],
        'environment': env_items[:3],
        'health': health_items[:3]
    }

    # 轻度个性化提示（不改变原文，补充上下文）
    context_notes = []
    if species_name:
        context_notes.append(f'物种: {species_name}')
    if age_cat != 'unknown':
        context_notes.append(f'年龄阶段: {age_cat}')
    context_notes.append(f'季节: {season}')

    base['context'] = '，'.join(context_notes)
    return base


def _generate_advice(parrot: Parrot, metrics: dict, knowledge: dict, season: str, age_cat: str, prefs: dict | None = None) -> dict:
    advice = []
    prefs = prefs or _default_preferences()

    # 喂食建议
    feeding_rec = {
        'category': 'feeding',
        'suggestion': '',
        'reason': '',
        'source': 'knowledge_base'
    }
    fc7 = metrics.get('feeding_count_7d', 0)
    min_per_week = int(prefs.get('feeding', {}).get('min_per_week', 14))
    if age_cat == 'chick':
        feeding_rec['suggestion'] = '雏鸟阶段，建议高频少量喂食，幼鸟奶粉为主，逐步引入易消化蔬果泥。夏季注意补水，冬季注意保温。'
        feeding_rec['reason'] = '根据年龄阶段与季节综合建议。近7天喂食次数为 ' + str(fc7)
    elif age_cat == 'juvenile':
        feeding_rec['suggestion'] = '幼年阶段以配方颗粒为主，搭配蔬果，控制种子比例。每日保证清水与适度互动训练。'
        feeding_rec['reason'] = f'近7天喂食次数 {fc7}，建议保持规律并记录分量'
    elif age_cat == 'adult':
        feeding_rec['suggestion'] = '成鸟阶段以均衡饮食为主，适当丰富化（蔬果/玩具觅食）。夏季加强补水与降温，冬季注意保暖与日照。'
        feeding_rec['reason'] = f'近7天喂食次数 {fc7}，建议每周≥{min_per_week}次（可在偏好中配置）'
    else:  # senior 或 unknown
        feeding_rec['suggestion'] = '老年阶段减少高脂食材，关注体重与精神状态，适当补充维生素与益生菌。'
        feeding_rec['reason'] = f'近7天喂食次数 {fc7}，建议更温和饮食结构'

    advice.append(feeding_rec)

    # 清洁建议
    cleaning_rec = {
        'category': 'cleaning',
        'suggestion': '',
        'reason': '',
        'source': 'records+knowledge'
    }
    cl14 = metrics.get('cleaning_count_14d', 0)
    min_clean = int(prefs.get('cleaning', {}).get('min_per_14d', 2))
    if cl14 < min_clean:
        cleaning_rec['suggestion'] = '近14天清洁偏少，建议每周至少2-3次笼舍/食具清洁，定期消毒以降低病原风险。'
        cleaning_rec['reason'] = f'统计显示近14天清洁次数 {cl14} 次（目标≥{min_clean}）'
    else:
        cleaning_rec['suggestion'] = '清洁频率较为稳定，建议继续保持每周2-3次，并适时进行玩具与栖木材质轮换。'
        cleaning_rec['reason'] = f'近14天清洁次数 {cl14} 次'
    advice.append(cleaning_rec)

    # 健康建议
    health_rec = {
        'category': 'health',
        'suggestion': '',
        'reason': '',
        'source': 'records+knowledge'
    }
    last_health = metrics.get('last_health_date')
    w_pct = metrics.get('weight_change_pct_14d')
    alert_pct = float(prefs.get('health', {}).get('alert_weight_change_pct_14d', 5.0))
    w_trend = metrics.get('weight_trend_14d')

    # 健康检查周期建议
    # juvenile: 每月一次；adult: 每年一次；senior: 每半年一次
    need_check_msg = None
    if age_cat == 'juvenile':
        need_check_msg = '建议每月进行一次健康检查，关注体重与粪便变化。'
    elif age_cat == 'adult':
        need_check_msg = '建议每年进行一次全面体检，并每周称重记录趋势。'
    else:
        need_check_msg = '建议每半年进行一次全面体检，增加日常监测频率。'

    # 结合体重趋势
    if w_pct is not None:
        if w_pct <= -alert_pct:
            health_rec['suggestion'] = '近14天体重出现下降，建议尽快复查与评估饮食/环境因素，必要时就医。'
            health_rec['reason'] = f'体重变化 {w_pct}% ({w_trend})'
        elif w_pct >= alert_pct:
            health_rec['suggestion'] = '近14天体重上升，若为季节性或成长因素可观察；若异常增重，建议调整饮食结构。'
            health_rec['reason'] = f'体重变化 {w_pct}% ({w_trend})'
        else:
            health_rec['suggestion'] = need_check_msg
            health_rec['reason'] = '体重变化稳定或数据不足'
    else:
        health_rec['suggestion'] = need_check_msg
        health_rec['reason'] = '缺少近期体重记录，建议补充称重数据'

    advice.append(health_rec)

    # 附加：知识库上下文（供前端展示来源）
    sources = {
        'knowledge_context': knowledge.get('context'),
        'diet_refs': knowledge.get('diet'),
        'environment_refs': knowledge.get('environment'),
        'health_refs': knowledge.get('health')
    }

    result = {
        'parrot_id': parrot.id,
        'parrot_name': parrot.name,
        'species_name': parrot.species.name if parrot.species else None,
        'age_days': _get_age_days(parrot),
        'age_category': age_cat,
        'season': season,
        'metrics': metrics,
        'advice': advice,
        'sources': sources
    }
    # 若开启订阅建议（偏好），附上简要payload建议
    delivery = prefs.get('delivery', {})
    if bool(delivery.get('subscription_enabled')):
        summary = advice[0]['suggestion'] if advice else '保持规律护理与健康监测'
        result['subscription_payload'] = {
            'template_id': delivery.get('template_id'),
            'page': delivery.get('page', 'pages/index/index'),
            'data': {
                # 需根据模板实际字段调整；此处示例结构
                'thing1': {'value': '护理建议'},
                'thing2': {'value': summary},
                'time1': {'value': datetime.now().strftime('%Y-%m-%d %H:%M')},
                'phrase1': {'value': advice[0]['category'] if advice else 'health'}
            }
        }
    return result


@ai_bp.route('/care-coach', methods=['GET'])
@login_required
def care_coach():
    """AI 护理教练：结合物种、年龄、季节与现有记录，生成个性化建议。
    Query:
      - parrot_id: 可选，指定个体；不填则返回所有可访问鹦鹉的建议
      - season: 可选，覆盖自动季节检测（spring/summer/autumn/winter）
      - llm: 可选（true/false），为 true 时尝试调用AI大模型生成建议（需配置OPENAI_API_KEY或AI_API_KEY）
    返回：[{ per-parrot advice }]
    """
    try:
        user = request.current_user
        parrot_id = request.args.get('parrot_id', type=int)
        season_override = request.args.get('season')
        llm_flag_raw = str(request.args.get('llm') or '').strip().lower()
        use_llm = llm_flag_raw in ('1', 'true', 'yes', 'y') or (request.args.get('mode', '').strip().lower() == 'llm')

        accessible_ids = get_accessible_parrot_ids_by_mode(user)
        query = Parrot.query.filter(Parrot.id.in_(accessible_ids), Parrot.is_active == True)
        if parrot_id:
            if parrot_id not in accessible_ids:
                return error_response('无权访问该鹦鹉数据', 403)
            query = query.filter(Parrot.id == parrot_id)

        parrots = query.all()
        if not parrots:
            return success_response({'items': []}, '暂无可用的鹦鹉数据')

        cfg = _load_care_guide_config()
        prefs = _load_user_preferences(user)
        items = []
        for p in parrots:
            age_days = _get_age_days(p)
            age_cat = _age_category(age_days)
            season = season_override or _season_for_date()
            knowledge = _retrieve_knowledge(p.species.name if p.species else None, age_cat, season, cfg)
            metrics = _compute_recent_metrics(p.id)
            if use_llm:
                items.append(_llm_generate_advice(p, metrics, knowledge, season, age_cat, prefs))
            else:
                items.append(_generate_advice(p, metrics, knowledge, season, age_cat, prefs))

        return success_response({'items': items}, '生成护理建议成功')
    except Exception as e:
        return error_response(f'生成护理建议失败: {str(e)}')


@ai_bp.route('/care-coach/push', methods=['POST'])
@login_required
def care_coach_push():
    """将护理教练建议通过订阅消息发送。
    Body:
      - parrot_id: 可选指定鹦鹉
      - season: 可选季节覆盖
      - template_id: 可选，若用户偏好未设置则需提供
      - page: 可选跳转页面
      - data_override: 可选，覆盖模板数据结构
      - send: 默认为 true；为 false 时仅返回建议与payload
    """
    try:
        from routes.notifications import get_access_token
        import requests

        user = request.current_user
        body = request.get_json(force=True) or {}
        parrot_id = body.get('parrot_id')
        season_override = body.get('season')
        send_flag = bool(body.get('send', True))
        data_override = body.get('data_override')

        accessible_ids = get_accessible_parrot_ids_by_mode(user)
        query = Parrot.query.filter(Parrot.id.in_(accessible_ids), Parrot.is_active == True)
        if parrot_id:
            if int(parrot_id) not in accessible_ids:
                return error_response('无权访问该鹦鹉数据', 403)
            query = query.filter(Parrot.id == int(parrot_id))
        parrots = query.all()
        if not parrots:
            return success_response({'items': [], 'payloads': []}, '暂无可用的鹦鹉数据')

        cfg = _load_care_guide_config()
        prefs = _load_user_preferences(user)
        template_id = body.get('template_id') or prefs.get('delivery', {}).get('template_id')
        page = body.get('page') or prefs.get('delivery', {}).get('page') or 'pages/index/index'

        items = []
        payloads = []
        for p in parrots:
            age_days = _get_age_days(p)
            age_cat = _age_category(age_days)
            season = season_override or _season_for_date()
            knowledge = _retrieve_knowledge(p.species.name if p.species else None, age_cat, season, cfg)
            metrics = _compute_recent_metrics(p.id)
            item = _generate_advice(p, metrics, knowledge, season, age_cat, prefs)
            items.append(item)

            # 构造模板数据
            payload = item.get('subscription_payload') or {}
            if template_id:
                payload['template_id'] = template_id
            if page:
                payload['page'] = page
            if data_override and isinstance(data_override, dict):
                payload['data'] = data_override
            payloads.append(payload)

        result = {'items': items, 'payloads': payloads}

        if not send_flag:
            return success_response(result, '生成护理建议与推送payload成功')

        # 发送订阅消息
        access_token = get_access_token()
        if not access_token:
            return error_response('获取access_token失败，无法发送订阅消息')
        wechat_api_url = f'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}'

        # 每只鹦鹉发送一条，使用当前用户的openid
        openid = getattr(user, 'openid', None)
        if not openid:
            return error_response('当前用户缺少openid，无法发送订阅消息')

        send_results = []
        for payload in payloads:
            if not payload.get('template_id') or not payload.get('data'):
                send_results.append({'status': 'skipped', 'reason': '缺少模板ID或数据'});
                continue
            req = {
                'touser': openid,
                'template_id': payload['template_id'],
                'page': payload.get('page', 'pages/index/index'),
                'data': payload['data']
            }
            try:
                resp = requests.post(wechat_api_url, json=req)
                rj = resp.json()
                send_results.append({'status': 'ok' if rj.get('errcode') == 0 else 'error', 'response': rj})
            except Exception as e:
                send_results.append({'status': 'error', 'error': str(e)})

        return success_response({**result, 'send_results': send_results}, '护理建议订阅消息发送完成')
    except Exception as e:
        return error_response(f'护理建议推送失败: {str(e)}')
