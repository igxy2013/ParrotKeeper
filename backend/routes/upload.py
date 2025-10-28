from flask import Blueprint, request
from utils import login_required, success_response, error_response, save_uploaded_file

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
        
        # 保存文件到上传根目录（由UPLOAD_FOLDER控制）
        file_path = save_uploaded_file(file, '')
        if not file_path:
            return error_response('文件格式不支持')
        
        return success_response({
            'url': file_path
        }, '上传成功')
        
    except Exception as e:
        return error_response(f'上传失败: {str(e)}')
