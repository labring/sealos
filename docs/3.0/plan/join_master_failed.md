## sealos 安装3master, 由于不可预知原因, 宕机一台, 需要重新加入该master.

> 背景:  sealos init 3 台 master, 由于不可预知原因, 其中一台   `192.168.0.119`  断电宕机等不可避免因素. 重启后启动失败. 故考虑clean后, 再join到集群.

首先 `clean`
```
sealos clean --master 192.168.0.119 -f
```
其次 `join`,  join过程会出现 etcd 检查失败.
```
sealos join --master 192.168.0.119
... 
[check-etcd] Checking that the etcd cluster is healthy

error execution phase check-etcd: etcd cluster is not healthy: failed to dial endpoint https://192.168.0.119:2379 
with maintenance client: context deadline exceeded
...
```

## 解决方法

> 因为sealos 构建的高可用集群底层是通过 `kubeadm `工具搭建的，且使用了 etcd 镜像方式与 master 节点一起，所以每个 Master 节点上都会存在一个 etcd 容器实例。当剔除一个 master 节点时 etcd 集群未删除剔除的节点的 etcd 成员信息，该信息还存在 etcd 集群列表中。

// todo
优化:  这里是不是考虑clean的时候把 ectd 集群的member 也清理一下?

所以，我们需要手动删除 etcd 成员信息。

```
$ kubectl get pods -n kube-system | grep etcd
etcd-server501                                    1/1     Running   3          21d
etcd-ubuntu                                       1/1     Running   0         21d
$ kubectl exec -n kube-system  -it etcd-ubuntu -- sh
# export ETCDCTL_API=3
# alias etcdctl='etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key'

# etcdctl  member list
1bd1316c3c1a02a1, started, server501, https://192.168.0.25:2380, https://192.168.0.25:2379, false
2fe4b88491460ba0, started, server119, https://192.168.0.119:2380, https://192.168.0.119:2379, false
486e0511355102be, started, ubuntu, https://192.168.0.118:2380, https://192.168.0.118:2379, false

# etcdctl member remove 2fe4b88491460ba0
```

然后执行`clean &&  join`即可解决.

```
$ sealos clean --master 192.168.0.119 -f
$ sealos join --master 192.168.0.119
```

这里谢谢钉钉@毛徐飞提供相关环境.
