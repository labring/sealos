# LVScare 使用指南

## 介绍

LVScare是一款基于IPVS技术的轻量级负载均衡和健康检查工具，可以实时监控和管理后端服务。Sealos，一个云操作系统，它的生命周期管理是一个基于kubeadm的Kubernetes HA安装工具，适用于在任何Linux系统中安装和升级高可用Kubernetes集群。两者结合能实现Kubernetes master节点的高可用性。Sealos利用其生命周期管理能力，通过配合LVScare的轻量级，0依赖，高可用的特性，可以非常有效地保证Kubernetes集群的稳定性和可靠性。

### LVScare的工作原理与特点

LVScare通过IPVS实时监控后端服务（real servers）的健康状态。如果某个服务变得不可用，LVScare会立即将其权重设为0（用于TCP优雅终止），并在下一次检查期间从服务列表中移除。服务恢复正常后，LVScare会自动将其重新加入到服务列表。LVScare的这种设计使得它具备轻量级，0依赖，高可用的特性。占用资源少，稳定可靠，类似于kube-proxy的实现，可以通过ipvs实现的localLB保证服务的持续可用。

## Sealos与LVScare的集成

在Sealos中，我们利用了官方推荐的静态Pod的方式，自动配置和管理LVScare，以实现Kubernetes集群的高可用性。Sealos会在安装Kubernetes集群的过程中自动使用LVScare进行master节点的健康检查和负载均衡。这意味着，即使某个master节点出现故障，也不会影响Kubernetes集群的整体功能。

![](./images/01.webp)

### 如何运行LVScare静态Pod

首先，通过`sealctl static-pod`命令生成LVScare的配置，并将其放入`/etc/kubernetes/manifests`目录。这样，Kubernetes集群中的所有节点都能获取到这份配置。

```bash
lvscare care --vs 10.103.97.12:6443 --rs 192.168.0.2:6443 --rs 192.168.0.3:6443 --rs 192.168.0.4:6443 --interval 5 --mode route
```

### 生成和调整静态Pod配置

在需要在每个节点上启动LVScare时，我们可以使用以下命令生成静态Pod的配置：

```bash
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168

.0.3:6443 --print
```

当master节点有变化时，Sealos只需重新执行`sealctl static-pod`命令即可调整master节点，简化了维护静态Pod的逻辑。在集群join节点之前，我们需要调用`sealctl ipvs`（该命令直接调用LVScare sdk）手动启动IPVS规则，维护好IPVS集群。节点join成功后，Kubernetes的静态Pod就可以接管IPVS规则了。

## 使用LVScare的优势

### 高可用性

结合LVScare，Sealos可以实现Kubernetes集群master节点的高可用性。

### 健康检查机制

LVScare的健康检查机制可以及时发现并处理问题，防止单节点故障引发的更大问题。

### 无缝集成

作为Sealos中的静态Pod，LVScare可以与Kubernetes集群其他部分无缝集成。

### 简化运维

Sealos自动配置和管理LVScare，大大简化了Kubernetes集群的运维工作。

## LVScare使用示例

请注意，所有的real server需要在同一主机上监听，并设置为`route`模式。然后，你可以在前台运行LVScare。例如：

```bash
docker run -p 8081:80 --name echoserver1 -d cilium/echoserver
docker run -p 8082:80 --name echoserver2 -d cilium/echoserver
docker run -p 8083:80 --name echoserver3 -d cilium/echoserver
lvscare care --vs 169.254.0.1:80 --rs 127.0.0.1:8081 --rs 127.0.0.1:8082 --rs 127.0.0.1:8083 --logger DEBG --health-schem http --health-path /
```

## 清理

最后，你可以使用以下命令进行清理：

```bash
lvscare care --vs 169.254.0.1:80 --logger DEBG -C
```

结论：LVScare是一款基于IPVS的轻量级负载均衡和健康检查工具，它能与Sealos无缝集成，极大地提高了Kubernetes集群的可用性和性能。试一试，看看LVScare如何帮助你更好地管理你的Kubernetes集群！
