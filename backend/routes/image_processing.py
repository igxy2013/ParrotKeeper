from flask import Blueprint, request, jsonify, current_app
from utils import process_parrot_image, remove_background
import os

image_processing_bp = Blueprint('image_processing', __name__)

@image_processing_bp.route('/api/image/remove-background', methods=['POST'])
def remove_image_background():
    """一键抠图API - 移除图片背景"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': '未找到图片文件'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '未选择文件'}), 400
        
        # 处理图片：保存原图并生成抠图版本
        original_path, processed_path = process_parrot_image(file, 'processed')
        
        if not original_path:
            return jsonify({'error': '文件格式不支持'}), 400
        
        # 优先使用配置中的 BASE_URL；否则根据统一端口生成本地地址
        port = current_app.config.get('SERVER_PORT') or int(os.environ.get('SERVER_PORT') or 5075)
        base_url = current_app.config.get('BASE_URL') or f'http://localhost:{port}'
        response_data = {
            'original_url': f"{base_url}/uploads/{original_path}",
            'message': '图片上传成功'
        }
        
        if processed_path:
            response_data['processed_url'] = f"{base_url}/uploads/{processed_path}"
            response_data['message'] = '抠图处理成功'
        else:
            response_data['message'] = '图片上传成功，但抠图处理失败'
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': f'处理失败: {str(e)}'}), 500

@image_processing_bp.route('/api/image/process-existing', methods=['POST'])
def process_existing_image():
    """对已存在的图片进行抠图处理"""
    try:
        data = request.get_json()
        if not data or 'image_path' not in data:
            return jsonify({'error': '缺少图片路径参数'}), 400
        
        port = current_app.config.get('SERVER_PORT') or int(os.environ.get('SERVER_PORT') or 5075)
        base_url = current_app.config.get('BASE_URL') or f'http://localhost:{port}'
        # 获取相对路径并转换为绝对路径
        relative_path = data['image_path'].replace(f'{base_url}/uploads/', '')
        absolute_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)
        
        if not os.path.exists(absolute_path):
            return jsonify({'error': '图片文件不存在'}), 404
        
        # 进行抠图处理
        processed_path = remove_background(absolute_path)
        
        if processed_path:
            # 获取处理后文件的相对路径
            processed_filename = os.path.basename(processed_path)
            folder = os.path.dirname(relative_path)
            processed_relative_path = f"{folder}/{processed_filename}"
            
            return jsonify({
                'original_url': data['image_path'],
                'processed_url': f"{base_url}/uploads/{processed_relative_path}",
                'message': '抠图处理成功'
            }), 200
        else:
            return jsonify({'error': '抠图处理失败'}), 500
            
    except Exception as e:
        return jsonify({'error': f'处理失败: {str(e)}'}), 500
