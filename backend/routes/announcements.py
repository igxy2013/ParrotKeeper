from flask import Blueprint, request
from models import db, Announcement
from utils import success_response, cache_get_json, cache_set_json

announcements_bp = Blueprint('announcements', __name__, url_prefix='/api/announcements')


@announcements_bp.route('', methods=['GET'])
def list_published_announcements():
    """公开公告列表：仅返回已发布公告，支持limit"""
    try:
        limit = request.args.get('limit', 10, type=int)
        limit = max(1, min(50, limit))
        cache_key = f'announcements_published_v1:{limit}'
        cached = cache_get_json(cache_key)
        if isinstance(cached, dict):
            return success_response(cached)

        query = Announcement.query.filter_by(status='published').order_by(Announcement.created_at.desc())
        items = query.limit(limit).all()

        data = []
        for a in items:
            data.append({
                'id': a.id,
                'title': a.title,
                'content': a.content,
                'status': a.status,
                'created_at': a.created_at.isoformat(),
                'image_url': a.image_url
            })

        payload = {'announcements': data}
        try:
            cache_set_json(cache_key, payload, 300)
        except Exception:
            pass
        return success_response(payload)
    except Exception as e:
        # 公共接口返回统一结构但不泄露内部错误细节
        return success_response({'announcements': []}, message=f'获取公告失败: {str(e)}')
