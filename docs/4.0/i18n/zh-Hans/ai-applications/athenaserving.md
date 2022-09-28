# AthenaServing Framework (ASF)

## 愿景

给任何有需要使用AI能力的场景，提供一致的工程化管理AI能力的方案。任何领域的AI场景的用户，都可以快速的将其算法模型落地成统一标准的HTTP API服务。

## 框架介绍

`AthenaServing Framework(下简称ASF)` AI推理服务框架依托科大讯飞多年的AI算法引擎云服务化经验及云原生的不断探索实践,不仅可以满足引擎云服务化后,服务的稳定性,也可以通过`ASF`
享受到相关云原生组件的方便与快捷。AI算法引擎开发者可以专注于算法的演进与研究,无需分心进行硬件资源的管理及云服务化的诸多开发运维工作。

`ASF`是一个专为AI能力开发者打造的AI算法引擎的无服务全托管式平台框架，您可以通过集成 `ASF`
中提供的插件，快速的部署AI算法引擎，并使用网络、分发策略、数据处理等配套辅助系统。引擎托管平台致力于加速AI算法引擎云服务化，并借助云原生架构，为云服务的稳定提供多重保障，您无需关注底层基础设施及服务化相关的开发、治理和运维，即可高效、安全对引擎进行部署、升级、扩缩、运营和监控。

目前部署 `ASF` 需要开发者掌握一定的K8s、helm 等相关知识，且安装部署依赖在线镜像仓库和 helm repo，在离线环境、各式各样的操作系统部署的需求面前有些乏力，sealos 以其`集群镜像`、`images-shim`
等方案让应用可以让离线部署变得非常丝滑，无需任何额外操作，sealos 支持了 `ASF` 集群镜像后，让任何人在任何场景、任何环境无障碍交付 `ASF` , 仅需一条命令即可拉起一个 `ASF` 环境。用户可以在 `ASF`
框架上集中部署自己的AI能力，对外提供HTTP API。

## AIGES是什么

`AIGES` 是  `ASF`核心的组件，中文名称加载器。主要负责将用户的推理代码(按照既定标准)转换成 grpc/http 服务

* AIGES 与 Language Wrapper

- C/C++ Wrapper
  ![](/img/ai-applications/c++.png)

- Python Wrapper
  ![](/img/ai-applications/python.png)

## 面向场景

AI能力最终需要落地工程化，部分企业缺乏统一标准的AI工程化方案。

## 解决问题

* AI能力服务化多，无标准
* AI能力服务上线，服务化过程存在大量冗余工作
* 无AI工程化团队
* 无最终标准服务协议

## 特性

* 基于GRPC优化后的XRPC框架
* 统一标准服务协议定义
* 千亿PV流量打磨
* 支持多种负载均衡策略
* 新增支持Python代码推理
* ...

## 框架架构

