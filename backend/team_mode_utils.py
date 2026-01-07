"""
团队模式数据过滤工具函数
基于数据的团队标识进行过滤，而非创建者身份
"""
from models import db, User, Parrot, Expense, Income, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord
from team_models import Team, TeamMember
from sqlalchemy import and_, or_
from sqlalchemy.orm import aliased

def filter_parrots_by_mode(user, query):
    """根据用户模式过滤鹦鹉查询"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            query = query.filter(Parrot.team_id == user.current_team_id)
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                query = query.filter(Parrot.group_id == member.group_id)
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
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            query = query.filter(record_model.team_id == user.current_team_id)
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                # 记录表包含 group_id 字段
                if hasattr(record_model, 'group_id'):
                    query = query.filter(getattr(record_model, 'group_id') == member.group_id)
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
        # 团队模式：仅返回当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            base_q = db.session.query(Parrot.id).filter(
                Parrot.team_id == user.current_team_id,
                Parrot.is_active == True
            )
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                base_q = base_q.filter(Parrot.group_id == member.group_id)
            parrot_ids = base_q.all()
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
            q = db.session.query(Expense.id).filter(Expense.team_id == user.current_team_id)
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(Expense.group_id == member.group_id)
            expense_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL AND user_id = 当前用户ID）
        expense_ids = db.session.query(Expense.id).filter(
            and_(
                Expense.team_id.is_(None),
                Expense.user_id == user.id
            )
        ).all()
    
    if expense_ids:
        return [eid[0] for eid in expense_ids]
    else:
        return []

def get_accessible_income_ids_by_mode(user):
    """根据用户模式获取可访问的收入ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：只显示团队数据（team_id = current_team_id）
        if user.current_team_id:
            q = db.session.query(Income.id).filter(Income.team_id == user.current_team_id)
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(Income.group_id == member.group_id)
            income_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：只显示个人数据（team_id IS NULL AND user_id = 当前用户ID）
        income_ids = db.session.query(Income.id).filter(
            and_(
                Income.team_id.is_(None),
                Income.user_id == user.id
            )
        ).all()
    
    if income_ids:
        return [iid[0] for iid in income_ids]
    else:
        return []

def get_accessible_feeding_record_ids_by_mode(user):
    """根据用户模式获取可访问的喂食记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            q = db.session.query(FeedingRecord.id).filter(
                FeedingRecord.team_id == user.current_team_id
            )
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(FeedingRecord.group_id == member.group_id)
            record_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：基于鹦鹉归属的全部权限
        # 仅当记录属于个人数据（record.team_id IS NULL），且对应鹦鹉属于当前用户且为个人鹦鹉（parrot.team_id IS NULL）
        record_ids = (
            db.session.query(FeedingRecord.id)
            .join(Parrot, FeedingRecord.parrot_id == Parrot.id)
            .filter(
                and_(
                    FeedingRecord.team_id.is_(None),
                    Parrot.user_id == user.id,
                    Parrot.team_id.is_(None)
                )
            )
            .all()
        )
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_health_record_ids_by_mode(user):
    """根据用户模式获取可访问的健康记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            q = db.session.query(HealthRecord.id).filter(
                HealthRecord.team_id == user.current_team_id
            )
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(HealthRecord.group_id == member.group_id)
            record_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：基于鹦鹉归属的全部权限
        record_ids = (
            db.session.query(HealthRecord.id)
            .join(Parrot, HealthRecord.parrot_id == Parrot.id)
            .filter(
                and_(
                    HealthRecord.team_id.is_(None),
                    Parrot.user_id == user.id,
                    Parrot.team_id.is_(None)
                )
            )
            .all()
        )
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_cleaning_record_ids_by_mode(user):
    """根据用户模式获取可访问的清洁记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            q = db.session.query(CleaningRecord.id).filter(
                CleaningRecord.team_id == user.current_team_id
            )
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(CleaningRecord.group_id == member.group_id)
            record_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：基于鹦鹉归属的全部权限
        record_ids = (
            db.session.query(CleaningRecord.id)
            .join(Parrot, CleaningRecord.parrot_id == Parrot.id)
            .filter(
                and_(
                    CleaningRecord.team_id.is_(None),
                    Parrot.user_id == user.id,
                    Parrot.team_id.is_(None)
                )
            )
            .all()
        )
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []

def get_accessible_breeding_record_ids_by_mode(user):
    """根据用户模式获取可访问的繁殖记录ID列表"""
    if hasattr(user, 'user_mode') and user.user_mode == 'team':
        # 团队模式：仅显示当前团队数据；非管理员按分组隔离
        if user.current_team_id:
            q = db.session.query(BreedingRecord.id).filter(
                BreedingRecord.team_id == user.current_team_id
            )
            member = TeamMember.query.filter_by(team_id=user.current_team_id, user_id=user.id, is_active=True).first()
            if member and member.role not in ['owner', 'admin'] and getattr(member, 'group_id', None):
                q = q.filter(BreedingRecord.group_id == member.group_id)
            record_ids = q.all()
        else:
            # 如果没有当前团队，返回空列表
            return []
    else:
        # 个人模式：基于鹦鹉归属的全部权限
        # 满足记录为个人数据，且雄鸟或雌鸟属于当前用户的个人鹦鹉
        male = aliased(Parrot)
        female = aliased(Parrot)
        record_ids = (
            db.session.query(BreedingRecord.id)
            .join(male, BreedingRecord.male_parrot_id == male.id)
            .join(female, BreedingRecord.female_parrot_id == female.id)
            .filter(
                and_(
                    BreedingRecord.team_id.is_(None),
                    or_(
                        and_(male.user_id == user.id, male.team_id.is_(None)),
                        and_(female.user_id == user.id, female.team_id.is_(None))
                    )
                )
            )
            .all()
        )
    
    if record_ids:
        return [rid[0] for rid in record_ids]
    else:
        return []
