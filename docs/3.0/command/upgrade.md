# `sealos upgrade` 命令

## 使用`sealos upgrade`

> 这个命令产生的原因， kubernetes 版本变化太快， 老版本对新版本的切换需求还是蛮大的。 使用 `sealos` 一键安装完集群后。
> 自然就需要对集群的升级做维护，目前 `sealos` 的底层安装是使用 `kubeadm` 来进行安装的， 因此，整个升级过程也是按照 `kubeadm` 的升级逻辑来设计的。

如果需要手动升级， 详细查看并理解[kubeadm官方升级](https://kubernetes.io/zh/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

将 `sealos` 创建的 `Kubernetes` 集群从 `1.a.x` 版本升级到 `1.b.x` 版本， 或者从版本 `1.b.x` 升级到 `1.b.y` ，其中 `y > x`,  `a+1=b`。

升级的流程如下：

1. 复制`1.b.y`版本的相关的压缩包到各节点， 解压， 并替换相应的二进制文件, 导入镜像.
2. 升级`master0`节点.
3. `waitgroup`并发升级`othermaster`节点.
4. `waitgroup`并发升级`worker`节点.

### 命令解析

```shell
$ sealos  upgrade -h
upgrade your kubernetes version by sealos

Usage:
  sealos upgrade [flags]

Flags:
  -f, --force            upgrade need interactive to confirm
  -h, --help             help for upgrade
      --pkg-url string   http://store.lameleg.com/kube1.14.1.tar.gz download offline package url, or file location ex. /root/kube1.14.1.tar.gz
      --version string   upgrade version for kubernetes version
```

- `--force` : 升级集群需要用户交互确认。 
- `--pkg-url`: `sealos`的专门的离线安装包。 如`ube1.18.3.tar.gz`
- `--version`:  `kubernetes` 的版本号， 和`pkg-url`对应， 如`v1.18.3`。

## 实现原理

升级第一个控制面节点.

```shell
$ kubeadm upgrade apply v1.18.x
```

升级其他控制面板和工作节点。

```shell
$ kubeadm upgrade node
```

## 升级前注意

- 你目前的集群是否健康? 

`kubectl get nodes -owide`查看集群状态. 当你想要通过`sealos upgrade`升级时, 必须保证集群是正常运行的.

- `kube-system`下的`pod`是否运行正常? 

`kubectl get pod -n kube-system -owide` , 查看正在运行的pod状态. 保证正常运行.

- kubernetes的node节点的名称和该节点的`hostname`是否一样? 

node name 和 hostname 必须保证一样. 否则会升级失败. 

## 实际操作开始

- 你需要有一个由 `sealos` 创建并运行着 1.15.+ 或更高版本的 `Kubernetes` 集群。
- 集群应使用静态的控制平面和 `etcd Pod` 或者 外部 `etcd`。
- 务必备份所有重要组件，例如存储在数据库中应用层面的状态。 `sealos upgrade` 不会影响你的工作负载，只会涉及 `Kubernetes` 内部的组件，但备份终究是放心一点。

### 附加信息

- 所有的容器都会重启， 因为容器的`spec hash` 发生了变化
- 你只能从一个次版本升级到下一个次版本，或者在次版本相同时升级补丁版本。 也就是说，升级时不可以跳过次版本。 例如，你只能从 1.y 升级到 1.y+1，而不能从 1.y 升级到 1.y+2。

### 确定升级版本

去[官网](https://www.sealyun.com/goodsList)上寻找你想要部署的版本比如 `1.19.2` 。 因此你的版本必须要大于等于`1.18.0`，方可升级.

1主1从，目前版本是v1.18.3 ,需要升级至 v1.19.2. sealos 可以升级

<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
$  kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   3h49m   v1.18.3
dev-k8s-node     Ready    <none>   3h48m   v1.18.3
$ sealos upgrade --version v1.19.2 --pkg-url /root/kube1.19.2.tar.gz -f | tee -a upgrade.1183-1192.log 
09:45:06 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
09:45:17 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

09:45:17 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
09:45:18 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

09:45:48 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
09:45:48 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
09:45:48 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
09:45:48 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.19.2.tar.gz 2>/dev/null |wc -l
09:45:48 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
09:45:48 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.19.2.tar.gz 2>/dev/null |wc -l
09:45:49 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

09:45:49 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
09:45:49 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
09:45:49 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
09:45:49 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

09:45:49 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
09:45:49 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
09:45:49 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
09:45:49 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
09:45:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
09:45:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/shell/master.sh
09:45:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/shell/docker.sh
09:46:03 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
09:46:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
09:46:12 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
09:46:12 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
09:46:14 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
09:46:14 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/kubeadm.yaml
09:46:14 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/docker.tgz
09:46:18 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
09:46:34 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
09:46:35 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
09:46:40 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
09:46:40 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubeadm
09:46:58 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
09:46:58 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/kubeadm.yaml
09:47:28 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
09:48:19 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.19.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.19.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.19.2
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.13-0
09:49:05 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/coredns:1.7.0
09:50:08 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
09:50:53 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
09:50:53 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/pause:3.2
09:50:53 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
09:50:53 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
09:50:53 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
70dc90064d8e: Loading layer  38.81MB/38.81MB
Loaded image: k8s.gcr.io/kube-proxy:v1.19.24:22] Loading layer  393.2kB/38.81MB
79d541cda6cb: Loading layer  3.041MB/3.041MB
e9933a1f21f5: Loading layer  1.734MB/1.734MB
77f46c47e69e: Loading layer  115.2MB/115.2MB
Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2] 
ba332c8caa08: Loading layer  42.13MB/42.13MB
Loaded image: k8s.gcr.io/kube-scheduler:v1.19.2] 
09:51:29 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
4d66a4f52b24: Loading layer  107.2MB/107.2MB
Loaded image: k8s.gcr.io/kube-controller-manager:v1.19.2
d72a74c56330: Loading layer  3.031MB/3.031MB
d61c79b29299: Loading layer   2.13MB/2.13MB
1a4e46412eb0: Loading layer  225.3MB/225.3MB
bfa5849f3d09: Loading layer   2.19MB/2.19MB
bb63b9467928: Loading layer  21.98MB/21.98MB
Loaded image: k8s.gcr.io/etcd:3.4.13-060.244:22] 
96d17b0b58a7: Loading layer  45.02MB/45.02MB
Loaded image: k8s.gcr.io/coredns:1.7.060.244:22] 
09:51:35 [ALRT] [upgrade.go:67] UpgradeMaster0
09:51:35 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-master
09:51:35 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
09:51:38 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
09:51:38 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-7vsvh, kube-system/kube-proxy-f5vcc
09:51:38 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-66bff467f8-rfx86
09:52:08 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-66bff467f8-z2zpq evicted
09:52:08 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-master
09:52:08 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.19.2
09:52:09 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
09:52:11 [INFO] [ssh.go:50] [192.168.160.243:22] W0924 09:52:11.037253  129003 kubelet.go:205] detected "systemd" as the Docker cgroup driver, the provided value "cgroupfs" in "KubeletConfiguration" will be overrided
09:52:11 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
09:52:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.19.2"
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.18.3
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Pulling images required for setting up a Kubernetes cluster
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.19.2"...
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: a275fe1cd259aa3018f3f1d7c0e7a636
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 695b0d5342155481b9239a61ff533e4d
09:52:16 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
09:52:26 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: d4798542254a842faf3d6a0fb87d0ed6
09:52:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "etcd" upgrade
09:52:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/etcd.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-24-09-52-16/etcd.yaml"
09:52:55 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: d4798542254a842faf3d6a0fb87d0ed6
09:54:32 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 4c3c12c30b28ef42f86f638eb399f6cd
09:54:32 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=etcd
09:54:38 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "etcd" upgraded successfully!
09:54:38 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Waiting for etcd to become available
09:54:38 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/tmp/kubeadm-upgraded-manifests524365294"
09:54:38 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
09:54:38 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
09:54:45 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
09:54:45 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
09:54:45 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 82a2f948bad5b581cc911fa3bf28510e
09:54:45 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-apiserver
09:54:48 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
09:54:48 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: a275fe1cd259aa3018f3f1d7c0e7a636
09:54:49 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 8e40ab517d1fc1b502ea4dc16d578e58
09:54:51 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
09:54:51 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 695b0d5342155481b9239a61ff533e4d
09:54:51 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 93ed9f6b7a13fc84a2d5afc20ac0dee9
09:54:51 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-scheduler
09:54:53 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
09:54:53 [INFO] [ssh.go:50] [192.168.160.243:22] [upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.19" in namespace kube-system with the configuration for the kubelets in the cluster
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
09:54:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
09:54:56 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
09:54:57 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
09:54:57 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-master
09:54:57 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
09:55:09 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
09:55:19 [ALRT] [upgrade.go:132] fifth to judge dev-k8s-master nodes is ready
09:55:19 [ALRT] [upgrade.go:74] UpgradeNodes
09:55:19 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-node
09:55:19 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
09:55:19 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
09:55:19 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-q5x7v, kube-system/kube-proxy-5m9d2
09:55:19 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-688c5dc8c7-xnr2h
09:55:19 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-66bff467f8-t5rl8
09:55:23 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-66bff467f8-hcsmp evicted
09:55:23 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-node
09:55:23 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] kubeadm upgrade node --certificate-renewal=false
09:55:26 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Reading configuration from the cluster...
09:55:29 [INFO] [ssh.go:50] [192.168.160.244:22] [preflight] Running pre-flight checks
09:55:29 [INFO] [ssh.go:50] [192.168.160.244:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
09:55:29 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-node
09:55:29 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
09:55:38 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
09:55:48 [ALRT] [upgrade.go:132] fifth to judge dev-k8s-node nodes is ready

```

</pre></details>

### 验证集群状态

在所有节点上升级 `kubelet` 后，通过从 `kubectl` 可以访问集群的任何位置运行以下命令，验证所有节点是否再次可用：

```shell
$ kubectl get nodes
NAME             STATUS   ROLES    AGE   VERSION
dev-k8s-master   Ready    master   13h   v1.19.2
dev-k8s-node     Ready    <none>   13h   v1.19.2
$ kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-688c5dc8c7-ds9jx   1/1     Running   0          2m51s
kube-system   calico-node-7vsvh                          1/1     Running   1          13h
kube-system   calico-node-q5x7v                          1/1     Running   0          13h
kube-system   coredns-f9fd979d6-9xpfx                    1/1     Running   0          2m51s
kube-system   coredns-f9fd979d6-bnk5c                    1/1     Running   0          2m51s
kube-system   etcd-dev-k8s-master                        1/1     Running   0          3m21s
kube-system   kube-apiserver-dev-k8s-master              1/1     Running   0          3m27s
kube-system   kube-controller-manager-dev-k8s-master     1/1     Running   0          3m27s
kube-system   kube-proxy-2js4v                           1/1     Running   0          2m32s
kube-system   kube-proxy-k4jj6                           1/1     Running   0          2m38s
kube-system   kube-scheduler-dev-k8s-master              1/1     Running   0          3m22s
kube-system   kube-sealyun-lvscare-dev-k8s-node          1/1     Running   0          3m3s
```

`STATUS` 应显示所有节点为 `Ready` 状态，并且版本号已经被更新。

### 更多升级示例

详细查看这个[pr](https://github.com/labring/sealos/pull/481)

## 从故障状态恢复

如果 `sealos upgrade` 失败并且没有回滚，例如由于执行期间意外关闭，你可以再次运行 `sealos upgrade`。 此命令是幂等的，并最终确保实际状态是你声明的所需状态。 要从故障状态恢复，你还可以运行 `kubeadm upgrade --force` 而不去更改集群正在运行的版本。

在升级期间，`kubeadm` 向 `/etc/kubernetes/tmp` 目录下的如下备份文件夹写入数据：

- `kubeadm-backup-etcd-<date>-<time>`
- `kubeadm-backup-manifests-<date>-<time>`

`kubeadm-backup-etcd` 包含当前控制面节点本地 etcd 成员数据的备份。 如果 etcd 升级失败并且自动回滚也无法修复，则可以将此文件夹中的内容复制到 `/var/lib/etcd` 进行手工修复。如果使用的是外部的 etcd，则此备份文件夹为空。

`kubeadm-backup-manifests` 包含当前控制面节点的静态 Pod 清单文件的备份版本。 如果升级失败并且无法自动回滚，则此文件夹中的内容可以复制到 `/etc/kubernetes/manifests` 目录实现手工恢复。 如果由于某些原因，在升级前后某个组件的清单未发生变化，则 `kubeadm` 也不会为之 生成备份版本。

## `kubeadm apply`工作原理

`kubeadm upgrade apply` 做了以下工作：

- 检查你的集群是否处于可升级状态:
  - API 服务器是可访问的
  - 所有节点处于 `Ready` 状态
  - 控制面是健康的
- 强制执行版本 skew 策略。
- 确保控制面的镜像是可用的或可拉取到服务器上。
- 升级控制面组件或回滚（如果其中任何一个组件无法启动）。
- 应用新的 `kube-dns` 和 `kube-proxy` 清单，并强制创建所有必需的 RBAC 规则。
- `sealos`创建集群证书有效期默认100年。 因此使用了 `--certificate-renewal=false`, 不用重新生成证书了。

`kubeadm upgrade node` 在其他控制平节点上执行以下操作：

- 从集群中获取 `kubeadm ClusterConfiguration`。
- 可选地备份 `kube-apiserver` 证书。
- 升级控制平面组件的静态 `Pod` 清单。
- 为本节点升级 `kubelet` 配置

`kubeadm upgrade node` 在工作节点上完成以下工作：

- 从集群取回 `kubeadm ClusterConfiguration`。
- 为本节点升级 `kubelet` 配置

