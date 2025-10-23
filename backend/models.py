from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from enum import Enum

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(100), unique=True, nullable=True)  # 微信openid，可为空
    username = db.Column(db.String(50), unique=True, nullable=True)  # 用户名，可为空
    password_hash = db.Column(db.String(255), nullable=True)  # 密码哈希，可为空
    nickname = db.Column(db.String(100))
    avatar_url = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    login_type = db.Column(db.Enum('wechat', 'account'), default='wechat')  # 登录类型
    user_mode = db.Column(db.Enum('personal', 'team'), default='personal')  # 用户模式：个人模式或团队模式
    current_team_id = db.Column(db.Integer, nullable=True)  # 当前选中的团队，暂时移除外键约束
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    parrots = db.relationship('Parrot', backref='owner', lazy=True, cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade='all, delete-orphan')
    reminders = db.relationship('Reminder', backref='user', lazy=True, cascade='all, delete-orphan')

class ParrotSpecies(db.Model):
    __tablename__ = 'parrot_species'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    avg_lifespan = db.Column(db.Integer)
    avg_size = db.Column(db.String(50))
    care_level = db.Column(db.Enum('easy', 'medium', 'hard'), default='medium')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    parrots = db.relationship('Parrot', backref='species', lazy=True)

class Parrot(db.Model):
    __tablename__ = 'parrots'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    species_id = db.Column(db.Integer, db.ForeignKey('parrot_species.id'))
    gender = db.Column(db.Enum('male', 'female', 'unknown'), default='unknown')
    birth_date = db.Column(db.Date)
    acquisition_date = db.Column(db.Date)
    color = db.Column(db.String(100))
    weight = db.Column(db.Numeric(5, 2))
    health_status = db.Column(db.Enum('healthy', 'sick', 'recovering'), default='healthy')
    photo_url = db.Column(db.String(255))
    avatar_url = db.Column(db.String(255))  # 头像URL
    parrot_number = db.Column(db.String(50))  # 编号
    ring_number = db.Column(db.String(50))    # 脚环号
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    feeding_records = db.relationship('FeedingRecord', backref='parrot', lazy=True, cascade='all, delete-orphan')
    health_records = db.relationship('HealthRecord', backref='parrot', lazy=True, cascade='all, delete-orphan')
    cleaning_records = db.relationship('CleaningRecord', backref='parrot', lazy=True, cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='parrot', lazy=True)
    reminders = db.relationship('Reminder', backref='parrot', lazy=True, cascade='all, delete-orphan')

class FeedType(db.Model):
    __tablename__ = 'feed_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(100))
    type = db.Column(db.Enum('seed', 'pellet', 'fruit', 'vegetable', 'supplement'))
    nutrition_info = db.Column(db.Text)
    price = db.Column(db.Numeric(8, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    feeding_records = db.relationship('FeedingRecord', backref='feed_type', lazy=True)

class FeedingRecord(db.Model):
    __tablename__ = 'feeding_records'
    
    id = db.Column(db.Integer, primary_key=True)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    feed_type_id = db.Column(db.Integer, db.ForeignKey('feed_types.id'))
    amount = db.Column(db.Numeric(6, 2))
    feeding_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 记录创建者
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    created_by = db.relationship('User', backref='created_feeding_records', lazy=True)

class HealthRecord(db.Model):
    __tablename__ = 'health_records'
    
    id = db.Column(db.Integer, primary_key=True)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    record_type = db.Column(db.Enum('checkup', 'illness', 'treatment', 'vaccination', 'weight'))
    description = db.Column(db.Text)
    weight = db.Column(db.Numeric(5, 2))
    temperature = db.Column(db.Numeric(4, 1))
    symptoms = db.Column(db.Text)
    treatment = db.Column(db.Text)
    medication = db.Column(db.String(255))
    vet_name = db.Column(db.String(100))
    cost = db.Column(db.Numeric(8, 2))
    record_date = db.Column(db.DateTime, default=datetime.utcnow)
    next_checkup_date = db.Column(db.Date)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 记录创建者
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    created_by = db.relationship('User', backref='created_health_records', lazy=True)

class CleaningRecord(db.Model):
    __tablename__ = 'cleaning_records'
    
    id = db.Column(db.Integer, primary_key=True)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    cleaning_type = db.Column(db.Enum('cage', 'toys', 'perches', 'food_water'))
    description = db.Column(db.Text)
    cleaning_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 记录创建者
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    created_by = db.relationship('User', backref='created_cleaning_records', lazy=True)

class BreedingRecord(db.Model):
    __tablename__ = 'breeding_records'
    
    id = db.Column(db.Integer, primary_key=True)
    male_parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    female_parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    mating_date = db.Column(db.Date)
    egg_laying_date = db.Column(db.Date)
    egg_count = db.Column(db.Integer, default=0)
    hatching_date = db.Column(db.Date)
    chick_count = db.Column(db.Integer, default=0)
    success_rate = db.Column(db.Numeric(5, 2))
    notes = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 记录创建者
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    male_parrot = db.relationship('Parrot', foreign_keys=[male_parrot_id], backref='male_breeding_records')
    female_parrot = db.relationship('Parrot', foreign_keys=[female_parrot_id], backref='female_breeding_records')
    created_by = db.relationship('User', backref='created_breeding_records', lazy=True)

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    category = db.Column(db.Enum('food', 'medical', 'toys', 'cage', 'baby_bird', 'breeding_bird', 'other'))
    amount = db.Column(db.Numeric(8, 2), nullable=False)
    description = db.Column(db.String(255))
    expense_date = db.Column(db.Date, default=date.today)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Reminder(db.Model):
    __tablename__ = 'reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    reminder_type = db.Column(db.Enum('feeding', 'cleaning', 'checkup', 'medication'))
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    reminder_time = db.Column(db.Time)
    frequency = db.Column(db.Enum('daily', 'weekly', 'monthly', 'once'), default='daily')
    is_active = db.Column(db.Boolean, default=True)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)