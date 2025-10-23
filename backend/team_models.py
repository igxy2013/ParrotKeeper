from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models import db

class Team(db.Model):
    """团队表"""
    __tablename__ = 'teams'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # 团队名称
    description = db.Column(db.Text)  # 团队描述
    invite_code = db.Column(db.String(20), unique=True, nullable=False)  # 邀请码
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 团队创建者
    is_active = db.Column(db.Boolean, default=True)  # 团队是否激活
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    owner = db.relationship('User', backref='owned_teams', foreign_keys=[owner_id])
    members = db.relationship('TeamMember', backref='team', lazy=True, cascade='all, delete-orphan')

class TeamMember(db.Model):
    """团队成员表"""
    __tablename__ = 'team_members'
    
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.Enum('owner', 'admin', 'member'), default='member')  # 角色
    permissions = db.Column(db.JSON)  # 权限配置 JSON
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # 关系
    user = db.relationship('User', backref='team_memberships')
    
    # 唯一约束：一个用户在一个团队中只能有一个成员记录
    __table_args__ = (db.UniqueConstraint('team_id', 'user_id', name='unique_team_user'),)

class TeamParrot(db.Model):
    """团队鹦鹉关联表 - 用于共享鹦鹉给团队"""
    __tablename__ = 'team_parrots'
    
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    shared_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 分享者
    permissions = db.Column(db.JSON)  # 权限配置：可查看、可编辑、可添加记录等
    shared_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # 关系
    team = db.relationship('Team')
    parrot = db.relationship('Parrot', backref='team_shares')
    shared_by_user = db.relationship('User', backref='shared_parrots')
    
    # 唯一约束：一个鹦鹉在一个团队中只能被分享一次
    __table_args__ = (db.UniqueConstraint('team_id', 'parrot_id', name='unique_team_parrot'),)

class TeamInvitation(db.Model):
    """团队邀请表"""
    __tablename__ = 'team_invitations'
    
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    invited_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    invited_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # 被邀请的用户ID（可为空，支持邀请码邀请）
    invited_email = db.Column(db.String(255))  # 被邀请的邮箱（可为空）
    invitation_code = db.Column(db.String(50), unique=True, nullable=False)  # 邀请码
    status = db.Column(db.Enum('pending', 'accepted', 'rejected', 'expired'), default='pending')
    expires_at = db.Column(db.DateTime)  # 过期时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    accepted_at = db.Column(db.DateTime)
    
    # 关系
    team = db.relationship('Team')
    inviter = db.relationship('User', foreign_keys=[invited_by], backref='sent_invitations')
    invited_user = db.relationship('User', foreign_keys=[invited_user_id], backref='received_invitations')