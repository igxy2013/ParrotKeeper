from flask import Blueprint, request
from utils import login_required, success_response, error_response, save_uploaded_file
import re

upload_bp = Blueprint('upload', __name__, url_prefix='/api/upload')

@upload_bp.route('/image', methods=['POST'])
@login_required
def upload_image():
    """通用图片上传接口"""
    try:
        if 'file' not in request.files:
            return error_response('没有上传文件')
        
        file = request.files['file']
        if file.filename == '':
            return error_response('没有选择文件')
        # 分类参数：允许指定子目录保存
        raw_category = (request.form.get('category') or '').strip()
        # 标准化分隔符
        raw_category = raw_category.replace('\\', '/')
        # 安全校验：禁止路径穿越，限制字符集与长度
        if '..' in raw_category:
            raw_category = ''
        # 去除前导斜杠与重复斜杠
        raw_category = re.sub(r'^/+', '', raw_category)
        raw_category = re.sub(r'/+', '/', raw_category)
        # 仅允许 [a-zA-Z0-9/_-]，最大64字符；否则回退到根目录
        category = raw_category if re.fullmatch(r'[a-zA-Z0-9/_-]{1,64}', raw_category or '') else ''

        # 保存文件到上传根目录或指定子目录（由UPLOAD_FOLDER控制）
        file_path = save_uploaded_file(file, category)
        if not file_path:
            return error_response('文件格式不支持')
        
        from utils import get_or_create_square_thumbnail
        thumb = get_or_create_square_thumbnail(file_path, 128)
        return success_response({
            'url': file_path,
            'thumb_url': thumb
        }, '上传成功')
        
    except Exception as e:
        return error_response(f'上传失败: {str(e)}')
