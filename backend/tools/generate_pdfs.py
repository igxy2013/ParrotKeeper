import os
import io
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
DOC_DIR = os.path.join(ROOT_DIR, 'docs', 'copyright')
SOFTWARE_NAME = '鹦鹉管家（ParrotKeeper）'
VERSION = 'v1.0.0'

TARGETS = [
    ('源程序选段_前30页.txt', '源程序选段_前30页.pdf', 'code_fixed'),
    ('源程序选段_后30页.txt', '源程序选段_后30页.pdf', 'code_fixed'),
    ('文档选段_前30页.txt', '用户操作手册_前30页.pdf', 'doc_fixed'),
    ('文档选段_后30页.txt', '用户操作手册_后30页.pdf', 'doc_fixed'),
]

# A4 尺寸：像素（约200DPI）
PAGE_W, PAGE_H = 1654, 2339
MARGIN = 90
HEADER_H = 90

def find_font(preferred_names):
    # Windows 字体目录
    candidates = []
    fonts_dir = r"C:\\Windows\\Fonts"
    if os.path.isdir(fonts_dir):
        for name in preferred_names:
            p = os.path.join(fonts_dir, name)
            candidates.append(p)
    # 也尝试相对路径
    for name in preferred_names:
        candidates.append(name)
    for p in candidates:
        if os.path.isfile(p):
            try:
                # 快速测试能否加载
                ImageFont.truetype(p, 20)
                return p
            except Exception:
                continue
    return None

def load_fonts():
    # 中文字体优先
    cjk_names = [
        'msyh.ttc', 'msyh.ttf', 'Microsoft YaHei.ttf',
        'SimSun.ttc', 'SimSun.ttf', 'simhei.ttf',
        'NotoSansCJK-Regular.ttc', 'SourceHanSansSC-Regular.otf'
    ]
    mono_names = [
        'consola.ttf', 'CascadiaMono.ttf', 'Courier New.ttf', 'cour.ttf'
    ]
    cjk = find_font(cjk_names)
    mono = find_font(mono_names) or cjk
    return cjk, mono

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()

def wrap_text(draw, text, font, max_width):
    # 基于像素宽度的简单换行
    lines = []
    for raw_line in text.split('\n'):
        if not raw_line:
            lines.append('')
            continue
        current = ''
        for ch in raw_line:
            test = current + ch
            w = draw.textlength(test, font=font)
            if w <= max_width:
                current = test
            else:
                lines.append(current)
                current = ch
        lines.append(current)
    return lines

def draw_header(img, left_text, right_text, font_path):
    d = ImageDraw.Draw(img)
    d.rectangle([(0, 0), (PAGE_W, HEADER_H)], fill=(245, 245, 245))
    header_font = get_font(font_path, 26)
    d.text((MARGIN, 20), left_text, fill=(0, 0, 0), font=header_font)
    rt_w = d.textlength(right_text, font=header_font)
    d.text((PAGE_W - MARGIN - rt_w, 20), right_text, fill=(0, 0, 0), font=header_font)

def render_pages_from_text(content, font_path, font_size, line_spacing, title=None, use_header=True):
    pages = []
    font = get_font(font_path, font_size)
    draw = ImageDraw.Draw(Image.new('RGB', (PAGE_W, PAGE_H)))
    max_text_width = PAGE_W - 2 * MARGIN
    wrapped_lines = wrap_text(draw, content, font, max_text_width)
    y = MARGIN + (HEADER_H if use_header else 0)
    line_h = int(font_size * line_spacing)
    img = Image.new('RGB', (PAGE_W, PAGE_H), color='white')
    d = ImageDraw.Draw(img)

    if use_header:
        draw_header(img, f"{SOFTWARE_NAME} {VERSION}", title or '', font_path)
        y = MARGIN + HEADER_H
    elif title:
        title_font = get_font(font_path, font_size + 8)
        d.text((MARGIN, y), title, fill=(0, 0, 0), font=title_font)
        y += int((font_size + 8) * line_spacing) + 10

    for line in wrapped_lines:
        if y + line_h > PAGE_H - MARGIN:
            pages.append(img)
            img = Image.new('RGB', (PAGE_W, PAGE_H), color='white')
            d = ImageDraw.Draw(img)
            if use_header:
                draw_header(img, f"{SOFTWARE_NAME} {VERSION}", title or '', font_path)
                y = MARGIN + HEADER_H
            else:
                y = MARGIN
        d.text((MARGIN, y), line, fill=(0, 0, 0), font=font)
        y += line_h
    pages.append(img)
    return pages

def render_pages_fixed_lines(lines, font_path, font_size, lines_per_page, title):
    pages = []
    y_start = MARGIN + HEADER_H
    line_h = int(font_size * 1.25)
    font = get_font(font_path, font_size)
    total = len(lines)
    idx = 0
    while idx < total:
        img = Image.new('RGB', (PAGE_W, PAGE_H), color='white')
        draw_header(img, f"{SOFTWARE_NAME} {VERSION}", title or '', font_path)
        d = ImageDraw.Draw(img)
        y = y_start
        for _ in range(lines_per_page):
            if idx >= total:
                break
            d.text((MARGIN, y), lines[idx], fill=(0, 0, 0), font=font)
            y += line_h
            idx += 1
        pages.append(img)
    return pages

def read_file(path):
    with io.open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def save_pdf(images, out_path):
    if not images:
        return
    base = images[0]
    others = images[1:]
    base.save(out_path, save_all=True, append_images=others)

def main():
    os.makedirs(DOC_DIR, exist_ok=True)
    cjk_font_path, mono_font_path = load_fonts()
    if cjk_font_path is None:
        # 尝试使用系统默认字体（可能无法完整显示中文）
        cjk_font_path = mono_font_path

    for src_name, pdf_name, kind in TARGETS:
        src_path = os.path.join(DOC_DIR, src_name)
        out_path = os.path.join(DOC_DIR, pdf_name)
        if not os.path.isfile(src_path):
            continue
        content = read_file(src_path).replace('\t', '    ')
        if kind == 'code_fixed':
            lines = content.splitlines()
            pages = render_pages_fixed_lines(lines, cjk_font_path, font_size=20, lines_per_page=55, title=os.path.splitext(src_name)[0])
        elif kind == 'doc_fixed':
            lines = content.splitlines()
            pages = render_pages_fixed_lines(lines, cjk_font_path, font_size=24, lines_per_page=30, title=os.path.splitext(src_name)[0])
        else:
            pages = render_pages_from_text(
                content, cjk_font_path, font_size=24, line_spacing=1.30, title=os.path.splitext(src_name)[0], use_header=True
            )
        save_pdf(pages, out_path)

if __name__ == '__main__':
    main()
