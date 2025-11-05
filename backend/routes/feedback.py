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


@feedback_bp.route('', methods=['GET'])
@login_required
def list_feedbacks():
    """仅超级管理员可查看用户反馈列表"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限查看反馈', 403)

        items = Feedback.query.order_by(Feedback.created_at.desc()).all()
        result = []
        for fb in items:
            try:
                images = json.loads(fb.image_urls) if fb.image_urls else []
                if not isinstance(images, list):
                    images = []
            except Exception:
                images = []
            result.append({
                'id': fb.id,
                'user_id': fb.user_id,
                'user_nickname': fb.user.nickname if fb.user else None,
                'content': fb.content,
                'contact': fb.contact,
                'image_urls': images,
                'created_at': fb.created_at.isoformat()
            })
        return success_response(result)
    except Exception as e:
        return error_response(f'获取反馈列表失败: {str(e)}')


@feedback_bp.route('/<int:feedback_id>', methods=['DELETE'])
@login_required
def delete_feedback(feedback_id):
    """仅超级管理员可删除指定反馈"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限删除反馈', 403)

        fb = Feedback.query.get(feedback_id)
        if not fb:
            return error_response('反馈不存在', 404)
        db.session.delete(fb)
        db.session.commit()
        return success_response({'id': feedback_id}, '删除成功')
    except Exception as e:
        db.session.rollback()
        return error_response(f'删除反馈失败: {str(e)}')


@feedback_bp.route('/unread_count', methods=['GET'])
@login_required
def get_unread_feedback_count():
    """获取未读反馈数量（仅超级管理员可查看）"""
    try:
        user = request.current_user
        if not user or user.role != 'super_admin':
            return error_response('无权限查看反馈统计', 403)

        # 获取所有反馈数量（可以根据需要添加时间过滤等条件）
        unread_count = Feedback.query.count()
        return success_response({'unread_count': unread_count})
    except Exception as e:
        return error_response(f'获取反馈统计失败: {str(e)}')
