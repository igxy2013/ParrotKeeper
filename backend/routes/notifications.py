from flask import Blueprint, request, jsonify, current_app
import requests
import json
from utils import success_response, error_response
import time

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

_cached_token = None
_cached_expire_at = 0

def get_access_token(force_refresh=False):
    """获取微信access_token，优先使用稳定版接口，并加入简单缓存"""
    global _cached_token, _cached_expire_at
    try:
        cfg = current_app.config if current_app else {}
        appid = cfg.get('WECHAT_APP_ID')
        secret = cfg.get('WECHAT_APP_SECRET')

        if not appid or not secret:
            print('缺少微信小程序配置信息')
            return None

        now = time.time()
        # 在剩余5分钟以上的有效期内使用缓存，减少接口调用频率
        if _cached_token and (_cached_expire_at - now > 300) and not force_refresh:
            return _cached_token

        # 1) 尝试稳定版接口（POST）
        stable_url = 'https://api.weixin.qq.com/cgi-bin/stable_token'
        stable_payload = {
            'grant_type': 'client_credential',
            'appid': appid,
            'secret': secret,
            'force_refresh': bool(force_refresh)
        }
        try:
            resp = requests.post(stable_url, json=stable_payload)
            data = resp.json()
            if 'access_token' in data:
                _cached_token = data['access_token']
                expires_in = int(data.get('expires_in', 300))
                _cached_expire_at = now + max(expires_in, 300)
                return _cached_token
            # 若返回错误，打印并继续尝试普通接口
            print(f'稳定版access_token失败: {data}')
        except Exception as e:
            print(f'稳定版access_token异常: {str(e)}')

        # 2) 回退到普通接口（GET）
        url = f'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appid}&secret={secret}'
        response = requests.get(url)
        result = response.json()
        if 'access_token' in result:
            _cached_token = result['access_token']
            expires_in = int(result.get('expires_in', 300))
            _cached_expire_at = now + max(expires_in, 300)
            return _cached_token
        else:
            # 45009 等频率限制错误，提示改用稳定版接口（已尝试过）
            print(f'获取access_token失败: {result}')
            return None
    except Exception as e:
        print(f'获取access_token异常: {str(e)}')
        return None
