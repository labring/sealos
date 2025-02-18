## 应用打包工具代码


app.py中包含三个接口函数：  
1. /api/exportApp  
从launchpad导出应用，应用会导出到指定目录下。
参数参考测试代码：

```
import requests
import os

namespace = 'ns-admin'
appname = 'test'

# Flask应用程序的URL
flask_app_url = 'http://localhost:5002/api/exportApp?namespace={namespace}&&appname={appname}'

# 构造请求数据
data = {
    'images':
    [
        "nginx:latest",
        "arthas:dev"
    ],
    yaml_content = request.json.get('yaml')
}

# 发送POST请求
response = requests.post(f'{flask_app_url}', json=data)
```

生成的制品包路径中包含：
各个镜像文件tar包，yaml文件，元数据文件
其中元数据文件包含
```
{
    "name": "arthas", 
    "namespace": "ns-test", 
    "images": [
        {
            "name": "sealos.hub:5000/sealos/arthas:dev", 
            "path": "/root/.mxapps/ns-test/arthas/sealos.hub_5000_sealos_arthas_dev.tar"
        }, 
        {
            "name": "nginx", 
            "path": "/root/.mxapps/ns-test/arthas/nginx.tar"
        }
    ], 
    "nodeports": [
        {
            "internal_port": "80"
        }
    ]
}
```
nodeports是从yaml中解析出来的，用于在部署时更换端口

2. /api/downloadApp
流式下载模型

3. /api/deployAppWithImage
参数参考测试代码：

```
import requests
import os

# Flask应用程序的URL
flask_app_url = 'http://localhost:5002/api/deployAppWithImage'

# 构造请求数据
data = {
    'path': "/root/.mxapps/ns-test/arthas",
    # 'namespace': 'ns-test', # 无需传入namespace，会使用开发时使用过的ns，改变ns需要保证无其他应用会调用该应用
    'ports': {'2080': 30005, '80': 30006} # nodeport端口，支持在部署时替换
}

# 发送POST请求
response = requests.post(f'{flask_app_url}', json=data)

# 输出响应结果
if response.status_code == 200:
    print('Success:', response.json())
else:
    print('Error:', response.status_code, response.text)

```

从url中读取appname和namespace
appname = request.args.get('appname')
namespace = request.args.get('namespace')

从data中读取yaml和image名
yaml_content = request.json.get('yaml')
images = request.json.get('images')

详细逻辑见app.py

## 应用打包工具自身打包
```
# 全量打包
VERSION=${your-version} sh build.sh

# 极简包
VERSION=${your-version} sh build.sh -light
```
得到app${VERSION}.tar.gz和app${VERSION}-light.tar.gz的部署包

## 应用打包工具部署至k8s
解压后运行sh install.sh

## 查看deployapp日志
docker logs -f deployapp

## 查看applaunchpad日志
POD_NAME=$(kubectl get pods -n default | grep "sealos-applaunchpad-deployment" | awk '{print $1}')
kubectl logs -f $POD_NAME
