---
sidebar_position: 3
---

# 如何升级集群

如果你想要升级你的 Kubernetes 集群，你只需要运行以下命令：

```sh
sealos run labring/kubernetes:<新版本号>
```

确保你已经建立了集群。

## 实例说明

1. 假设你已经运行过以下命令：

```sh
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.8 --nodes 192.168.64.7
```

2. 现在你想要升级集群到 v1.25.0，你可以这样操作：

```sh
sealos run labring/kubernetes:v1.25.0 
```

在运行到 'kubeadm upgrade v1.25.0' 的时候，你将看到：

```txt
[upgrade/version] You have chosen to change the cluster version to "v1.25.0"
[upgrade/versions] Cluster version: v1.24.0
[upgrade/versions] kubeadm version: v1.25.0
[upgrade] Are you sure you want to proceed? [y/N]: 
```

输入 'y' 来继续升级。

如果**出现错误**，你可以再次运行命令 'sealos run labring/kubernetes:v1.25.0'。即使失败，它也能保证得到相同的结果。

## 注意事项

1. **升级不能跨过次版本号**。比如从 'v1.23.0' 升级到 'v1.25.0' 是不允许的。如果你确实需要从 'v1.23.0' 升级到 'v1.25.0'，你可以分成两步来操作，比如先从 'v1.23.0' 升级到 'v1.24.0'，然后再从 'v1.24.0' 升级到 'v1.25.0'。

2. 一旦升级成功，集群挂载的旧版本镜像就会被替换。添加主节点或工作节点将会应用新版本。

这就是升级 Kubernetes 集群的整个过程。如果你在升级过程中遇到任何问题，不要犹豫，尽快查阅相关文档或者寻求帮助。