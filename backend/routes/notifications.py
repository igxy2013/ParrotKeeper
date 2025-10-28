from flask import Blueprint, request, jsonify
import requests
import json
from utils import success_response, error_response
from config import Config

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('/send', methods=['POST'])
def send_subscription_message():
    """发送微信订阅消息"""
    try:
        data = request.get_json()
        
        # 验证必需参数
        required_fields = ['openid', 'template_id', 'data']
        for field in required_fields:
            if field not in data:
                return error_response(f'缺少必需参数: {field}')
        
        openid = data.get('openid')
        template_id = data.get('template_id')
        template_data = data.get('data')
        page = data.get('page', 'pages/index/index')  # 默认跳转页面
        
        # 获取微信access_token
        access_token = get_access_token()
        if not access_token:
            return error_response('获取access_token失败')
        
        # 构建微信API请求
        wechat_api_url = f'https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}'
        
        payload = {
            'touser': openid,
            'template_id': template_id,
            'page': page,
            'data': template_data
        }
        
        # 发送请求到微信API
        response = requests.post(wechat_api_url, json=payload)
        result = response.json()
        
        if result.get('errcode') == 0:
            return success_response('订阅消息发送成功', result)
        else:
            return error_response(f'订阅消息发送失败: {result.get("errmsg", "未知错误")}', result)
            
    except Exception as e:
        return error_response(f'发送订阅消息异常: {str(e)}')

def get_access_token():
    """获取微信access_token"""
    try:
        # 从配置中获取小程序的appid和secret
        appid = getattr(Config, 'WECHAT_APP_ID', None)
        secret = getattr(Config, 'WECHAT_APP_SECRET', None)
        
        if not appid or not secret:
            print('缺少微信小程序配置信息')
            return None
        
        url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}'
        response = requests.get(url)
        result = response.json()
        
        if 'access_token' in result:
            return result['access_token']
        else:
            print(f'获取access_token失败: {result}')
            return None
            
    except Exception as e:
        print(f'获取access_token异常: {str(e)}')
        return None