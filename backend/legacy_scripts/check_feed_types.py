#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import mysql.connector
from config import Config

def check_feed_types():
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
        
        # 查询所有饲料类型
        cursor.execute("SELECT id, name, brand, type FROM feed_types ORDER BY id")
        feed_types = cursor.fetchall()
        
        print("数据库中的饲料类型记录：")
        print("-" * 60)
        print(f"{'ID':<5} {'名称':<20} {'品牌':<15} {'类型':<15}")
        print("-" * 60)
        
        for feed_type in feed_types:
            print(f"{feed_type[0]:<5} {feed_type[1]:<20} {feed_type[2] or 'N/A':<15} {feed_type[3]:<15}")
        
        print(f"\n总共找到 {len(feed_types)} 条饲料类型记录")
        
        # 检查是否有奶粉类型
        milk_powder_count = sum(1 for ft in feed_types if ft[3] == 'milk_powder')
        print(f"其中奶粉类型记录数量: {milk_powder_count}")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"查询数据库时出错: {e}")

if __name__ == "__main__":
    check_feed_types()