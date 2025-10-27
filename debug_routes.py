import sys
sys.path.append('backend')

from app import create_app

app = create_app()

print("所有注册的路由:")
for rule in app.url_map.iter_rules():
    print(f"{rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")

print("\n查找成就相关路由:")
for rule in app.url_map.iter_rules():
    if 'achievement' in rule.rule.lower():
        print(f"{rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")

print("\n查找所有API路由:")
for rule in app.url_map.iter_rules():
    if '/api/' in rule.rule:
        print(f"{rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")