# kubernetes升级
本教程以1.13版本升级到1.14为例，其它版本原理大差不差，懂了这个其它的参考[官方教程](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade-1-14/)即可

# 升级过程
1. 升级kubeadm,所有节点导入镜像
2. 升级控制节点
3. 升级master(控制节点)上的kubelet
4. 升级其它master(控制节点)
5. 升级node
6. 验证集群状态

## 升级kubeadm
把离线包拷贝到所有节点执行 `cd kube/shell && sh init.sh`
这里会把kubeadm kubectl kubelet bin文件都更新掉，而且会导入高版本镜像

## 升级控制节点
```
kubeadm upgrade plan
kubeadm upgrade apply v1.15.0
```

重启kubelet:
```
systemctl restart kubelet
```
其实kubelet升级简单粗暴，我们只需要把新版本的kubelet拷贝到/usr/bin下面，重启kubelet service即可，如果程序正在使用不让覆盖那么就停一下kubelet再进行拷贝，kubelet bin文件在 `conf/bin` 目录下

## 升级其它控制节点
```
kubeadm upgrade apply
```

# 升级node
驱逐节点（要不要驱逐看情况, 喜欢粗暴的直接来也没啥）
```
kubectl drain $NODE --ignore-daemonsets
```
更新kubelet配置：
```
kubeadm upgrade node config --kubelet-version v1.15.0
```
然后升级kubelet 一样是替换二进制再重启 kubelet service
```
systemctl restart kubelet
```

召回失去的爱情：
```
kubectl uncordon $NODE
```

# 验证
```
kubectl get nodes
```
如果版本信息对的话基本就ok了

# kubeadm upgrade apply 干了啥
1. 检查集群是否可升级
2. 执行版本升级策略 哪些版本之间可以升级
3. 确认镜像可在
4. 执行控制组件升级，如果失败就回滚，其实就是apiserver controller manager scheduler 等这些容器
5. 执行kube-dns 和kube-proxy的升级
6. 创建新的证书文件,备份老的如果其超过180天
