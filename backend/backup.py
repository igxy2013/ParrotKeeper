import os
from datetime import datetime, timedelta
from sqlalchemy import text, inspect
from config import Config
from models import db, SystemSetting, BackupLog
import pymysql

def _get_setting_str(key, default=None):
    try:
        row = SystemSetting.query.filter_by(key=key).first()
        val = (row.value if row and row.value is not None else None)
        if val is None:
            return default
        return str(val)
    except Exception:
        return default

def _get_setting_int(key, default=0):
    try:
        s = _get_setting_str(key, None)
        if s is None or str(s).strip() == '':
            return default
        return int(str(s).strip())
    except Exception:
        return default

def _get_setting_bool(key, default=False):
    try:
        s = _get_setting_str(key, None)
        if s is None:
            return default
        v = str(s).strip().lower()
        if v in ['1','true','yes','y','on']:
            return True
        if v in ['0','false','no','n','off']:
            return False
        return default
    except Exception:
        return default

def _get_remote_conn():
    host = _get_setting_str('BACKUP_REMOTE_HOST', getattr(Config, 'BACKUP_REMOTE_HOST', None))
    port = _get_setting_int('BACKUP_REMOTE_PORT', getattr(Config, 'BACKUP_REMOTE_PORT', 3306))
    user = _get_setting_str('BACKUP_REMOTE_USER', getattr(Config, 'BACKUP_REMOTE_USER', None))
    password = _get_setting_str('BACKUP_REMOTE_PASSWORD', getattr(Config, 'BACKUP_REMOTE_PASSWORD', None))
    if not host or not user or password is None:
        return None
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, charset='utf8mb4', autocommit=True)
        return conn
    except Exception:
        return None

def _ensure_remote_db(conn, db_name):
    cur = conn.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci")
    cur.execute(f"USE `{db_name}`")
    cur.close()

def _list_tables():
    inspector = inspect(db.engine)
    return inspector.get_table_names()

def _show_create_table(table_name):
    r = db.session.execute(text(f"SHOW CREATE TABLE `{table_name}`")).fetchone()
    return r[1] if r and len(r) > 1 else None

def _fetch_rows(table_name):
    with db.engine.connect() as conn:
        rows = conn.execute(text(f"SELECT * FROM `{table_name}`")).fetchall()
        cols = conn.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
        col_names = [c[0] for c in cols]
        return col_names, rows

def _truncate_remote_table(conn, table_name):
    cur = conn.cursor()
    cur.execute(f"SET FOREIGN_KEY_CHECKS=0")
    cur.execute(f"DROP TABLE IF EXISTS `{table_name}`")
    cur.execute(f"SET FOREIGN_KEY_CHECKS=1")
    cur.close()

def _create_remote_table(conn, create_sql):
    cur = conn.cursor()
    cur.execute(create_sql)
    cur.close()

def _insert_rows(conn, table_name, col_names, rows):
    if not rows:
        return
    placeholders = ",".join(["%s"] * len(col_names))
    cols = ",".join([f"`{c}`" for c in col_names])
    sql = f"INSERT INTO `{table_name}` ({cols}) VALUES ({placeholders})"
    cur = conn.cursor()
    cur.executemany(sql, [tuple(r) for r in rows])
    cur.close()

def _prune_old_backups(conn, prefix, keep_days):
    try:
        cur = conn.cursor()
        cur.execute("SHOW DATABASES")
        all_dbs = [row[0] for row in cur.fetchall()]
        cur.close()
        to_drop = []
        for name in all_dbs:
            if name.startswith(prefix):
                try:
                    date_str = name[len(prefix):]
                    dt = datetime.strptime(date_str, "%Y%m%d")
                    if datetime.utcnow() - dt > timedelta(days=keep_days):
                        to_drop.append(name)
                except Exception:
                    pass
        for db_name in to_drop:
            c = conn.cursor()
            c.execute(f"DROP DATABASE `{db_name}`")
            c.close()
    except Exception:
        pass

