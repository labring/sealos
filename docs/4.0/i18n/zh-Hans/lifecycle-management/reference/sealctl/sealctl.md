---
sidebar_position: 0
---

# Sealctl 使用指南

Sealos 提供 sealctl 是使用 Sealos 与 集群节点进行操作的命令行工具。它包括以下几个子命令：

1. `cert`：管理证书，用于生成、查看和更新TLS证书。
2. `cri`：管理容器运行时接口（CRI）配置，例如Docker或containerd。
3. `hostname`：查看或设置系统主机名。
4. `hosts`：管理系统的hosts文件，用于定义静态主机名到IP地址映射。
5. `ipvs`：管理IP虚拟服务器（IPVS）规则，用于负载均衡和代理。
6. `registry`：管理镜像仓库，用于存储容器镜像仓库格式镜像以及镜像仓库管理。
7. `static_pod`：管理静态Pod，可以创建静态Pod的配置。
8. `token`：生成和管理访问令牌，用于授权访问Kubernetes集群。

通过这些子命令，您可以方便地管理和配置您的Sealos系统，实现对容器、镜像仓库、网络等各个方面的控制。




# sealos 依赖命令

1. **添加Hosts**

   在指定 IP 地址的节点上添加一个新的 hosts 记录。参数包括 IP 地址、主机名和域名。使用`sealctl hosts add `命令

2. **删除Hosts**

   删除指定 IP 地址节点上的一个 hosts 记录。参数包括 IP 地址和域名。使用`sealctl hosts delete`命令

3. **hostname**

   获取指定 IP 地址节点的主机名。 使用`sealctl hostname`命令

4. **IPVS负载均衡**

   在指定 IP 地址的节点上配置 IPVS，实现负载均衡。参数包括节点 IP 地址、虚拟 IP 地址和主节点 IP 地址列表。 使用`sealctl ipvs`命令

5. **清空IPVS规则**

   清除指定 IP 地址节点上的 IPVS 配置。参数包括节点 IP 地址和虚拟 IP 地址。 使用`sealctl ipvs`命令

6. **静态POD生成**

   在指定 IP 地址的节点上部署一个静态 Pod(lvscare)。参数包括节点 IP 地址、虚拟 IP 地址、Pod 名称、镜像名称和主节点 IP 地址列表。使用`sealctl static-pod lvscare`命令

7. **处理集群交互认证的token**

   为指定 IP 地址的节点生成一个 token。参数包括节点 IP 地址、配置文件和证书密钥。使用`sealctl token`命令

8. **获取节点的cgroup**

   获取指定 IP 地址节点的cri  CGroup 信息。 使用`sealctl cri cgroup`命令

9. **获取节点的cri-socket**

   获取指定 IP 地址节点的 cri Socket 信息。 使用`sealctl cri socket`命令

10. **在节点生成https自签名证书**

    为指定 IP 地址的节点生成证书。参数包括节点 IP 地址、备用名称列表、主机 IP 地址、主机名、服务 CIDR 和 DNS 域名。 使用`sealctl cert` 命令

11. **节点启动registry**

​	   在指定节点启动regsitry，为进行增量镜像同步。使用`sealctl registry serve`命令

