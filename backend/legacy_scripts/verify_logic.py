from datetime import date, datetime, timedelta

def test_logic(start_str, log_str):
    # start_str: "2025-11-27 18:00:00"
    # log_str: "2025-11-28"
    start_dt = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
    log_date = datetime.strptime(log_str, "%Y-%m-%d").date()
    
    # Logic from incubation.py
    log_dt_combined = datetime.combine(log_date, datetime.min.time())
    diff = log_dt_combined - start_dt
    day_idx = diff.days + 1
    if day_idx < 1: day_idx = 1
    return day_idx

print(f"Nov 27 18:00 vs Nov 27: {test_logic('2025-11-27 18:00:00', '2025-11-27')}")
print(f"Nov 27 18:00 vs Nov 28: {test_logic('2025-11-27 18:00:00', '2025-11-28')}")
print(f"Nov 27 18:00 vs Nov 29: {test_logic('2025-11-27 18:00:00', '2025-11-29')}")
