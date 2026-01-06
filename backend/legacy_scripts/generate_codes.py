import random
import string
import sys
import os
from datetime import datetime

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, RedemptionCode, User

app = create_app()

def generate_code(length=12):
    """生成易读的兑换码 (大写字母+数字，排除易混淆字符)"""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' # 排除 I, O, 1, 0
    return ''.join(random.choices(chars, k=length))

def create_codes(count=1, tier='pro', duration_days=30, admin_user_id=None):
    """
    批量生成兑换码
    :param count: 数量
    :param tier: 'pro' 或 'team'
    :param duration_days: 有效天数 (30=月卡, 365=年卡, 36500=终身)
    :param admin_user_id: 创建者ID (可选)
    """
    with app.app_context():
        created_codes = []
        for _ in range(count):
            while True:
                code_str = generate_code()
                # 检查重复
                if not RedemptionCode.query.filter_by(code=code_str).first():
                    break
            
            code = RedemptionCode(
                code=code_str,
                tier=tier,
                duration_days=duration_days,
                created_by_user_id=admin_user_id
            )
            db.session.add(code)
            created_codes.append(code_str)
        
        db.session.commit()
        
        # 格式化输出
        desc_map = {30: '月卡', 365: '年卡', 36500: '终身'}
        desc = desc_map.get(duration_days, f'{duration_days}天')
        
        print(f"=== 已生成 {count} 个 {tier.upper()} {desc} 兑换码 ===")
        for c in created_codes:
            print(c)
        print("==========================================")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_codes.py <count> [tier] [days]")
        print("Example: python generate_codes.py 5 pro 30")
        sys.exit(1)
        
    count = int(sys.argv[1])
    tier = sys.argv[2] if len(sys.argv) > 2 else 'pro'
    days = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    
    # 尝试查找第一个超级管理员作为创建者
    with app.app_context():
        admin = User.query.filter_by(role='super_admin').first()
        admin_id = admin.id if admin else None
        
    create_codes(count, tier, days, admin_id)
