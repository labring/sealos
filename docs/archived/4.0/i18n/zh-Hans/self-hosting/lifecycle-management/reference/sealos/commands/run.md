---
sidebar_position: 1
---

# run 运行集群镜像

Sealos 的 `run` 命令是一个强大且灵活的工具，它支持集群初始化、应用安装、多镜像执行，单机集群等操作。下面是对于 `sealos run` 命令及其参数的详细解释和一些使用示例。

## 命令概览

```
sealos run <image> --masters [arg] --nodes [arg] [Options]
```

`<image>` 参数是您想要在集群中运行的 Docker 镜像名称和版本。`--masters` 和 `--nodes` 是您想要运行这个镜像的 master 节点和 node 节点的 IP 列表。

### 选项解释

- `--cluster='default'`: 要运行操作的集群名称。

- `--cmd=[]`: 覆盖镜像中的 CMD 指令。

- `--config-file=[]`: 自定义配置文件的路径，用于替换资源。

- `-e, --env=[]`: 在命令执行期间设置的环境变量。

- `-f, --force=false`: 强制覆盖此集群中的应用。

- `--masters=''`: 要运行的 master 节点。

- `--nodes=''`: 要运行的 node 节点。

- `-p, --passwd=''`: 使用提供的密码进行认证。

- `-i, --pk='/root/.ssh/id_rsa'`: 选择从其中读取公钥认证身份的私钥文件。

- `--pk-passwd=''`: 解密 PEM 编码的私钥的密码。

- `--port=22`: 远程主机的连接端口。

- `-t, --transport='oci-archive'`: 从 tar 归档文件加载镜像传输。(可选值: oci-archive, docker-archive)

- `-u, --user=''`: 认证的用户名。

## 示例

1. 创建集群到您的裸机服务器，指定 IP 列表：
```
sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

2. 多镜像运行：
```
sealos run labring/kubernetes:v1.24.0 labring/helm:v3.11.3  calico:v3.24.6 \
    --masters 192.168.64.2,192.168.64.22,192.168.64.20 --nodes 192.168.64.21,192.168.64.19
```

3. 指定服务器的 InfraSSH 端口:
```
sealos run labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
```

4. 自定义 VIP Kubernetes 集群:
```
sealos run -e defaultVIP=10.103.97.2 labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

5. 创建单节点 Kubernetes 集群:
```
sealos run labring/kubernetes:v1.24.0 
```

6. 使用自定义环境变量创建集群:
```
sealos run -e DashBoardPort=8443 mydashboard:latest  --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
	--nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
```

这些示例展示了 `sealos run` 命令的强大和灵活性，可以根据您的需求进行定制和调整。

更多示例请参考 [运行集群](/self-hosting/lifecycle-management/operations/run-cluster.md)。
