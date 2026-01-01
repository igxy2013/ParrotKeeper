#!/bin/bash
# backup_mysql.sh

# 备份配置
BACKUP_DIR="/data/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="parrot_breeding"
DB_HOST="acbim.cn"
DB_USER="MySQL"
DB_PASS="12345678"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
mysqldump -h$DB_HOST -u$DB_USER -p$DB_PASS \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete