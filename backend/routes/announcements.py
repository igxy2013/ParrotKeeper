from flask import Blueprint, request
from models import db, Announcement
from utils import success_response, cache_get_json, cache_set_json
import json

announcements_bp = Blueprint('announcements', __name__, url_prefix='/api/announcements')


@announcements_bp.route('', methods=['GET'])
def list_published_announcements():
    """公开公告列表：仅返回已发布公告，支持limit"""
    try:
        limit = request.args.get('limit', 10, type=int)
        limit = max(1, min(50, limit))
        cache_key = f'announcements_published_v2:{limit}'
        cached = cache_get_json(cache_key)
        if isinstance(cached, dict):
            return success_response(cached)

        query = Announcement.query.filter_by(status='published').order_by(Announcement.created_at.desc())
        items = query.limit(limit).all()

        data = []
        for a in items:
            imgs = []
            try:
                if a.image_urls:
                    arr = json.loads(a.image_urls)
                    if isinstance(arr, list):
                        imgs = [str(u) for u in arr if isinstance(u, str)]
            except Exception:
                imgs = []
            data.append({
                'id': a.id,
                'title': a.title,
                'content': a.content,
                'status': a.status,
                'created_at': a.created_at.isoformat(),
                'image_url': a.image_url,
                'image_urls': imgs
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


@announcements_bp.route('/<int:ann_id>', methods=['GET'])
def get_announcement_detail(ann_id):
    try:
        a = Announcement.query.get(ann_id)
        if not a or a.status != 'published':
            return success_response({'announcement': None}, message='公告不存在或未发布')
        imgs = []
        try:
            if a.image_urls:
                arr = json.loads(a.image_urls)
                if isinstance(arr, list):
                    imgs = [str(u) for u in arr if isinstance(u, str)]
        except Exception:
            imgs = []
        data = {
            'id': a.id,
            'title': a.title,
            'content': a.content,
            'status': a.status,
            'created_at': a.created_at.isoformat() if a.created_at else None,
            'image_url': a.image_url,
            'image_urls': imgs
        }
        return success_response({'announcement': data})
    except Exception as e:
        return success_response({'announcement': None}, message=f'获取公告失败: {str(e)}')
