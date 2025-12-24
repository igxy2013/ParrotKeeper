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
    # 用户角色：super_admin、admin、user；默认普通用户
    role = db.Column(db.Enum('super_admin', 'admin', 'user'), default='user', nullable=False)
    login_type = db.Column(db.Enum('wechat', 'account'), default='wechat')  # 登录类型
    user_mode = db.Column(db.Enum('personal', 'team'), default='personal')  # 用户模式：个人模式或团队模式
    current_team_id = db.Column(db.Integer, nullable=True)  # 当前选中的团队，暂时移除外键约束
    points = db.Column(db.Integer, default=0, nullable=False)  # 用户积分
    last_checkin_date = db.Column(db.Date, nullable=True)  # 最后签到日期，用于每日签到判断
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    parrots = db.relationship('Parrot', backref='owner', lazy=True, cascade='all, delete-orphan')
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade='all, delete-orphan')
    incomes = db.relationship('Income', backref='user', lazy=True, cascade='all, delete-orphan')
    reminders = db.relationship('Reminder', back_populates='user', lazy=True, cascade='all, delete-orphan')
    transaction_categories_rel = db.relationship('TransactionCategory', backref='user', lazy=True)
    feed_types_rel = db.relationship('FeedType', backref='user', lazy=True)

class TransactionCategory(db.Model):
    __tablename__ = 'transaction_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Null for system default
    type = db.Column(db.Enum('expense', 'income'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    icon = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ParrotSpecies(db.Model):
    __tablename__ = 'parrot_species'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    avg_lifespan_min = db.Column(db.Integer)
    avg_lifespan_max = db.Column(db.Integer)
    avg_size_min_cm = db.Column(db.Numeric(6, 2))
    avg_size_max_cm = db.Column(db.Numeric(6, 2))
    care_level = db.Column(db.Enum('easy', 'medium', 'hard'), default='medium')
    reference_weight_g = db.Column(db.Numeric(6, 2))
    reference_weight_min_g = db.Column(db.Numeric(6, 2))
    reference_weight_max_g = db.Column(db.Numeric(6, 2))
    plumage_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    parrots = db.relationship('Parrot', backref='species', lazy=True)

class MarketPrice(db.Model):
    __tablename__ = 'market_prices'

    id = db.Column(db.Integer, primary_key=True)
    species = db.Column(db.String(100), nullable=False)
    color_name = db.Column(db.String(120), nullable=False)
    gender = db.Column(db.Enum('male', 'female'), nullable=True)
    currency = db.Column(db.String(10), default='CNY')
    reference_price = db.Column(db.Numeric(10, 2), nullable=False)
    source = db.Column(db.String(255))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    birth_place = db.Column(db.String(255))
    birth_place_province = db.Column(db.String(100))
    birth_place_city = db.Column(db.String(100))
    birth_place_county = db.Column(db.String(100))
    plumage_splits_json = db.Column(db.Text)
    weight = db.Column(db.Numeric(5, 2))
    health_status = db.Column(db.Enum('healthy', 'sick', 'recovering', 'observation'), default='healthy')
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
    incomes = db.relationship('Income', backref='parrot', lazy=True)
    reminders = db.relationship('Reminder', back_populates='parrot', lazy=True, cascade='all, delete-orphan')

class FeedType(db.Model):
    __tablename__ = 'feed_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.Enum('seed', 'pellet', 'fruit', 'vegetable', 'supplement', 'milk_powder'))
    nutrition_info = db.Column(db.Text)
    price = db.Column(db.Numeric(8, 2))
    unit = db.Column(db.Enum('g', 'ml'), default='g')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
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
    image_urls = db.Column(db.Text)  # JSON 数组，记录照片URL列表
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
    health_status = db.Column(db.Enum('healthy', 'sick', 'recovering', 'observation'), default='healthy')
    description = db.Column(db.Text)
    weight = db.Column(db.Numeric(5, 2))
    temperature = db.Column(db.Numeric(4, 1))
    symptoms = db.Column(db.Text)
    notes = db.Column(db.Text)
    treatment = db.Column(db.Text)
    medication = db.Column(db.String(255))
    vet_name = db.Column(db.String(100))
    cost = db.Column(db.Numeric(8, 2))
    image_urls = db.Column(db.Text)  # JSON 数组，记录照片URL列表
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
    cleaning_type = db.Column(db.Enum('cage', 'toys', 'perches', 'food_water', 'disinfection', 'water_change', 'water_bowl_clean', 'bath'))
    description = db.Column(db.Text)
    cleaning_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    image_urls = db.Column(db.Text)  # JSON 数组，记录照片URL列表
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
    image_urls = db.Column(db.Text)  # JSON 数组，记录照片URL列表
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # 记录创建者
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    male_parrot = db.relationship('Parrot', foreign_keys=[male_parrot_id], backref='male_breeding_records')
    female_parrot = db.relationship('Parrot', foreign_keys=[female_parrot_id], backref='female_breeding_records')
    created_by = db.relationship('User', backref='created_breeding_records', lazy=True)

class Egg(db.Model):
    __tablename__ = 'eggs'

    id = db.Column(db.Integer, primary_key=True)
    breeding_record_id = db.Column(db.Integer, db.ForeignKey('breeding_records.id'))
    mother_parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    father_parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    species_id = db.Column(db.Integer, db.ForeignKey('parrot_species.id'))
    label = db.Column(db.String(50))
    laid_date = db.Column(db.Date)
    incubator_start_date = db.Column(db.DateTime)
    status = db.Column(db.Enum('incubating', 'hatched', 'failed', 'stopped'), default='incubating')
    hatch_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    breeding_record = db.relationship('BreedingRecord', backref='eggs', lazy=True)
    mother_parrot = db.relationship('Parrot', foreign_keys=[mother_parrot_id], backref='laid_eggs')
    father_parrot = db.relationship('Parrot', foreign_keys=[father_parrot_id], backref='fertilized_eggs')
    species = db.relationship('ParrotSpecies', lazy=True)
    created_by = db.relationship('User', backref='created_eggs', lazy=True)

class IncubationLog(db.Model):
    __tablename__ = 'incubation_logs'

    id = db.Column(db.Integer, primary_key=True)
    egg_id = db.Column(db.Integer, db.ForeignKey('eggs.id'), nullable=False)
    log_date = db.Column(db.Date, default=date.today, nullable=False)
    temperature_c = db.Column(db.Numeric(4, 1))
    humidity_pct = db.Column(db.Numeric(4, 1))
    weight_g = db.Column(db.Numeric(6, 2))
    advice = db.Column(db.Text)
    notes = db.Column(db.Text)
    image_urls = db.Column(db.Text)
    is_candling = db.Column(db.Boolean, default=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    egg = db.relationship('Egg', backref=db.backref('incubation_logs', lazy=True, cascade='all, delete-orphan'))
    created_by = db.relationship('User', backref='created_incubation_logs', lazy=True)

class IncubationSuggestion(db.Model):
    __tablename__ = 'incubation_suggestions'

    id = db.Column(db.Integer, primary_key=True)
    species_id = db.Column(db.Integer, db.ForeignKey('parrot_species.id'), nullable=True)
    day_start = db.Column(db.Integer, nullable=False, default=1)
    day_end = db.Column(db.Integer, nullable=False, default=21)
    temperature_target = db.Column(db.Numeric(4, 2))
    temperature_low = db.Column(db.Numeric(4, 2))
    temperature_high = db.Column(db.Numeric(4, 2))
    humidity_low = db.Column(db.Numeric(4, 1))
    humidity_high = db.Column(db.Numeric(4, 1))
    turning_required = db.Column(db.Boolean, default=False)
    candling_required = db.Column(db.Boolean, default=False)
    tips = db.Column(db.Text)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    species = db.relationship('ParrotSpecies', lazy=True)
    created_by = db.relationship('User', backref='created_incubation_suggestions', lazy=True)

class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    category = db.Column(db.String(50))
    amount = db.Column(db.Numeric(8, 2), nullable=False)
    description = db.Column(db.String(255))
    expense_date = db.Column(db.Date, default=date.today)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Income(db.Model):
    __tablename__ = 'incomes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    category = db.Column(db.String(50))
    amount = db.Column(db.Numeric(8, 2), nullable=False)
    description = db.Column(db.String(255))
    income_date = db.Column(db.Date, default=date.today)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Achievement(db.Model):
    __tablename__ = 'achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))
    color = db.Column(db.String(50))
    condition_type = db.Column(db.Enum('parrot_count', 'feeding_count', 'health_check_count', 'stats_view_count'), nullable=False)
    target_value = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    user_achievements = db.relationship('UserAchievement', backref='achievement', lazy=True, cascade='all, delete-orphan')

class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievements.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    current_progress = db.Column(db.Integer, default=0)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 唯一约束：同一用户（及团队）每个成就只能解锁一次
    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id', 'team_id', name='unique_user_achievement'),)

class Reminder(db.Model):
    __tablename__ = 'reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    # 与业务一致的字段：类型、频率、启用、时间
    reminder_type = db.Column(db.Enum('feeding', 'cleaning', 'checkup', 'medication', name='reminder_type_enum'))
    frequency = db.Column(db.Enum('daily', 'weekly', 'monthly', 'once', name='reminder_frequency_enum'))
    is_active = db.Column(db.Boolean, default=True)
    reminder_time = db.Column(db.Time)
    # 旧字段保留，兼容历史数据
    remind_at = db.Column(db.DateTime)
    is_repeated = db.Column(db.Boolean, default=False)
    repeat_interval = db.Column(db.Enum('daily', 'weekly', 'monthly', 'yearly', name='repeat_interval_enum'))
    is_completed = db.Column(db.Boolean, default=False)
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = db.relationship('User', back_populates='reminders', lazy=True)
    parrot = db.relationship('Parrot', back_populates='reminders', lazy=True)

class ReminderLog(db.Model):
    __tablename__ = 'reminder_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    reminder_id = db.Column(db.Integer, db.ForeignKey('reminders.id'), nullable=False)
    sent_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 唯一约束：每条提醒每天只记录一次推送日志
    __table_args__ = (db.UniqueConstraint('reminder_id', 'sent_date', name='unique_reminder_log'),)

class UserSetting(db.Model):
    __tablename__ = 'user_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    team_id = db.Column(db.Integer, nullable=True)
    key = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'team_id', 'key', name='unique_user_setting_key'),)
    
    user = db.relationship('User', backref='settings', lazy=True)

class UserStatistics(db.Model):
    __tablename__ = 'user_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stats_views = db.Column(db.Integer, default=0)  # 统计页面查看次数
    team_id = db.Column(db.Integer, nullable=True)  # 团队标识：NULL表示个人数据，具体值表示团队数据
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 唯一约束：每个用户每个团队只能有一条统计记录
    __table_args__ = (db.UniqueConstraint('user_id', 'team_id', name='unique_user_statistics'),)

class UserPointsRecord(db.Model):
    """用户积分记录表，用于记录每日积分获取情况"""
    __tablename__ = 'user_points_records'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    point_type = db.Column(db.String(50), nullable=False)  # 积分类型：'daily_visit', 'feeding', 'health', 'cleaning', 'breeding', 'expense'
    points = db.Column(db.Integer, nullable=False)  # 获取的积分数量
    record_date = db.Column(db.Date, default=date.today, nullable=False)  # 记录日期
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 唯一约束：每个用户每天每种积分类型只能有一条记录
    __table_args__ = (db.UniqueConstraint('user_id', 'point_type', 'record_date', name='unique_user_points_record'),)
    
    # 关系
    user = db.relationship('User', backref='points_records', lazy=True)


class InvitationCode(db.Model):
    __tablename__ = 'invitation_codes'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(64), unique=True, nullable=False)
    max_uses = db.Column(db.Integer, default=30, nullable=False)
    used_count = db.Column(db.Integer, default=0, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    created_by = db.relationship('User', backref='created_invitation_codes', lazy=True)

class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    contact = db.Column(db.String(255))
    image_urls = db.Column(db.Text)  # 存储为JSON字符串数组
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    user = db.relationship('User', backref='feedbacks', lazy=True)

class Announcement(db.Model):
    __tablename__ = 'announcements'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)
    # 支持草稿、已发布、定时发布
    status = db.Column(db.Enum('draft', 'published', 'scheduled'), default='draft')
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # 定时发布时间（可为空）
    scheduled_at = db.Column(db.DateTime, nullable=True)
    
    # 关系
    creator = db.relationship('User', backref='announcements', lazy=True)

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('key', name='unique_system_setting_key'),)

class ParrotTransferCode(db.Model):
    __tablename__ = 'parrot_transfer_codes'

    id = db.Column(db.Integer, primary_key=True)
    parrot_id = db.Column(db.Integer, db.ForeignKey('parrots.id'), nullable=False)
    code = db.Column(db.String(32), unique=True, nullable=False)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    used = db.Column(db.Boolean, default=False)
    used_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    used_at = db.Column(db.DateTime, nullable=True)

    # 关系
    parrot = db.relationship('Parrot', backref='transfer_codes', lazy=True)
    creator = db.relationship('User', foreign_keys=[created_by_user_id], backref='created_transfer_codes', lazy=True)
    used_by = db.relationship('User', foreign_keys=[used_by_user_id], backref='used_transfer_codes', lazy=True)
