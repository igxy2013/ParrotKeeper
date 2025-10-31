from flask import Blueprint, request
from models import db, Feedback, User
from utils import login_required, success_response, error_response
import json

feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')

@feedback_bp.route('', methods=['POST'])
@login_required
def submit_feedback():
    try:
        user = request.current_user
        data = request.get_json() or {}
        content = (data.get('content') or '').strip()
        contact = (data.get('contact') or '').strip()
        image_urls = data.get('image_urls') or []

        if not content:
            return error_response('反馈内容不能为空', 400)

        fb = Feedback(
            user_id=user.id,
            content=content,
            contact=contact if contact else None,
            image_urls=json.dumps(image_urls, ensure_ascii=False)
        )
        db.session.add(fb)
        db.session.commit()
        return success_response({ 'id': fb.id, 'created_at': fb.created_at.isoformat() })
    except Exception as e:
        db.session.rollback()
        return error_response(f'提交反馈失败: {str(e)}')

