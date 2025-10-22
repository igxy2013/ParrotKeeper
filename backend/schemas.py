from marshmallow import Schema, fields, validate
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from models import User, Parrot, ParrotSpecies, FeedType, FeedingRecord, HealthRecord, CleaningRecord, BreedingRecord, Expense, Reminder

class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        exclude = ('created_at', 'updated_at')

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
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    feed_type = fields.Nested(FeedTypeSchema, dump_only=True)

class HealthRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = HealthRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))

class CleaningRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CleaningRecord
        load_instance = True
        exclude = ('created_at',)
    
    parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))

class BreedingRecordSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = BreedingRecord
        load_instance = True
        exclude = ('created_at', 'updated_at')
    
    male_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))
    female_parrot = fields.Nested(ParrotSchema, dump_only=True, only=('id', 'name'))

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