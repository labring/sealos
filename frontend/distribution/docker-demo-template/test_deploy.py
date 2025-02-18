import requests
import os

# Flask应用程序的URL
flask_app_url = 'http://localhost:5002/api/deployAppWithImage'

# 构造请求数据
data = {
    'path': "/root/.mxapps/ns-test/arthas",
    # 'namespace': 'ns-test', # 无需传入namespace，会使用开发时使用过的ns，改变ns需要保证无其他应用会调用该应用
    'ports': {'2080': 30005, '80': 30006}
}

# 发送POST请求
response = requests.post(f'{flask_app_url}', json=data)

# 输出响应结果
if response.status_code == 200:
    print('Success:', response.json())
else:
    print('Error:', response.status_code, response.text)