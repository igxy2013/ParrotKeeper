from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from models import User, Parrot, ParrotSpecies, FeedType, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, Expense, Reminder, Egg, IncubationLog
from models import IncubationSuggestion
from models import PairingRecord

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('updated_at',)

    username = fields.Method('get_username', dump_only=True)
    account_username = fields.Method('get_account_username', dump_only=True)
    effective_tier = fields.Method('get_effective_tier', dump_only=True)
    team_subscription_level = fields.Method('get_team_subscription_level', dump_only=True)
    team_level = fields.Method('get_team_subscription_level', dump_only=True)

    def get_username(self, obj):
        try:
            account = getattr(obj, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return getattr(obj, 'nickname', None) or getattr(obj, 'openid', None)
        except Exception:
            return None

    def get_account_username(self, obj):
        try:
            account = getattr(obj, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return None
        except Exception:
            return None

    def get_effective_tier(self, obj):
        try:
            from subscription_utils import get_effective_subscription_tier
            return get_effective_subscription_tier(obj)
        except Exception:
            try:
                return getattr(obj, 'subscription_tier', 'free') or 'free'
            except Exception:
                return 'free'

    def get_team_subscription_level(self, obj):
        try:
            if getattr(obj, 'user_mode', 'personal') == 'team' and getattr(obj, 'current_team_id', None):
                from team_models import Team
                team = Team.query.get(obj.current_team_id)
                if team and team.subscription_level in ['basic', 'advanced']:
                    return team.subscription_level
            return None
        except Exception:
            return None

class ParrotSpeciesSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = ParrotSpecies
        load_instance = True
        exclude = ('created_at',)

class ParrotSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Parrot
        load_instance = True
        exclude = ('created_at', 'updated_at')
    
    species = fields.Nested(ParrotSpeciesSchema, dump_only=True)
    species_name = fields.Method('get_species_name', dump_only=True)
    age_days = fields.Method('get_age_days', dump_only=True)
    # 统一健康状态：从最近的健康检查记录获取；若无则默认健康
    current_health_status = fields.Method('get_current_health_status', dump_only=True)
    current_health_status_text = fields.Method('get_current_health_status_text', dump_only=True)
    photo_thumb = fields.Method('get_photo_thumb', dump_only=True)
    avatar_thumb = fields.Method('get_avatar_thumb', dump_only=True)
    plumage_split_ids = fields.Method('get_plumage_split_ids', dump_only=True)
    owner_name = fields.Method('get_owner_name', dump_only=True)
    owner = fields.Method('get_owner', dump_only=True)
    
    def get_species_name(self, obj):
        return obj.species.name if obj.species else None
    
    def get_age_days(self, obj):
        if obj.birth_date:
            from datetime import date
            return (date.today() - obj.birth_date).days
        return None

    def get_current_health_status(self, obj):
        try:
            # 最近健康检查记录的健康状态；若无记录则返回 'healthy'
            latest = HealthRecord.query.filter_by(parrot_id=obj.id)\
                .order_by(HealthRecord.record_date.desc()).first()
            return (latest.health_status if latest and latest.health_status else 'healthy')
        except Exception:
            return 'healthy'

    def get_current_health_status_text(self, obj):
        status = self.get_current_health_status(obj)
        status_map = {
            'healthy': '健康',
            'sick': '生病',
            'recovering': '康复中',
            'observation': '观察中'
        }
        return status_map.get(status, '健康')

    def get_photo_thumb(self, obj):
        try:
            from utils import get_or_create_square_thumbnail
            return get_or_create_square_thumbnail(obj.photo_url or '', 128)
        except Exception:
            return obj.photo_url or ''

    def get_avatar_thumb(self, obj):
        try:
            from utils import get_or_create_square_thumbnail
            return get_or_create_square_thumbnail(obj.avatar_url or '', 128)
        except Exception:
            return obj.avatar_url or ''

    def get_plumage_split_ids(self, obj):
        try:
            import json
            raw = getattr(obj, 'plumage_splits_json', None)
            if not raw:
                return []
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_owner_name(self, obj):
        try:
            u = User.query.get(getattr(obj, 'user_id', None))
            if not u:
                return None
            # 显示昵称优先；无昵称时回退到账号用户名
            nick = getattr(u, 'nickname', None)
            if nick:
                return nick
            account = getattr(u, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return None
        except Exception:
            return None

    def get_owner(self, obj):
        try:
            u = User.query.get(getattr(obj, 'user_id', None))
            if not u:
                return None
            return UserSchema(only=('id','nickname','username','account_username')).dump(u)
        except Exception:
            return None

class FeedTypeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = FeedType
        load_instance = True
        exclude = ('created_at',)

class FeedingRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = FeedingRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name', 'avatar_url', 'photo_url', 'avatar_thumb', 'photo_thumb'))
    feed_type = fields.Nested(FeedTypeSchema, dump_only=True)
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    feed_type_name = fields.Method('get_feed_type_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    created_by_nickname = fields.Method('get_created_by_nickname', dump_only=True)
    # 确保parrot_id字段被包含
    parrot_id = fields.Integer(dump_only=True)
    parrot_number = fields.Method('get_parrot_number', dump_only=True)
    ring_number = fields.Method('get_ring_number', dump_only=True)
    photos = fields.Method('get_photos', dump_only=True)
    amount_unit = fields.Method('get_amount_unit', dump_only=True)
    summary_title = fields.Method('get_summary_title', dump_only=True)
    summary_items = fields.Method('get_summary_items', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_feed_type_name(self, obj):
        return obj.feed_type.name if obj.feed_type else None
    
    def get_created_by_username(self, obj):
        try:
            user = obj.created_by
            if not user:
                return None
            account = getattr(user, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return getattr(user, 'nickname', None) or getattr(user, 'openid', None)
        except Exception:
            return None
    
    def get_created_by_nickname(self, obj):
        return obj.created_by.nickname if obj.created_by else None

    def get_parrot_number(self, obj):
        return obj.parrot.parrot_number if obj.parrot else None

    def get_ring_number(self, obj):
        return obj.parrot.ring_number if obj.parrot else None
    
    def get_photos(self, obj):
        try:
            import json
            if not getattr(obj, 'image_urls', None):
                return []
            data = json.loads(obj.image_urls)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_amount_unit(self, obj):
        try:
            ft = getattr(obj, 'feed_type', None)
            if ft and getattr(ft, 'unit', None):
                return ft.unit
        except Exception:
            pass
        return 'g'

    def get_summary_title(self, obj):
        try:
            name = self.get_feed_type_name(obj) or ''
            if not name:
                return '喂食'
            return f"喂食 {name}"
        except Exception:
            return '喂食'

    def get_summary_items(self, obj):
        items = []
        try:
            amt = obj.amount
            unit = self.get_amount_unit(obj)
            if amt is not None:
                try:
                    items.append(f"分量: {float(amt)}{unit}")
                except Exception:
                    items.append(f"分量: {amt}{unit}")
            if obj.notes:
                items.append(str(obj.notes))
        except Exception:
            pass
        return items

class HealthRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = HealthRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    created_by_nickname = fields.Method('get_created_by_nickname', dump_only=True)
    health_status_text = fields.Method('get_health_status_text', dump_only=True)
    parrot_number = fields.Method('get_parrot_number', dump_only=True)
    ring_number = fields.Method('get_ring_number', dump_only=True)
    photos = fields.Method('get_photos', dump_only=True)
    summary_title = fields.Method('get_summary_title', dump_only=True)
    summary_items = fields.Method('get_summary_items', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_created_by_username(self, obj):
        try:
            user = obj.created_by
            if not user:
                return None
            account = getattr(user, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return getattr(user, 'nickname', None) or getattr(user, 'openid', None)
        except Exception:
            return None
    
    def get_created_by_nickname(self, obj):
        return obj.created_by.nickname if obj.created_by else None

    def get_parrot_number(self, obj):
        return obj.parrot.parrot_number if obj.parrot else None

    def get_ring_number(self, obj):
        return obj.parrot.ring_number if obj.parrot else None
    
    def get_health_status_text(self, obj):
        """将英文健康状态转换为中文显示"""
        status_map = {
            'healthy': '健康',
            'sick': '生病',
            'recovering': '康复中',
            'observation': '观察中'
        }
        return status_map.get(obj.health_status, obj.health_status)

    def get_photos(self, obj):
        try:
            import json
            if not obj.image_urls:
                return []
            data = json.loads(obj.image_urls)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_summary_title(self, obj):
        try:
            type_map = {
                'checkup': '健康检查', 'illness': '疾病记录', 'treatment': '治疗护理', 'vaccination': '疫苗接种', 'weight': '体重称量'
            }
            t = type_map.get(getattr(obj, 'record_type', None), getattr(obj, 'record_type', None)) or '健康'
            s = self.get_health_status_text(obj) or ''
            if s:
                return f"{t}（{s}）"
            return t
        except Exception:
            return '健康'

    def get_summary_items(self, obj):
        items = []
        try:
            if obj.weight is not None:
                try:
                    items.append(f"体重: {float(obj.weight)}g")
                except Exception:
                    items.append(f"体重: {obj.weight}g")
            if obj.temperature is not None:
                try:
                    items.append(f"体温: {float(obj.temperature)}℃")
                except Exception:
                    items.append(f"体温: {obj.temperature}℃")
            if obj.medication:
                items.append(f"用药: {obj.medication}")
            if obj.treatment:
                items.append(f"处理: {obj.treatment}")
            if obj.symptoms:
                items.append(f"症状: {obj.symptoms}")
            if obj.notes:
                items.append(str(obj.notes))
        except Exception:
            pass
        return items

class CleaningRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CleaningRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    created_by_nickname = fields.Method('get_created_by_nickname', dump_only=True)
    cleaning_type_text = fields.Method('get_cleaning_type_text', dump_only=True)
    parrot_number = fields.Method('get_parrot_number', dump_only=True)
    ring_number = fields.Method('get_ring_number', dump_only=True)
    photos = fields.Method('get_photos', dump_only=True)
    summary_title = fields.Method('get_summary_title', dump_only=True)
    summary_items = fields.Method('get_summary_items', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_created_by_username(self, obj):
        try:
            user = obj.created_by
            if not user:
                return None
            account = getattr(user, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return getattr(user, 'nickname', None) or getattr(user, 'openid', None)
        except Exception:
            return None
    
    def get_created_by_nickname(self, obj):
        return obj.created_by.nickname if obj.created_by else None

    def get_parrot_number(self, obj):
        return obj.parrot.parrot_number if obj.parrot else None

    def get_ring_number(self, obj):
        return obj.parrot.ring_number if obj.parrot else None
    
    def get_cleaning_type_text(self, obj):
        """将英文清洁类型转换为中文显示"""
        cleaning_type_map = {
            'cage': '笼子清洁',
            'toys': '玩具清洁', 
            'perches': '栖木清洁',
            'food_water': '食物和水清洁',
            'disinfection': '消毒',
            'water_change': '饮用水更换',
            'water_bowl_clean': '水碗清洁',
            'bath': '鹦鹉洗澡'
        }
        return cleaning_type_map.get(obj.cleaning_type, obj.cleaning_type)
    
    def get_photos(self, obj):
        try:
            import json
            if not getattr(obj, 'image_urls', None):
                return []
            data = json.loads(obj.image_urls)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_summary_title(self, obj):
        try:
            t = self.get_cleaning_type_text(obj) or ''
            return t or '清洁'
        except Exception:
            return '清洁'

    def get_summary_items(self, obj):
        items = []
        try:
            if obj.description:
                items.append(str(obj.description))
            if obj.notes:
                items.append(str(obj.notes))
        except Exception:
            pass
        return items

class BreedingRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BreedingRecord
        load_instance = True
        exclude = ('created_at', 'updated_at')
    
    male_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    female_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    male_parrot_name = fields.Method('get_male_parrot_name', dump_only=True)
    female_parrot_name = fields.Method('get_female_parrot_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    created_by_nickname = fields.Method('get_created_by_nickname', dump_only=True)
    photos = fields.Method('get_photos', dump_only=True)
    summary_title = fields.Method('get_summary_title', dump_only=True)
    summary_items = fields.Method('get_summary_items', dump_only=True)
    
    def get_male_parrot_name(self, obj):
        return obj.male_parrot.name if obj.male_parrot else None
    
    def get_female_parrot_name(self, obj):
        return obj.female_parrot.name if obj.female_parrot else None
    
    def get_created_by_username(self, obj):
        try:
            user = obj.created_by
            if not user:
                return None
            account = getattr(user, 'account', None)
            if account and getattr(account, 'username', None):
                return account.username
            return getattr(user, 'nickname', None) or getattr(user, 'openid', None)
        except Exception:
            return None
    
    def get_created_by_nickname(self, obj):
        return obj.created_by.nickname if obj.created_by else None
    
    def get_photos(self, obj):
        try:
            import json
            if not getattr(obj, 'image_urls', None):
                return []
            data = json.loads(obj.image_urls)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_summary_title(self, obj):
        try:
            m = self.get_male_parrot_name(obj) or ''
            f = self.get_female_parrot_name(obj) or ''
            if m or f:
                return f"配对 {m} × {f}".strip()
            return '繁殖记录'
        except Exception:
            return '繁殖记录'

    def get_summary_items(self, obj):
        items = []
        try:
            if obj.mating_date:
                items.append(f"交配: {obj.mating_date}")
            if obj.egg_laying_date is not None:
                items.append(f"产蛋: {obj.egg_laying_date}（{int(obj.egg_count or 0)}枚）")
            if obj.hatching_date is not None:
                items.append(f"孵化: {obj.hatching_date}（{int(obj.chick_count or 0)}只）")
            if obj.success_rate is not None:
                try:
                    items.append(f"成功率: {float(obj.success_rate)}%")
                except Exception:
                    items.append(f"成功率: {obj.success_rate}%")
            if obj.notes:
                items.append(str(obj.notes))
        except Exception:
            pass
        return items

class ExpenseSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Expense
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))

class ReminderSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Reminder
        load_instance = True
        exclude = ('created_at', 'updated_at')
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))

class EggSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Egg
        load_instance = True
        exclude = ('created_at', 'updated_at')

    breeding_record = fields.Nested(BreedingRecordSchema, dump_only=True, only=('id', 'male_parrot_name', 'female_parrot_name'))
    mother_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    father_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    species = fields.Nested(ParrotSpeciesSchema, dump_only=True)
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    day_since_start = fields.Method('get_day_since_start', dump_only=True)

    def get_day_since_start(self, obj):
        try:
            if obj.incubator_start_date:
                from datetime import date, datetime
                start = obj.incubator_start_date
                # 兼容字符串日期
                if isinstance(start, str):
                    try:
                        if 'T' in start:
                            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
                            start = start_dt.date()
                        else:
                            start = datetime.strptime(start, '%Y-%m-%d').date()
                    except Exception:
                        return None
                return (date.today() - start).days
            return None
        except Exception:
            return None

class IncubationLogSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncubationLog
        load_instance = True
        exclude = ('created_at',)

    egg = fields.Nested(EggSchema, dump_only=True, only=('id', 'label'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    day_index = fields.Method('get_day_index', dump_only=True)

    def get_day_index(self, obj):
        try:
            if obj.egg and obj.egg.incubator_start_date and obj.log_date:
                return (obj.log_date - obj.egg.incubator_start_date).days
        except Exception:
            return None
        return None

class IncubationSuggestionSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = IncubationSuggestion
        load_instance = True
        exclude = ('created_at', 'updated_at')
    species = fields.Nested(ParrotSpeciesSchema, dump_only=True, only=('id','name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id','username'))

class PairingRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = PairingRecord
        load_instance = True
        exclude = ('updated_at',)
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    motherSplits = fields.Method('get_mother_splits', dump_only=True)
    fatherSplits = fields.Method('get_father_splits', dump_only=True)
    results = fields.Method('get_results', dump_only=True)
    expectedAveragePrice = fields.Method('get_expected_avg_price', dump_only=True)
    createdAt = fields.Method('get_created_at_ts', dump_only=True)
    motherColor = fields.Method('get_mother_color', dump_only=True)
    fatherColor = fields.Method('get_father_color', dump_only=True)

    def get_mother_splits(self, obj):
        try:
            import json
            raw = obj.mother_splits_json or '[]'
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_father_splits(self, obj):
        try:
            import json
            raw = obj.father_splits_json or '[]'
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_results(self, obj):
        try:
            import json
            raw = obj.results_json or '[]'
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def get_expected_avg_price(self, obj):
        try:
            v = obj.expected_average_price
            if v is None:
                return None
            return float(v)
        except Exception:
            return None

    def get_created_at_ts(self, obj):
        try:
            from datetime import timezone
            dt = obj.created_at
            if not dt:
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return int(dt.timestamp() * 1000)
        except Exception:
            return None

    def get_mother_color(self, obj):
        return obj.mother_color

    def get_father_color(self, obj):
        return obj.father_color

# 创建schema实例
user_schema = UserSchema()
users_schema = UserSchema(many=True)

parrot_species_schema = ParrotSpeciesSchema()
parrot_species_list_schema = ParrotSpeciesSchema(many=True)

parrot_schema = ParrotSchema()
parrots_schema = ParrotSchema(many=True)

feed_type_schema = FeedTypeSchema()
feed_types_schema = FeedTypeSchema(many=True)

feeding_record_schema = FeedingRecordSchema()
feeding_records_schema = FeedingRecordSchema(many=True)

health_record_schema = HealthRecordSchema()
health_records_schema = HealthRecordSchema(many=True)

cleaning_record_schema = CleaningRecordSchema()
cleaning_records_schema = CleaningRecordSchema(many=True)

breeding_record_schema = BreedingRecordSchema()
breeding_records_schema = BreedingRecordSchema(many=True)

expense_schema = ExpenseSchema()
expenses_schema = ExpenseSchema(many=True)

reminder_schema = ReminderSchema()
reminders_schema = ReminderSchema(many=True)

egg_schema = EggSchema()
eggs_schema = EggSchema(many=True)

incubation_log_schema = IncubationLogSchema()
incubation_logs_schema = IncubationLogSchema(many=True)
incubation_suggestion_schema = IncubationSuggestionSchema()
incubation_suggestions_schema = IncubationSuggestionSchema(many=True)
pairing_record_schema = PairingRecordSchema()
pairing_records_schema = PairingRecordSchema(many=True)
