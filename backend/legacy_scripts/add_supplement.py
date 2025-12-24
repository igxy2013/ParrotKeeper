import mysql.connector
from config import Config

def main():
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        # 检查是否存在名为“保健品”的保健品类型记录
        cursor.execute(
            "SELECT COUNT(*) FROM feed_types WHERE type = %s AND name = %s",
            ('supplement', '保健品')
        )
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute(
                "INSERT INTO feed_types (name, brand, type) VALUES (%s, %s, %s)",
                ('保健品', '通用', 'supplement')
            )
            connection.commit()
            print('已插入保健品类型记录：name=保健品, brand=通用, type=supplement')
        else:
            print("数据库中已存在名为“保健品”的保健品类型记录")

        cursor.close()
        connection.close()
    except Exception as e:
        print(f"操作数据库时出错: {e}")

if __name__ == '__main__':
    main()
