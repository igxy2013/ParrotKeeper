#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import mysql.connector
from config import Config

def update_feed_type_enum():
    try:
        # 连接数据库
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # 更新 feed_types 表的 type 字段枚举值
        alter_query = """
        ALTER TABLE feed_types 
        MODIFY COLUMN type ENUM('seed', 'pellet', 'fruit', 'vegetable', 'supplement', 'milk_powder') 
        NOT NULL
        """
        
        print("正在更新 feed_types 表的 type 字段枚举值...")
        cursor.execute(alter_query)
        connection.commit()
        print("成功更新 feed_types 表的 type 字段枚举值")
        
        # 现在添加奶粉类型记录
        print("正在添加奶粉类型记录...")
        
        # 检查是否已存在奶粉类型
        cursor.execute("SELECT COUNT(*) FROM feed_types WHERE type = 'milk_powder'")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print(f"数据库中已存在 {count} 条奶粉类型记录")
        else:
            # 添加奶粉类型记录
            insert_query = """
            INSERT INTO feed_types (name, brand, type) 
            VALUES ('幼鸟奶粉', '营养鸟', 'milk_powder')
            """
            cursor.execute(insert_query)
            connection.commit()
            print("成功添加奶粉类型记录")
        
        # 查询所有饲料类型以确认
        cursor.execute("SELECT id, name, brand, type FROM feed_types ORDER BY id")
        feed_types = cursor.fetchall()
        
        print("\n当前数据库中的所有饲料类型记录：")
        print("-" * 60)
        print(f"{'ID':<5} {'名称':<20} {'品牌':<15} {'类型':<15}")
        print("-" * 60)
        
        for feed_type in feed_types:
            print(f"{feed_type[0]:<5} {feed_type[1]:<20} {feed_type[2] or 'N/A':<15} {feed_type[3]:<15}")
        
        print(f"\n总共 {len(feed_types)} 条饲料类型记录")
        
        # 检查奶粉类型数量
        milk_powder_count = sum(1 for ft in feed_types if ft[3] == 'milk_powder')
        print(f"其中奶粉类型记录数量: {milk_powder_count}")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"操作数据库时出错: {e}")

if __name__ == "__main__":
    update_feed_type_enum()