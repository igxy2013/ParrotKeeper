import os
import io

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
OUTPUT_DIR = os.path.join(ROOT_DIR, 'docs', 'copyright')

INCLUDE_EXTS = {'.py', '.js', '.json', '.wxml', '.wxss', '.vue', '.sql', '.md'}
EXCLUDE_DIRS = {'.git', 'node_modules', 'miniprogram_npm', '.trae', '__pycache__', 'venv', 'env', '.venv', 'uploads', 'logs'}

LINES_PER_PAGE = 55
PAGES = 30
FRONT_LINES = LINES_PER_PAGE * PAGES
BACK_LINES = LINES_PER_PAGE * PAGES

def should_exclude_dir(path):
    parts = os.path.normpath(path).split(os.sep)
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
    return False

def collect_files():
    files = []
    for root, dirs, filenames in os.walk(ROOT_DIR):
        if should_exclude_dir(root):
            continue
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in INCLUDE_EXTS:
                files.append(os.path.join(root, name))
    files.sort()
    return files

def read_file_lines(path):
    try:
        with io.open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read().splitlines()
    except Exception:
        return []

def build_combined_lines(files):
    lines = []
    for fp in files:
        rel = os.path.relpath(fp, ROOT_DIR)
        lines.append(f"===== 文件: {rel} =====")
        content_lines = read_file_lines(fp)
        for i, line in enumerate(content_lines, start=1):
            lines.append(f"{i:04d}: {line}")
    return lines

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def write_lines(path, lines):
    with io.open(path, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')

def main():
    ensure_output_dir()
    files = collect_files()
    combined = build_combined_lines(files)
    total = len(combined)

    front = combined[:FRONT_LINES] if total >= FRONT_LINES else combined
    back = combined[-BACK_LINES:] if total >= BACK_LINES else combined

    front_path = os.path.join(OUTPUT_DIR, '源程序选段_前30页.txt')
    back_path = os.path.join(OUTPUT_DIR, '源程序选段_后30页.txt')

    write_lines(front_path, front)
    write_lines(back_path, back)

    summary_path = os.path.join(OUTPUT_DIR, '源程序选段_合并摘要.txt')
    write_lines(summary_path, [f"总行数: {total}", f"前段行数: {len(front)}", f"后段行数: {len(back)}"])

if __name__ == '__main__':
    main()