def backup_database_to_remote():
    enabled = _get_setting_bool('BACKUP_ENABLED', getattr(Config, 'BACKUP_ENABLED', False))
    if not enabled:
        print("数据库备份未启用")
        return
    remote = _get_remote_conn()
    if not remote:
        print("远程数据库连接失败")
        return
    src_db = _get_setting_str('DB_NAME', getattr(Config, 'DB_NAME', 'parrot_breeding'))
    prefix = _get_setting_str('BACKUP_REMOTE_DB_PREFIX', getattr(Config, 'BACKUP_REMOTE_DB_PREFIX', f"{src_db}_backup_"))
    today = datetime.utcnow().strftime("%Y%m%d")
    target_db = f"{prefix}{today}"
    keep_days = _get_setting_int('BACKUP_RETENTION_DAYS', getattr(Config, 'BACKUP_RETENTION_DAYS', 7))
    log = BackupLog(op_type='backup', status='running', target_db=target_db)
    try:
        db.session.add(log)
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
    try:
        _ensure_remote_db(remote, target_db)
        tables = _list_tables()
        cur = remote.cursor()
        cur.execute("SET FOREIGN_KEY_CHECKS=0")
        cur.close()
        for t in tables:
            create_sql = _show_create_table(t)
            if not create_sql:
                continue
            _truncate_remote_table(remote, t)
            _create_remote_table(remote, create_sql)
            cols, rows = _fetch_rows(t)
            _insert_rows(remote, t, cols, rows)
        cur = remote.cursor()
        cur.execute("SET FOREIGN_KEY_CHECKS=1")
        cur.close()
        _prune_old_backups(remote, prefix, keep_days)
        print(f"数据库已备份到 {target_db}")
        try:
            log.status = 'success'
            log.finished_at = datetime.utcnow()
            log.message = f"备份完成: {target_db}"
            db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass
    except Exception as e:
        print(f"数据库备份失败: {str(e)}")
        try:
            log.status = 'failed'
            log.finished_at = datetime.utcnow()
            log.message = str(e)
            db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass
    finally:
        try:
            remote.close()
        except Exception:
            pass

def _table_has_column(table_name, col):
    cols = db.session.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
    return any(str(r[0]) == col for r in cols)

def _ensure_remote_table_exists(conn, table_name, create_sql):
    c = conn.cursor()
    c.execute("SHOW TABLES")
    existing = [row[0] for row in c.fetchall()]
    if table_name not in existing:
        c.execute(create_sql)
    c.close()

def _select_changed_rows(table_name, last_ts):
    ts_col = None
    if _table_has_column(table_name, 'updated_at'):
        ts_col = 'updated_at'
    elif _table_has_column(table_name, 'created_at'):
        ts_col = 'created_at'
    cols = db.session.execute(text(f"SHOW COLUMNS FROM `{table_name}`")).fetchall()
    col_names = [c[0] for c in cols]
    if ts_col and last_ts:
        q = text(f"SELECT * FROM `{table_name}` WHERE `{ts_col}` >= :last_ts")
        rows = db.session.execute(q, { 'last_ts': last_ts }).fetchall()
    else:
        rows = db.session.execute(text(f"SELECT * FROM `{table_name}`")).fetchall()
    return col_names, rows

def _upsert_rows(conn, table_name, col_names, rows):
    if not rows:
        return
    cols = ",".join([f"`{c}`" for c in col_names])
    placeholders = ",".join(["%s"] * len(col_names))
    updates = ",".join([f"`{c}`=VALUES(`{c}`)" for c in col_names])
    sql = f"INSERT INTO `{table_name}` ({cols}) VALUES ({placeholders}) ON DUPLICATE KEY UPDATE {updates}"
    cur = conn.cursor()
    cur.executemany(sql, [tuple(r) for r in rows])
    cur.close()

def sync_database_to_remote():
    enabled = _get_setting_bool('SYNC_ENABLED', getattr(Config, 'SYNC_ENABLED', False))
    if not enabled:
        return
    remote = _get_remote_conn()
    if not remote:
        return
    src_db = _get_setting_str('DB_NAME', getattr(Config, 'DB_NAME', 'parrot_breeding'))
    target_db = _get_setting_str('BACKUP_REMOTE_DB_NAME', getattr(Config, 'BACKUP_REMOTE_DB_NAME', src_db))
    log = BackupLog(op_type='sync', status='running', target_db=target_db)
    try:
        db.session.add(log)
        db.session.commit()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
    try:
        _ensure_remote_db(remote, target_db)
        tables = _list_tables()
        c = remote.cursor()
        c.execute("SET FOREIGN_KEY_CHECKS=0")
        c.execute(f"USE `{target_db}`")
        c.close()
        last_row = SystemSetting.query.filter_by(key='REMOTE_SYNC_LAST_TS').first()
        last_ts = None
        if last_row and last_row.value:
            try:
                last_ts = datetime.fromisoformat(str(last_row.value))
            except Exception:
                last_ts = None
        for t in tables:
            create_sql = _show_create_table(t)
            if not create_sql:
                continue
            _ensure_remote_table_exists(remote, t, create_sql)
            col_names, rows = _select_changed_rows(t, last_ts)
            _upsert_rows(remote, t, col_names, rows)
        now = datetime.utcnow().isoformat()
        if not last_row:
            last_row = SystemSetting(key='REMOTE_SYNC_LAST_TS', value=now)
            db.session.add(last_row)
        else:
            last_row.value = now
        db.session.commit()
        try:
            log.status = 'success'
            log.finished_at = datetime.utcnow()
            log.message = "增量同步完成"
            db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            pass
        try:
            log.status = 'failed'
            log.finished_at = datetime.utcnow()
            log.message = '同步失败'
            db.session.commit()
        except Exception:
            try:
                db.session.rollback()
            except Exception:
                pass
    finally:
        try:
            cur = remote.cursor()
            cur.execute("SET FOREIGN_KEY_CHECKS=1")
            cur.close()
            remote.close()
        except Exception:
            pass

