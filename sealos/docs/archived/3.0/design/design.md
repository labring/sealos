# 设计理念
## 概述与理念
sealos旨在做一个简单干净轻量级稳定的kubernetes安装工具，能很好的支持高可用安装。 其实把一个东西做的功能强大并不难，但是做到极简且灵活可扩展就比较难。

所以在实现时就必须要遵循这些原则。

sealos特性与优势：

* 支持离线安装，工具与资源包（二进制程序 配置文件 镜像 yaml文件等）分离,这样不同版本替换不同离线包即可
* 百年证书
* 使用简单
* 支持自定义配置
* 内核负载，极其稳定，因为简单所以排查问题也极其简单
* 不依赖ansible haproxy keepalived, 一个二进制工具，0依赖
* 资源包放在阿里云oss上，再也不用担心网速
* dashboard ingress prometheus等APP 同样离线打包，一键安装
* etcd一键备份(etcd原生api调用)。支持上传至oss，实现异地备份, 用户无需关心细节。

> 为什么不使用ansilbe

1.0版本确实是用ansible实现，但是用户还是需要先装ansible，装ansible有需要装python和一些依赖等，为了不让用户那么麻烦把ansible放到了容器里供用户使用。如果不想配置免密钥使用用户名密码时又需要ssh-pass等，总之不能让我满意，不是我想的极简。

所以我想就来一个二进制文件工具，没有任何依赖，文件分发与远程命令都通过调用sdk实现所以不依赖其它任何东西，总算让我这个有洁癖的人满意了。

> 为什么不用keepalived haproxy

haproxy用static pod跑没有太大问题还算好管理，keepalived现在大部分开源ansible脚本都用yum 或者apt等装，这样非常的不可控，有如下劣势：

* 源不一致可能导致版本不一致，版本不一直连配置文件都不一样，我曾经检测脚本不生效一直找不到原因，后来才知道是版本原因
* 系统原因安装不上，依赖库问题某些环境就直接装不上了
* 看了网上很多安装脚本，很多检测脚本与权重调节方式都不对，直接去检测haproxy进程在不在，其实是应该去检测apiserver是不是healthz的,api挂了即使haproxy在集群也会不正常了，就是伪高可用了。
* 管理不方便，通过prometheus对集群进行监控，是能直接监控到static pod的但是用systemd跑又需要单独设置监控，且重启啥的还需要单独拉起。不如kubelet统一管理来的干净简洁。
* 我们还出现过keepalived把CPU占满的情况。

所以为了解决这个问题，我把keepalived跑在了容器中(社区提供的镜像基本是不可用的) 改造中间也是发生过很多问题，最终好在解决了。

总而言之，累觉不爱，所以在想能不能甩开haproxy和keepalived做出更简单更可靠的方案出来，还真找到了。。。

> 本地负载为什么不使用envoy或者nginx

我们通过本地负载解决高可用问题

解释一下本地负载，就是在每个node节点上都启动一个负载均衡，上游就是三个master，负载方式有很多 ipvs envoy nginx等，我们最终使用内核ipvs

如果使用envoy等需要在每个节点上都跑一个进程，消耗更多资源，这是我不希望的。ipvs实际也多跑了一个进程lvscare，但是lvscare只是负责管理ipvs规则，和kube-proxy类似，真正的流量还是从很稳定的内核走的，不需要再把包走到用户态中去处理。

实现上有个问题会让使用envoy等变得非常尴尬，就是join时如果负载均衡没有建立那是会卡住的，kubelet就不会起，所以为此你需要先把envory起起来，意味着你又不能用static pod去管理它，同上面keepalived宿主机部署一样的问题，用static pod就会相互依赖，逻辑死锁，鸡说要先有蛋，蛋说要先有鸡，最后谁都没有。

使用ipvs就不一样，我可以在join之前先把ipvs规则建立好，再去join就可以join进去了，然后对规则进行守护即可。一旦apiserver不可访问了，会自动清理掉所有node上对应的ipvs规则， master恢复正常时添加回来。

# 设计原理

## 执行流程
* 在执行机器上生成证书和kubeconfig文件
* 在执行机器上wget下载离线包和sealos二进制使用scp拷贝到目标机器上（masters和nodes）
* 在master0上执行kubeadm init
* 在其它master上执行kubeadm join 并设置控制面，这个过程会在其它master上起etcd并与master0的etcd组成集群，并启动控制组建（apiserver controller等）
* join node节点，会在node上配置ipvs规则，配置/etc/hosts等

有个细节是所有对apiserver进行访问都是通过域名，因为master上连接自己就行，node需要通过虚拟ip链接多个master，这个每个节点的kubelet与kube-proxy访问apiserver的地址是不一样的，而kubeadm又只能在配置文件中指定一个地址，所以使用一个域名但是每个节点解析不同。

使用域名的好处还有就是IP地址发生变化时仅需要修改解析即可。

## 本地内核负载
通过这样的方式实现每个node上通过本地内核负载均衡访问masters：
```
  +----------+                       +---------------+  virturl server: 127.0.0.1:6443
  | mater0   |<----------------------| ipvs nodes    |    real servers:
  +----------+                      |+---------------+            10.103.97.200:6443
                                    |                             10.103.97.201:6443
  +----------+                      |                             10.103.97.202:6443
  | mater1   |<---------------------+
  +----------+                      |
                                    |
  +----------+                      |
  | mater2   |<---------------------+
  +----------+
```
在node上起了一个lvscare的static pod去守护这个 ipvs, 一旦apiserver不可访问了，会自动清理掉所有node上对应的ipvs规则， master恢复正常时添加回来。

所以在你的node上加了三个东西，可以直观的看到：
```bash
cat /etc/kubernetes/manifests   # 这下面增加了lvscare的static pod
ipvsadm -Ln                     # 可以看到创建的ipvs规则
cat /etc/hosts                  # 增加了虚拟IP的地址解析
```

**sealos已经把lvscare本地负载和百年证书已经在sealos中支持，使用起来极其方便！！！**


## 离线包结构分析
```
.
|____docker # docker的离线包
| |____docker.tgz
| |____README.md
|____bin # 指定版本的bin文件
| |____conntrack
| |____kubeadm
| |____kubelet
| |____kubelet-pre-start.sh
| |____kubectl
| |____crictl
|____images # kubernetes的离线镜像
| |____images.tar
| |____README.md
|____shell # 离线包的部署脚本,sealos会自动调用
| |____master.sh
| |____init.sh
| |____docker.sh
|____README.md
|____conf
| |____net   # 高版本的sealos已经集成
| | |____calico.yaml
| |____10-kubeadm.conf # kubeadm的配置文件
| |____calico.yaml
| |____kubeadm.yaml
| |____kubelet.service
| |____docker.servic
```
init.sh脚本中拷贝bin文件到$PATH下面，配置systemd，关闭swap防火墙等，然后导入集群所需要的镜像。

master.sh主要执行了kubeadm init

conf下面有有我需要的如kubeadm的配置文件，calico yaml文件等等

sealos会调用二者。 所以大部分兼容不同版本都可以微调脚本做到。