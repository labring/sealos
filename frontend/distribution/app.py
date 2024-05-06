from flask import Flask, request, jsonify
import subprocess
import os

app = Flask(__name__)

# 环境变量：集群域名
CLUSTER_DOMAIN = os.getenv('CLUSTER_DOMAIN')

# 辅助函数：执行shell命令
def run_command(command):
    try:
        subprocess.run(command, shell=True, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e.stderr.decode().strip()}")
        return e.stderr.decode().strip()

# API端点：部署应用程序
@app.route('/api/deployAppWithImage', methods=['POST'])
def deploy_app_with_image():
    # 获取请求参数
    namespace = request.args.get('namespace')
    if not namespace:
        return jsonify({'error': 'Namespace is required'}), 400
    appname = request.args.get('appname')
    if not appname:
        return jsonify({'error': 'Appname is required'}), 400
    images = request.json.get('images')
    if not images:
        return jsonify({'error': 'Images are required'}), 400
    yaml_content = request.json.get('yaml')
    if not yaml_content:
        return jsonify({'error': 'YAML is required'}), 400

    # 加载和推送镜像
    for image in images:
        name = image['name'].strip()
        path = image['path']

        # 登录镜像仓库
        err = run_command('sealos login -u admin -p passw0rd sealos.hub:5000')
        if err:
            return jsonify({'error': 'Failed to login, ' + err}), 500

        # 加载镜像
        err = run_command(f'sealos load -i {path}')
        if err:
            return jsonify({'error': 'Failed to load image, ' + err}), 500
        # 替换域名并推送镜像
        parts = name.split('/')
        if len(parts) == 3:
            new_name = 'sealos.hub:5000/' + '/'.join(parts[1:])
        elif len(parts) == 1:
            new_name = f'sealos.hub:5000/library/{name}'
        elif len(parts) == 2:
            new_name = f'sealos.hub:5000/{name}'
        else:
            return jsonify({'error': 'Invalid image name: ' + name}), 400
        err = run_command(f'sealos tag {name} {new_name}')
        if err:
            return jsonify({'error': 'Failed to tag image, ' + err}), 500
        err = run_command(f'sealos push {new_name}')
        if err:
            return jsonify({'error': 'Failed to push image, ' + err}), 500

    # 替换yaml中的CLUSTER_DOMAIN
    yaml_content = yaml_content.replace('CLUSTER_DOMAIN', CLUSTER_DOMAIN)
    with open('temp.yaml', 'w') as file:
        file.write(yaml_content)

    # 调用kubectl部署应用
    apply_command = f'kubectl apply -n {namespace} --kubeconfig=/etc/kubernetes/admin.conf -f temp.yaml'
    err = run_command(apply_command)

    if err:
        return jsonify({'error': 'Failed to apply application, ' + err}), 500

    # 返回成功响应
    detail_url = f'http://{CLUSTER_DOMAIN}:32293/app/detail?namespace={namespace}&&name={appname}'
    return jsonify({'message': 'Application deployed successfully', 'url': detail_url}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)