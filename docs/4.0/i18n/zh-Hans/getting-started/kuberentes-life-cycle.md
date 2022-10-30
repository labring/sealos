---
sidebar_position: 4
---

# Kubernetes 生命周期管理

## 单机安装 Kuberentes

```shell
# sealos version must >= v4.1.0
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
```

## 集群安装 Kuberentes

```shell
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

参数说明：

| 参数名 | 参数值示例 | 参数说明 |
| --- | --- | --- |
| --masters |  192.168.0.2 | kubernetes master 节点地址列表 |
| --nodes | 192.168.0.3 | kubernetes node 节点地址列表 |
| --ssh-passwd | [your-ssh-passwd] | ssh 登录密码 |
|kubernetes | labring/kubernetes:v1.25.0 | kubernetes 镜像 |

在干净的服务器上直接执行上面命令，不要做任何多余操作即可启动一个高可用的 kubernetes 集群。

## 安装各种分布式应用

```shell
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

这样高可用的 mysql redis 等都有了，不用关心所有的依赖问题。

## 增加节点

增加 node 节点：
```shell
$ sealos add --nodes 192.168.64.21,192.168.64.19 
```

增加 master 节点：
```shell
$ sealos add --masters 192.168.64.21,192.168.64.19 
```

## 删除节点

删除 node 节点：
```shell
$ sealos delete --nodes 192.168.64.21,192.168.64.19 
```

删除 master 节点：
```shell
$ sealos delete --masters 192.168.64.21,192.168.64.19  
```

## 清理集群

```shell
$ sealos reset
```