![img](https://github.com/iflytek/proposals/blob/main/athenaloader/athena.png?raw=true)

## 框架安装

### 前置条件

准备一台测试机(4c8G),硬盘>=20G即可

### 安装

1. 安装sealos.4.0

```shell
$ wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos &&  chmod +x sealos && mv sealos /usr/bin
```

2. 创建集群

```shell
$ sealos run labring/kubernetes:v1.19.16 labring/calico:v3.24.1   --masters 192.168.64.2 -p <password>
```

![](/img/ai-applications/sealos4-run-k8s.png)
![](/img/ai-applications/sealos4-run-k8s-2.png)
![](/img/ai-applications/sealos4-run-k8s-3.png)

* Install helm

```shell
$ sealos run labring/helm:v3.8.2 
```

* Install openebs

```shell
$ sealos run labring/openebs:v1.9.0 

```

```shell
$ sealos run registry.cn-qingdao.aliyuncs.com/labring/athenaserving:v2.0.0rc1
```

3. HTTP 调用AI demo能力 MMOCR能力

MMOCR 是基于PyTorch 和mmdetection 的开源工具箱，专注于文本检测，文本识别以及相应的下游任务，如关键信息提取。 它是OpenMMLab
项目的一部分。[项目地址](https://github.com/open-mmlab/mmocr/blob/main/README_zh-CN.md)
在[wrapper.py](https://github.com/iflytek/aiges/blob/master/demo/mmocr/wrapper/wrapper_v2.py)
中，我们使用python轻而易举的将 [文本+检测识别能力](https://mmocr.readthedocs.io/zh_CN/latest/demo.html#id4)封装成为一个可部署到 `ASF`中部署成为HTTP API的能力。
使用Sealos 部署完 `ASF` 后， 您可以使用如下脚本， 修改其中的`url`值，即可完成调用 `MMOCR(文本+检测)`AI能力。

```python
import requests
import json
import base64

image = open("demo_text_det.jpg","rb")
img = base64.b64encode(image.read())


url = "http://<your nodeIP>:30889/mmocr"
url = "http://<your nodeIP:30889/v1/private/mmocr"
method = "POST"
headers = {"Content-Type":"application/json"}
data = {
    "header": {
        "app_id": "123456",
        "uid": "39769795890",
        "did": "SR082321940000200",
        "imei": "8664020318693660",
        "imsi": "4600264952729100",
        "mac": "6c:92:bf:65:c6:14",
        "net_type": "wifi",
        "net_isp": "CMCC",
        "status": 3,
        "request_id": None
    },
    "parameter": {
        "mmocr": {
            "category": "ai_category",
            "application_mode": "common_gpu",
            "gpu_id": "first",
            "gpu_type": "T4G16",
            "boxes": {
                "encoding": "utf8",
                "compress": "raw",
                "format": "json"
            }
        }
    },
    "payload": {
        "data": {
            "encoding": "jpg",
            "image": img.decode("utf-8"),
            "status": 3
        }
    }
}

# call the http api.
resp = requests.post(url,headers=headers,data=json.dumps(data))

print(resp.status_code)

if resp.status_code != 200:

    print(resp.json())

result = resp.json()['payload']['boxes']['text']
print("HTTP API response is : %s "% str(result))

print("########################################")

for box in result[0].get("result"):

    msg = "MMocr Result: box located at {box}, box score is {box_score}.  Detected text is {text} , text  score is {text_score}..."
    print(msg.format(**box))
```

***调用以及结果***

```bash
cd /var/lib/sealos/data/default/rootfs/athenaserving/charts/mmocr_ase
# 修改 demo.py中的 url部分为 nodeIP
python3 demo.py
```

调用结返回:

```bash
200
HTTP API response is : [{'filename': '0', 'result': [{'box': [190, 37, 253, 31, 254, 46, 191, 52], 'box_score': 0.9566415548324585, 'text': 'nboroughofs', 'text_score': 1.0}, {'box': [253, 47, 257, 36, 287, 47, 282, 58], 'box_score': 0.9649642705917358, 'text': 'fsouthw', 'text_score': 1.0}, {'box': [157, 59, 188, 41, 194, 52, 163, 70], 'box_score': 0.9521175622940063, 'text': 'londond', 'text_score': 0.9897959183673469}, {'box': [280, 58, 286, 50, 306, 67, 300, 74], 'box_score': 0.9397556781768799, 'text': 'thwark', 'text_score': 1.0}, {'box': [252, 78, 295, 78, 295, 98, 252, 98], 'box_score': 0.9694718718528748, 'text': 'hill', 'text_score': 1.0}, {'box': [165, 78, 247, 78, 247, 99, 165, 99], 'box_score': 0.9548642039299011, 'text': 'octavia', 'text_score': 1.0}, {'box': [164, 105, 215, 103, 216, 121, 165, 123], 'box_score': 0.9806956052780151, 'text': 'social', 'text_score': 1.0}, {'box': [219, 104, 294, 104, 294, 122, 219, 122], 'box_score': 0.9688025116920471, 'text': 'reformer', 'text_score': 1.0}, {'box': [150, 124, 226, 124, 226, 141, 150, 141], 'box_score': 0.9752051830291748, 'text': 'established', 'text_score': 1.0}, {'box': [229, 124, 255, 124, 255, 140, 229, 140], 'box_score': 0.94972825050354, 'text': 'this', 'text_score': 1.0}, {'box': [259, 125, 305, 123, 306, 139, 260, 142], 'box_score': 0.9752089977264404, 'text': 'garden', 'text_score': 1.1666666666666667}, {'box': [166, 142, 193, 141, 194, 156, 167, 157], 'box_score': 0.9731062650680542, 'text': 'hall', 'text_score': 1.0}, {'box': [198, 142, 223, 142, 223, 156, 198, 156], 'box_score': 0.9548938870429993, 'text': 'and', 'text_score': 1.0}, {'box': [228, 144, 286, 144, 286, 159, 228, 159], 'box_score': 0.977089524269104, 'text': 'cottages', 'text_score': 1.25}, {'box': [180, 158, 205, 158, 205, 172, 180, 172], 'box_score': 0.9400062561035156, 'text': 'and', 'text_score': 1.0}, {'box': [210, 160, 279, 158, 279, 172, 210, 174], 'box_score': 0.9543584585189819, 'text': 'pioneered', 'text_score': 1.0}, {'box': [226, 176, 277, 176, 277, 188, 226, 188], 'box_score': 0.9748533964157104, 'text': 'cadets', 'text_score': 1.0}, {'box': [183, 177, 223, 177, 223, 189, 183, 189], 'box_score': 0.9633153676986694, 'text': 'army', 'text_score': 1.0}, {'box': [201, 190, 235, 190, 235, 204, 201, 204], 'box_score': 0.9714152216911316, 'text': '1887', 'text_score': 1.25}, {'box': [175, 213, 180, 201, 211, 212, 206, 225], 'box_score': 0.9704344868659973, 'text': 'vted', 'text_score': 0.9191176470588236}, {'box': [241, 213, 278, 200, 283, 213, 246, 227], 'box_score': 0.9607459902763367, 'text': 'epeople', 'text_score': 1.0}, {'box': [208, 224, 210, 212, 223, 214, 220, 227], 'box_score': 0.9337806701660156, 'text': 'by', 'text_score': 1.0}, {'box': [223, 214, 240, 214, 240, 226, 223, 226], 'box_score': 0.969144344329834, 'text': 'the', 'text_score': 1.0}]}]
########################################
MMocr Result: box located at [190, 37, 253, 31, 254, 46, 191, 52], box score is 0.9566415548324585.  Detected text is nboroughofs , text  score is 1.0...
MMocr Result: box located at [253, 47, 257, 36, 287, 47, 282, 58], box score is 0.9649642705917358.  Detected text is fsouthw , text  score is 1.0...
MMocr Result: box located at [157, 59, 188, 41, 194, 52, 163, 70], box score is 0.9521175622940063.  Detected text is londond , text  score is 0.9897959183673469...
MMocr Result: box located at [280, 58, 286, 50, 306, 67, 300, 74], box score is 0.9397556781768799.  Detected text is thwark , text  score is 1.0...
MMocr Result: box located at [252, 78, 295, 78, 295, 98, 252, 98], box score is 0.9694718718528748.  Detected text is hill , text  score is 1.0...
MMocr Result: box located at [165, 78, 247, 78, 247, 99, 165, 99], box score is 0.9548642039299011.  Detected text is octavia , text  score is 1.0...
MMocr Result: box located at [164, 105, 215, 103, 216, 121, 165, 123], box score is 0.9806956052780151.  Detected text is social , text  score is 1.0...
MMocr Result: box located at [219, 104, 294, 104, 294, 122, 219, 122], box score is 0.9688025116920471.  Detected text is reformer , text  score is 1.0...
MMocr Result: box located at [150, 124, 226, 124, 226, 141, 150, 141], box score is 0.9752051830291748.  Detected text is established , text  score is 1.0...
MMocr Result: box located at [229, 124, 255, 124, 255, 140, 229, 140], box score is 0.94972825050354.  Detected text is this , text  score is 1.0...
MMocr Result: box located at [259, 125, 305, 123, 306, 139, 260, 142], box score is 0.9752089977264404.  Detected text is garden , text  score is 1.1666666666666667...
MMocr Result: box located at [166, 142, 193, 141, 194, 156, 167, 157], box score is 0.9731062650680542.  Detected text is hall , text  score is 1.0...
MMocr Result: box located at [198, 142, 223, 142, 223, 156, 198, 156], box score is 0.9548938870429993.  Detected text is and , text  score is 1.0...
MMocr Result: box located at [228, 144, 286, 144, 286, 159, 228, 159], box score is 0.977089524269104.  Detected text is cottages , text  score is 1.25...
MMocr Result: box located at [180, 158, 205, 158, 205, 172, 180, 172], box score is 0.9400062561035156.  Detected text is and , text  score is 1.0...
MMocr Result: box located at [210, 160, 279, 158, 279, 172, 210, 174], box score is 0.9543584585189819.  Detected text is pioneered , text  score is 1.0...
MMocr Result: box located at [226, 176, 277, 176, 277, 188, 226, 188], box score is 0.9748533964157104.  Detected text is cadets , text  score is 1.0...
MMocr Result: box located at [183, 177, 223, 177, 223, 189, 183, 189], box score is 0.9633153676986694.  Detected text is army , text  score is 1.0...
MMocr Result: box located at [201, 190, 235, 190, 235, 204, 201, 204], box score is 0.9714152216911316.  Detected text is 1887 , text  score is 1.25...
MMocr Result: box located at [175, 213, 180, 201, 211, 212, 206, 225], box score is 0.9704344868659973.  Detected text is vted , text  score is 0.9191176470588236...
MMocr Result: box located at [241, 213, 278, 200, 283, 213, 246, 227], box score is 0.9607459902763367.  Detected text is epeople , text  score is 1.0...
MMocr Result: box located at [208, 224, 210, 212, 223, 214, 220, 227], box score is 0.9337806701660156.  Detected text is by , text  score is 1.0...
MMocr Result: box located at [223, 214, 240, 214, 240, 226, 223, 226], box score is 0.969144344329834.  Detected text is the , text  score is 1.0...
```

## 集成接入您的自定义AI能力

新的AI能力，需要您按照加载器规范，开发并构建出您的 AI能力镜像，之后即可部署到集群。

如何构建您的自定义AI能力镜像，请参考: [快速构建wrapper.py](https://iflytek.github.io/athena_website/docs/%E5%8A%A0%E8%BD%BD%E5%99%A8/Python%E6%8F%92%E4%BB%B6)

## 更多详细内容

* 关注:

[![ifly](https://avatars.githubusercontent.com/u/26786495?s=96&v=4)](https://github.com/iflytek)

* 联系:

![weixin](https://raw.githubusercontent.com/berlinsaint/readme/main/weixin_ybyang.jpg)
