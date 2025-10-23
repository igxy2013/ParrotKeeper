"""
团队模式数据过滤工具函数
基于数据的团队标识进行过滤，而非创建者身份
"""
from models import db, User, Parrot, Expense, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord
from team_models import Team, TeamMember
from sqlalchemy import and_, or_

def filter_parrots_by_mode(user, query):
    """根据用户模式过滤鹦鹉查询"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            query = query.filter(Parrot.team_id == user.current_team_id)
        else:
            # 如果没有当前团队，返回空结果
            query = query.filter(Parrot.id == -1)
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        query = query.filter(Parrot.team_id.is_(None))
    
    return query

def filter_expenses_by_mode(user, query):
    """根据用户模式过滤费用查询"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            query = query.filter(Expense.team_id == user.current_team_id)
        else:
            # 如果没有当前团队，返回空结果
            query = query.filter(Expense.id == -1)
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        query = query.filter(Expense.team_id.is_(None))
    
    return query

def filter_records_by_mode(user, record_model, query):
    """根据用户模式过滤记录查询"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            query = query.filter(record_model.team_id == user.current_team_id)
        else:
            # 如果没有当前团队，返回空结果
            query = query.filter(record_model.id == -1)
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        query = query.filter(record_model.team_id.is_(None))
    
    return query

def get_accessible_parrot_ids_by_mode(user):
    """根据用户模式获取可访问的鹦鹉ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只返回团队数据的鹦鹉ID（team_id = current_team_id）
        if user.current_team_id:
            parrot_ids = db.session.query(Parrot.id).filter(
                Parrot.team_id == user.current_team_id,
                Parrot.is_active == True
            ).all()
            return [pid[0] for pid in parrot_ids]
        else:
            return []
    else:
        # 个人模式：只返回个人数据的鹦鹉ID（team_id IS NULL）
        parrot_ids = db.session.query(Parrot.id).filter(
            Parrot.team_id.is_(None),
            Parrot.user_id == user.id,  # 个人模式下还需要验证拥有者
            Parrot.is_active == True
        ).all()
        return [pid[0] for pid in parrot_ids]

def get_accessible_expense_ids_by_mode(user):
    """根据用户模式获取可访问的费用ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            expense_ids = db.session.query(Expense.id).filter(
                Expense.team_id == user.current_team_id
            ).all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        expense_ids = db.session.query(Expense.id).filter(
            Expense.team_id.is_(None)
        ).all()
    
    if expense_ids:
        return [eid[0] for eid in expense_ids]
    else:
        return [eid[0] for eid in expense_ids]

def get_accessible_feeding_record_ids_by_mode(user):
    """根据用户模式获取可访问的喂食记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            record_ids = db.session.query(FeedingRecord.id).filter(
                FeedingRecord.team_id == user.current_team_id
            ).all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        record_ids = db.session.query(FeedingRecord.id).filter(
            FeedingRecord.team_id.is_(None)
        ).all()
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_health_record_ids_by_mode(user):
    """根据用户模式获取可访问的健康记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            record_ids = db.session.query(HealthRecord.id).filter(
                HealthRecord.team_id == user.current_team_id
            ).all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        record_ids = db.session.query(HealthRecord.id).filter(
            HealthRecord.team_id.is_(None)
        ).all()
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_cleaning_record_ids_by_mode(user):
    """根据用户模式获取可访问的清洁记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            record_ids = db.session.query(CleaningRecord.id).filter(
                CleaningRecord.team_id == user.current_team_id
            ).all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        record_ids = db.session.query(CleaningRecord.id).filter(
            CleaningRecord.team_id.is_(None)
        ).all()
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_breeding_record_ids_by_mode(user):
    """根据用户模式获取可访问的繁殖记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            record_ids = db.session.query(BreedingRecord.id).filter(
                BreedingRecord.team_id == user.current_team_id
            ).all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL）
        record_ids = db.session.query(BreedingRecord.id).filter(
            BreedingRecord.team_id.is_(None)
        ).all()
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []