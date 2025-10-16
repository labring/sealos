---
sidebar_position: 3
---

# gen 生成集群配置

Sealos 的 `gen` 命令是用于生成 Kubernetes 集群的配置文件（Clusterfile），这个配置文件可以在之后通过 `sealos apply` 命令来应用。`gen` 命令可以帮助用户快速生成一个基本的配置文件，用户可以在此基础上根据自己的需求进行修改和调整。

下面是 `sealos gen` 命令的基本使用方法和一些常见的示例：

1. 生成一个默认配置的单节点集群：
   
   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1
   ```

注意：labring/helm 应当在 labring/calico 之前。

2. 生成一个包含多个镜像、指定了主节点和工作节点的集群：

   ```bash
   sealos gen labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
       --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd 'xxx'
   ```

注意：labring/helm 应当在 labring/calico 之前。

3. 指定 SSH 端口，对于所有服务器使用相同的 SSH 端口：

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
       --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --port 24 --passwd 'xxx'
   ```

   对于使用不同 SSH 端口的服务器：

   ```bash
   sealos gen labring/kubernetes:v1.24.0 --masters 192.168.0.2,192.168.0.3:23,192.168.0.4:24 \
       --nodes 192.168.0.5:25,192.168.0.6:25,192.168.0.7:27 --passwd 'xxx'
   ```

在生成了 Clusterfile 之后，用户可以根据自己的需求来修改这个文件。添加或修改环境变量；修改集群cidr配置。完成修改后，用户就可以通过 `sealos apply` 命令来根据这个配置文件来创建或更新集群了。

示例说明：

- [自定义配置安装](/self-hosting/lifecycle-management/operations/run-cluster/gen-apply-cluster.md)

以上就是 `sealos gen` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
