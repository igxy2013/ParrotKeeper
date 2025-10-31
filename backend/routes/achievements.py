from flask import Blueprint, request, jsonify
from models import db, Achievement, UserAchievement, UserStatistics, Parrot, FeedingRecord, HealthRecord
from utils import login_required, success_response, error_response
from team_mode_utils import get_accessible_parrot_ids_by_mode
from datetime import datetime, date
from sqlalchemy import func, and_

achievements_bp = Blueprint('achievements', __name__, url_prefix='/api/achievements')

@achievements_bp.route('/', methods=['GET'])
@login_required
def get_user_achievements():
    """获取用户成就列表"""
    try:
        user = request.current_user
        team_id = getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
        
        # 获取所有启用的成就
        achievements = Achievement.query.filter_by(is_active=True).all()
        
        # 获取用户已解锁的成就
        user_achievements = UserAchievement.query.filter_by(
            user_id=user.id, 
            team_id=team_id
        ).all()
        
        # 创建用户成就字典，便于查找
        user_achievement_dict = {ua.achievement_id: ua for ua in user_achievements}
        
        # 获取当前统计数据用于计算进度
        current_stats = get_current_user_stats(user, team_id)
        
        result = []
        for achievement in achievements:
            user_achievement = user_achievement_dict.get(achievement.id)
            
            # 计算当前进度
            current_progress = get_achievement_progress(achievement, current_stats)
            
            achievement_data = {
                'id': achievement.id,
                'key': achievement.key,
                'title': achievement.title,
                'description': achievement.description,
                'icon': achievement.icon,
                'color': achievement.color,
                'target': achievement.target_value,
                'current': current_progress,
                'unlocked': user_achievement is not None,
                'unlocked_at': user_achievement.unlocked_at.isoformat() if user_achievement else None
            }
            
            result.append(achievement_data)
        
        return success_response(result)
        
    except Exception as e:
        return error_response(f'获取成就列表失败: {str(e)}')

@achievements_bp.route('/check', methods=['POST'])
@login_required
def check_achievements():
    """检查并解锁成就"""
    try:
        user = request.current_user
        team_id = getattr(user, 'current_team_id', None) if getattr(user, 'user_mode', 'personal') == 'team' else None
        
        # 获取当前统计数据
        current_stats = get_current_user_stats(user, team_id)
        
        # 获取所有启用的成就
        achievements = Achievement.query.filter_by(is_active=True).all()
        
        # 获取用户已解锁的成就ID
        unlocked_achievement_ids = set(
            ua.achievement_id for ua in UserAchievement.query.filter_by(
                user_id=user.id, 
                team_id=team_id
            ).all()
        )
        
        newly_unlocked = []
        
        for achievement in achievements:
            if achievement.id in unlocked_achievement_ids:
                continue  # 已解锁，跳过
            
            # 检查是否满足解锁条件
            current_progress = get_achievement_progress(achievement, current_stats)
            if current_progress >= achievement.target_value:
                # 解锁成就
                user_achievement = UserAchievement(
                    user_id=user.id,
                    achievement_id=achievement.id,
                    team_id=team_id,
                    current_progress=current_progress
                )
                db.session.add(user_achievement)
                newly_unlocked.append({
                    'id': achievement.id,
                    'key': achievement.key,
                    'title': achievement.title,
                    'description': achievement.description,
                    'icon': achievement.icon,
                    'color': achievement.color
                })
        
        db.session.commit()
        
        return success_response({
            'newly_unlocked': newly_unlocked,
            'count': len(newly_unlocked)
        })
        
    except Exception as e:
        db.session.rollback()
        return error_response(f'检查成就失败: {str(e)}')

def get_current_user_stats(user, team_id):
    """获取用户当前统计数据"""
    # 获取可访问的鹦鹉ID
    parrot_ids = get_accessible_parrot_ids_by_mode(user)
    
    # 鹦鹉总数
    parrot_count = len([pid for pid in parrot_ids if Parrot.query.get(pid) and Parrot.query.get(pid).is_active])
    
    # 喂食总次数
    feeding_count = db.session.query(func.count(FeedingRecord.id)).filter(
        FeedingRecord.parrot_id.in_(parrot_ids)
    ).scalar() or 0
    
    # 健康检查总次数
    health_check_count = db.session.query(func.count(HealthRecord.id)).filter(
        HealthRecord.parrot_id.in_(parrot_ids)
    ).scalar() or 0
    
    # 统计查看次数
    user_stats = UserStatistics.query.filter_by(user_id=user.id, team_id=team_id).first()
    stats_view_count = user_stats.stats_views if user_stats else 0
    
    return {
        'parrot_count': parrot_count,
        'feeding_count': feeding_count,
        'health_check_count': health_check_count,
        'stats_view_count': stats_view_count
    }

def get_achievement_progress(achievement, current_stats):
    """根据成就类型获取当前进度"""
    condition_type = achievement.condition_type
    
    if condition_type == 'parrot_count':
        return current_stats['parrot_count']
    elif condition_type == 'feeding_count':
        return current_stats['feeding_count']
    elif condition_type == 'health_check_count':
        return current_stats['health_check_count']
    elif condition_type == 'stats_view_count':
        return current_stats['stats_view_count']
    else:
        return 0