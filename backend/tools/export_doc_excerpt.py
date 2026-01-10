import os
import io

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
DOC_DIR = os.path.join(ROOT_DIR, 'docs', 'copyright')

DOC_FILE = '用户操作手册.md'
LINES_PER_PAGE = 35
PAGES = 30
FRONT_LINES = LINES_PER_PAGE * PAGES
BACK_LINES = LINES_PER_PAGE * PAGES

def read_lines(path):
    with io.open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read().splitlines()

def ensure_output_dir():
    os.makedirs(DOC_DIR, exist_ok=True)

def write_lines(path, lines):
    with io.open(path, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')

def main():
    ensure_output_dir()
    src_path = os.path.join(DOC_DIR, DOC_FILE)
    lines = read_lines(src_path)
    total = len(lines)
    front = lines[:FRONT_LINES] if total >= FRONT_LINES else lines
    back = lines[-BACK_LINES:] if total >= BACK_LINES else lines
    write_lines(os.path.join(DOC_DIR, '文档选段_前30页.txt'), front)
    write_lines(os.path.join(DOC_DIR, '文档选段_后30页.txt'), back)

if __name__ == '__main__':
    main()

