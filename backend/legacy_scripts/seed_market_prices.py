import pymysql
import os
from dotenv import load_dotenv
import json

# 加载环境变量
load_dotenv()

# 数据库配置
DB_HOST = os.getenv('DB_HOST', '192.168.0.60')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'mysql')
DB_PASSWORD = os.getenv('DB_PASSWORD', '12345678')
DB_NAME = os.getenv('DB_NAME', 'parrot_keeper')

def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def seed_market_prices():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # 1. 确保 market_prices 表存在
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS market_prices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                species VARCHAR(50) NOT NULL,
                color_name VARCHAR(100) NOT NULL,
                reference_price DECIMAL(10, 2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_species_color (species, color_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            cursor.execute(create_table_sql)
            print("确保 market_prices 表存在")

            # 2. 准备数据
            # 这里包含主要的5个品种：玄凤、虎皮、牡丹、和尚、小太阳
            # 价格仅为示例参考价
            
            # 清理废弃数据
            cursor.execute("DELETE FROM market_prices WHERE color_name IN ('绿肉桂和尚')")
            conn.commit()
            print("清理废弃价格数据")

            prices_data = [
                # --- 玄凤鹦鹉 (Cockatiel) ---
                {'species': '玄凤鹦鹉', 'color_name': '原始灰', 'reference_price': 65},
                {'species': '玄凤鹦鹉', 'color_name': '原始灰玄凤', 'reference_price': 65}, # 别名
                {'species': '玄凤鹦鹉', 'color_name': '黄化', 'reference_price': 90},
                {'species': '玄凤鹦鹉', 'color_name': '黄化玄凤', 'reference_price': 90},
                {'species': '玄凤鹦鹉', 'color_name': '珍珠', 'reference_price': 80},
                {'species': '玄凤鹦鹉', 'color_name': '珍珠玄凤', 'reference_price': 80},
                {'species': '玄凤鹦鹉', 'color_name': '古铜', 'reference_price': 100}, # 肉桂
                {'species': '玄凤鹦鹉', 'color_name': '肉桂', 'reference_price': 100},
                {'species': '玄凤鹦鹉', 'color_name': '派特', 'reference_price': 120},
                {'species': '玄凤鹦鹉', 'color_name': '白面', 'reference_price': 150},
                {'species': '玄凤鹦鹉', 'color_name': '白面原始', 'reference_price': 150},
                {'species': '玄凤鹦鹉', 'color_name': '白面珍珠', 'reference_price': 180},
                {'species': '玄凤鹦鹉', 'color_name': '白面派特', 'reference_price': 200},
                {'species': '玄凤鹦鹉', 'color_name': '白子', 'reference_price': 400}, # 白面黄化
                {'species': '玄凤鹦鹉', 'color_name': '白面黄化', 'reference_price': 400},
                {'species': '玄凤鹦鹉', 'color_name': '普黑', 'reference_price': 500}, # 原始黑牛
                
                # --- 虎皮鹦鹉 (Budgerigar) ---
                {'species': '虎皮鹦鹉', 'color_name': '原始绿', 'reference_price': 25},
                {'species': '虎皮鹦鹉', 'color_name': '原始蓝', 'reference_price': 25},
                {'species': '虎皮鹦鹉', 'color_name': '黄脸', 'reference_price': 35},
                {'species': '虎皮鹦鹉', 'color_name': '蛋白石', 'reference_price': 40},
                {'species': '虎皮鹦鹉', 'color_name': '灰翅', 'reference_price': 45},
                {'species': '虎皮鹦鹉', 'color_name': '大头', 'reference_price': 80}, # 泛指大头类
                {'species': '虎皮鹦鹉', 'color_name': '云斑', 'reference_price': 30},
                {'species': '虎皮鹦鹉', 'color_name': '彩虹', 'reference_price': 150},

                # --- 牡丹鹦鹉 (Lovebird) ---
                # 面类 (Rose-faced / Peach-faced)
                {'species': '牡丹鹦鹉', 'color_name': '绿桃', 'reference_price': 45}, # 原始绿
                {'species': '牡丹鹦鹉', 'color_name': '黄桃', 'reference_price': 55},
                {'species': '牡丹鹦鹉', 'color_name': '紫罗兰', 'reference_price': 150},
                {'species': '牡丹鹦鹉', 'color_name': '金顶', 'reference_price': 80},
                {'species': '牡丹鹦鹉', 'color_name': '银顶', 'reference_price': 120},
                {'species': '牡丹鹦鹉', 'color_name': '蓝牡丹', 'reference_price': 60},
                # 头类 (Masked / Fischer's)
                {'species': '牡丹鹦鹉', 'color_name': '棕头', 'reference_price': 50},
                {'species': '牡丹鹦鹉', 'color_name': '黑头', 'reference_price': 60},
                {'species': '牡丹鹦鹉', 'color_name': '普蓝', 'reference_price': 60}, # 蓝黑头
                {'species': '牡丹鹦鹉', 'color_name': '墨蓝', 'reference_price': 80},
                {'species': '牡丹鹦鹉', 'color_name': '钴蓝', 'reference_price': 100},

                # --- 和尚鹦鹉 (Monk Parakeet / Quaker) ---
                {'species': '和尚鹦鹉', 'color_name': '原始绿', 'reference_price': 3600},
                {'species': '和尚鹦鹉', 'color_name': '原始蓝', 'reference_price': 3600},
                {'species': '和尚鹦鹉', 'color_name': '肉桂绿', 'reference_price': 5500}, # 绿依莎
                {'species': '和尚鹦鹉', 'color_name': '肉桂蓝', 'reference_price': 5500}, # 蓝依莎
                {'species': '和尚鹦鹉', 'color_name': '重蓝', 'reference_price': 5500}, # 钴蓝
                {'species': '和尚鹦鹉', 'color_name': '灰和尚', 'reference_price': 3600},
                {'species': '和尚鹦鹉', 'color_name': '白和尚(Albino)', 'reference_price': 2500}, # 蓝白化
                {'species': '和尚鹦鹉', 'color_name': '黄和尚(Lutino)', 'reference_price': 3000}, # 绿白化(Lutino)

                # --- 小太阳鹦鹉 (Green Cheek Conure) ---
                {'species': '小太阳鹦鹉', 'color_name': '原始绿', 'reference_price': 200},
                {'species': '小太阳鹦鹉', 'color_name': '黄边', 'reference_price': 260},
                {'species': '小太阳鹦鹉', 'color_name': '肉桂', 'reference_price': 260},
                {'species': '小太阳鹦鹉', 'color_name': '凤梨', 'reference_price': 350},
                {'species': '小太阳鹦鹉', 'color_name': '蓝系原始', 'reference_price': 400}, # 蓝绿
                {'species': '小太阳鹦鹉', 'color_name': '蓝系黄边', 'reference_price': 500}, # 蓝黄边
                {'species': '小太阳鹦鹉', 'color_name': '蓝系肉桂', 'reference_price': 500}, # 蓝肉桂
                {'species': '小太阳鹦鹉', 'color_name': '蓝系凤梨', 'reference_price': 600}, # 蓝凤梨
                {'species': '小太阳鹦鹉', 'color_name': '香吉士', 'reference_price': 1500}, # 纯红腹/全红
                {'species': '小太阳鹦鹉', 'color_name': '赤红腹', 'reference_price': 800}, 
                {'species': '小太阳鹦鹉', 'color_name': '月亮', 'reference_price': 2000}, # 蓝化香吉士
                {'species': '小太阳鹦鹉', 'color_name': '薄荷', 'reference_price': 3000},
            ]

            # 3. 批量插入/更新
            inserted_count = 0
            for item in prices_data:
                sql = """
                INSERT INTO market_prices (species, color_name, reference_price)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    reference_price = VALUES(reference_price)
                """
                cursor.execute(sql, (item['species'], item['color_name'], item['reference_price']))
                inserted_count += 1
            
            conn.commit()
            print(f"成功更新/插入 {inserted_count} 条参考价格数据")

    except Exception as e:
        print(f"Error seeding market prices: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed_market_prices()
