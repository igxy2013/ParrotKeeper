from flask import Blueprint, request, jsonify, current_app
from utils import process_parrot_image, remove_background
import os
import re

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
        
        base_url = current_app.config.get('BASE_URL', 'http://localhost:5075')
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
        print(f"收到抠图请求，请求数据: {data}")  # 添加日志以便调试
        
        if not data or 'image_path' not in data:
            print("请求缺少图片路径参数")  # 添加日志
            return jsonify({'error': '缺少图片路径参数'}), 400
        
        # 统一解析 base_url 为当前请求主机，避免与后端配置不一致
        request_base = f"{request.scheme}://{request.host}"
        configured_base = current_app.config.get('BASE_URL') or request_base

        # 解析传入的图片路径：支持完整URL与相对路径
        raw_path = str(data['image_path']).strip()
        print(f"原始图片路径: {raw_path}")  # 添加日志
        
        relative_path = raw_path
        if re.match(r'^https?://', raw_path):
            m = re.search(r"/uploads/(.+)$", raw_path)
            if not m:
                print("图片URL不合法，缺少 /uploads/ 前缀")  # 添加日志
                return jsonify({'error': '图片URL不合法，缺少 /uploads/ 前缀'}), 400
            relative_path = m.group(1)
        else:
            # 去除可能的前导 /uploads/ 或 /images/ 前缀
            relative_path = re.sub(r'^/?uploads/?', '', relative_path)
            relative_path = re.sub(r'^/?images/?', '', relative_path)

        # 标准化分隔符，防止路径穿越
        relative_path = relative_path.replace('\\', '/').strip('/')
        if '..' in relative_path:
            print("非法路径，包含 ..")  # 添加日志
            return jsonify({'error': '非法路径'}), 400

        upload_root = current_app.config['UPLOAD_FOLDER']
        absolute_path = os.path.normpath(os.path.join(upload_root, relative_path))
        print(f"上传根目录: {upload_root}")  # 添加日志
        print(f"相对路径: {relative_path}")  # 添加日志
        print(f"绝对路径: {absolute_path}")  # 添加日志
        
        # 确保仍在上传根目录下
        if not absolute_path.startswith(os.path.normpath(upload_root)):
            print("非法路径，不在上传根目录下")  # 添加日志
            return jsonify({'error': '非法路径'}), 400

        if not os.path.exists(absolute_path):
            print(f"图片文件不存在: {absolute_path}")  # 添加日志
            return jsonify({'error': '图片文件不存在'}), 404

        # 进行抠图处理
        processed_path = remove_background(absolute_path)
        print(f"抠图处理结果路径: {processed_path}")  # 添加日志

        if processed_path:
            # 获取处理后文件的相对路径
            processed_filename = os.path.basename(processed_path)
            folder = os.path.dirname(relative_path)
            processed_relative_path = f"{folder}/{processed_filename}" if folder else processed_filename

            return jsonify({
                'original_url': raw_path,
                'processed_url': f"{request_base}/uploads/{processed_relative_path}",
                'message': '抠图处理成功'
            }), 200
        else:
            # remove_background 已记录详细失败原因，这里返回明确的错误
            print("抠图处理失败")  # 添加日志
            return jsonify({'error': '抠图处理失败，请稍后重试'}), 502
            
    except Exception as e:
        print(f"处理失败异常: {str(e)}")  # 添加日志
        return jsonify({'error': f'处理失败: {str(e)}'}), 500
