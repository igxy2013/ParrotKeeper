from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from models import User, Parrot, ParrotSpecies, FeedType, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, Expense, Reminder

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('updated_at',)

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
    
    def get_species_name(self, obj):
        return obj.species.name if obj.species else None
    
    def get_age_days(self, obj):
        if obj.birth_date:
            from datetime import date
            return (date.today() - obj.birth_date).days
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
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name', 'avatar_url', 'photo_url'))
    feed_type = fields.Nested(FeedTypeSchema, dump_only=True)
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    feed_type_name = fields.Method('get_feed_type_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_feed_type_name(self, obj):
        return obj.feed_type.name if obj.feed_type else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

class HealthRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = HealthRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    health_status_text = fields.Method('get_health_status_text', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
    
    def get_health_status_text(self, obj):
        """将英文健康状态转换为中文显示"""
        status_map = {
            'healthy': '健康',
            'sick': '生病',
            'recovering': '康复中',
            'observation': '观察中'
        }
        return status_map.get(obj.health_status, obj.health_status)

class CleaningRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CleaningRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    created_by = fields.Nested(UserSchema, dump_only=True, only=('id', 'username'))
    parrot_name = fields.Method('get_parrot_name', dump_only=True)
    created_by_username = fields.Method('get_created_by_username', dump_only=True)
    cleaning_type_text = fields.Method('get_cleaning_type_text', dump_only=True)
    
    def get_parrot_name(self, obj):
        return obj.parrot.name if obj.parrot else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
    
    def get_cleaning_type_text(self, obj):
        """将英文清洁类型转换为中文显示"""
        cleaning_type_map = {
            'cage': '笼子清洁',
            'toys': '玩具清洁', 
            'perches': '栖木清洁',
            'food_water': '食物和水清洁',
            'disinfection': '消毒',
            'water_change': '饮用水更换',
            'water_bowl_clean': '水碗清洁'
        }
        return cleaning_type_map.get(obj.cleaning_type, obj.cleaning_type)

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
    
    def get_male_parrot_name(self, obj):
        return obj.male_parrot.name if obj.male_parrot else None
    
    def get_female_parrot_name(self, obj):
        return obj.female_parrot.name if obj.female_parrot else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

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
