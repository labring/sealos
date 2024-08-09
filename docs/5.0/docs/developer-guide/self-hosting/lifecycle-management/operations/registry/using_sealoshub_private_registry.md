---
sidebar_position: 2
---

# 如何使用 sealos作为私有容器仓库

## 工作原理

每个节点都会运行一个 image-cri-shim 守护进程，Kubelet 在拉取镜像的时候会发起一个 grpc 交互命令到 image-cri-shim。该进程会根据镜像名字在私有仓库里面查找，存在则从本地拉取，否则从远端拉取。

执行如下命令来验证 image-cri-shim 守护进程状态：

```shell
$ systemctl status image-cri-shim.service 
```

## 私有仓库在哪里运行

sealos 的私有仓库默认运行在集群的第一个节点上，第一个节点是指创建集群的时候输入的第一个节点的地址，使用下面的命令查看守护进程的状态。

```shell
$ systemctl status registry.service 
```

**注意：**仓库的数据保存在 `/var/lib/sealos/data/default/rootfs/registry/` 目录下。

## 登录私有容器镜像仓库

sealos 私有仓库使用 `--net host` 参数运行在 HTTP 下，应当在本地配置 insecure-registries，然后使用第一个节点的 IP 地址进行连接，Docker 客户端配置参考如下：

```json
# cat /etc/docker/daemon.json 
{
  "insecure-registries": ["192.168.1.10:5000"],
}
```

使用 `sealos login` 命令来进行登录，默认用户名与密码是 `admin:passw0rd`。

```shell
sealos login -u admin -p passw0rd 192.168.1.10:5000
```

也可以使用 `docker login` 命令。

```shell
docker login -u admin -p passw0rd 192.168.1.10:5000 
```

## 推送与拉取镜像

推送镜像案例：

```shell
$ sealos tag quay.io/skopeo/stable 192.168.72.50:5000/skopeo/stable
$ sealos push 192.168.72.50:5000/skopeo/stable
Using default tag: latest
The push refers to repository [192.168.72.50:5000/skopeo/stable]
a98b3d943f46: Pushed 
b48290351261: Pushed 
f39ec3c22bd5: Pushed 
e5a31cf70f11: Pushed 
b9394289d761: Pushed 
c550c8e0f355: Pushed 
latest: digest: sha256:238efd85942755fbd28d4d23d1f8dedd99e9eec20777e946f132633b826a9295 size: 1570
```

拉取镜像案例：

```shell
sealos pull 192.168.72.50:5000/skopeo/stable
```

或者使用 `docker pull` 命令：

```shell
docker pull 192.168.72.50:5000/skopeo/stable
```
