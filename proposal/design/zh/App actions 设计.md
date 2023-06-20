# App actions 设计

## 背景介绍

sealos 上有各种分布式应用，如 mysql, sealos run 的时候是去闭著眼睛执行 CMD 里面的指令的，但是并没有任何地方让用户去声明如何卸载该应用。

有些应用是用 helm 编排的，有些是 kubectl, 所以得有个方式告诉 sealos 如何卸载。不然 sealos 并不知道卸载应该做什么。

那是不是在 Sealfile 中扩展一个指令就行了？如：

```jsx
FROM scratch
UNINSTALL ["kubectl delete -f pod.yaml"]
CMD ["kubectl apply -f pod.yaml"]
```

这种设计不优雅：

1. 它与 Dockerfile 不再兼容
2. 万一未来还有清理，备份等其它操作岂不是需要继续扩展？非常危险未来可能会让功能爆炸，走向软件腐烂

所以需要有个更抽象的设计不仅能满足卸载这种操作的需求，还需要满足清理等其它通用操作。

## App actions 设计需求

- 满足应用的制作者可以自定义各种针对应用的操作
- 足够灵活可扩展
- 需要在执行时能够传入一些入参数
- 要支持各种触发途径

## 基本使用 - 使用 actions 自定义 mysql 应用卸载

delete-mysql-actions.yaml:

```jsx
apiVersion: actions.sealos.io/v1
kind: Action
metadata:
  name: delete
spec:
	cmd: ["kubectl delete -f mysql.yaml"]
```

Sealfile(Kubefile):

```docker
FROM scratch
COPY mysql.yaml .
COPY delete-mysql-actions.yaml actions/
CMD ["kubectl apply -f mysql.yaml"]
```

sealos 会读取 actions 目录下的文件去处理 actions.

```bash
# 构建集群镜像
sealos build -t mysql:latest .
# run mysql 集群
sealos run mysql:latest --name mysql
# 通过 actions 清理集群
# sealos actions [app name] [actions name]
sealos actions mysql delete/‘
```

## 特定事件触发 actions

- 例：在安装 kuberentes 集群之前设置 master 主机的 DNS



把主机 /etc/resolv.conf 内容改成 nameserver 8.8.8.8

change-dns-actions.yaml:

```docker
apiVersion: actions.sealos.io/v1
kind: Action
metadata:
  name: delete
spec:
  cmd: ["echo 'nameserver 8.8.8.8' > /etc/resolve.conf"]
  # 指定在什么阶段执行
	phase: PRE_INSTALL
  # 指定在什么节点上执行
  on: [role=master]
```

```docker
FROM kubernetes:v1.25.0
COPY change-dns-actions.yaml actions/
```

这样构建出来的集群镜像再去 run 的时候就会去执行 actions 了

```docker
sealos build -t my-kuberentes:v1.25.0 .
sealos run my-kuberentes:v1.25.0
```

## 传入一些参数

- 假设有一个脚本用来备份数据库的，但是需要传入一些入参数

例：mysql 备份时需要传入 mysql 的域名端口密码这些信息

```docker
 [backup.sh](http://backup.sh) --host mysql.cluster:3306 --passwd mysql-passwd
```

```docker
apiVersion: actions.sealos.io/v1
kind: Action
metadata:
  name: backup
spec:
	cmd: ["backup.sh --host $(MYSQL_DOMAIN) --passwd $(MYSQL_PASSWD)"]
```

```docker
FROM scratch
COPY backup.sh .
COPY backup-actions.yaml actions
CMD ["kubectl apply -f mysql.yaml"]
```

build 的时候与基本使用一样，运行时：

```docker
sealos run --name mysql mysql:5.6
sealos actions backup mysql --env MYSQL_DOMAIN=mysql.cluster:3306 \
    --env MYSQL_PASSWD=ilovesealos
```

同样应该有一些内置环境变量可以直接使用，如 MASTER_IP_LIST NODE_IP_LIST 等