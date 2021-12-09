# upgrade cmd test record


设计理念： 一键升级， 用户无需在意细节。

```
sealos upgrade --version v1.19.2 --pkg-url kube1.19.2.tar.gz
```
# 声明

环境如下：所有主机都是单网卡
 `192.168.160.1` 为网卡路由

 | 主机名称 | 网卡(ens33)           |   磁盘| 内存| CPU| OS-IMAGE | KERNEL-VERSION
 | ---- | --------------- | --------------- |  --------------- | --------------- |  --------------- |  --------------- | 
 | dev-k8s-master   | 192.168.160.243 | 60G|4G| 4核| CentOS Linux 8 (Core) | 4.4.228-2.el7.elrepo.x86_64|
 | dev-k8s-node  | 192.168.160.244 | 20G| 4G|4核|CentOS Linux 7 (Core)   |4.4.228-2.el7.elrepo.x86_64|
 | centos8-k8s   | 192.168.160.245 | 20G| 4G|4核|CentOS Linux 7 (Core)   | 4.18.0-147.el8.x86_64|

## test case one

目前版本是v1.19.2 ,需要升级只 v1.19.1. sealos 拒绝升级
<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
[root@dev-k8s-master ~]# ./sealos upgrade  --pkg-url kube1.19.1.tar.gz --version v1.19.1 
upgrade cmd will upgrade your kubernetes cluster immediately 
Are you sure you want to proceed with the upgrade?  (y/n)?y
15:06:18 [EROR] [upgrade.go:36] kubernetes new version is lower/equal than current version: New version: v1.19.1, current version: v1.19.2


[root@dev-k8s-master ~]# ./sealos upgrade  --pkg-url kube1.17.12.tar.gz --version v1.17.12  -f
15:08:09 [EROR] [upgrade.go:36] kubernetes new version is lower/equal than current version: New version: v1.17.12, current version: v1.19.2
```

</pre></details>

## test case 2 

两个master。目前版本是v1.19.1 ,需要升级至 v1.19.2. sealos 可以升级
<details><summary><code>upgrade  logs </code> Output</summary><br><pre>

```
sealos upgrade  --pkg-url kube1.19.2.tar.gz --version v1.19.2 -f 
16:09:14 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
16:09:14 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

16:09:14 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
16:09:14 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

16:09:18 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
16:09:18 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
16:09:18 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
16:09:18 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.19.1.tar.gz 2>/dev/null |wc -l
16:09:18 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
16:09:18 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.19.1.tar.gz 2>/dev/null |wc -l
16:09:19 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

16:09:19 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
16:09:19 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
16:09:19 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
16:09:19 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

16:09:19 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
16:09:19 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
16:09:19 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
16:09:20 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
16:09:20 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
16:09:20 [INFO] [ssh.go:50] [192.168.160.244:22] kube/shell/init.sh
16:09:20 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubeadm
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/kubeadm.yaml
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/10-kubeadm.conf
16:09:21 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/
16:09:21 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/kubeadm.yaml
16:09:22 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
16:09:23 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
16:10:12 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
16:10:13 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
16:11:59 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-proxy:v1.19.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.19.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
16:12:00 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.19.2
16:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
16:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
16:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
16:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
16:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.19.2
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.19.2
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.19.2
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.13-0
16:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/coredns:1.7.0
16:12:23 [ALRT] [upgrade.go:63] UpgradeMaster0
16:12:23 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
16:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
16:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-dm9lz, kube-system/kube-proxy-cdx9h
16:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-69b47f4dfb-s8cf9
16:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-f9fd979d6-vqvfs
16:12:40 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-69b47f4dfb-s8cf9 evicted
16:12:40 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-zf467 evicted
16:12:40 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-vqvfs evicted
16:12:40 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  -y v1.19.2
16:12:40 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
16:12:42 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
16:12:42 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.19.2"
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.19.1
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Pulling images required for setting up a Kubernetes cluster
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.19.2"...
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: b46d6d0fa865381c739f2c1d14a6533f
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 077d332768503c847e8c912c0ff336e7
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: e83c2631205a9e5701a40d9c258c4fef
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
16:12:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version "3.4.13-0" is not newer than the currently installed "3.4.13-0". Skipping etcd upgrade
16:12:45 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
16:12:45 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-16-12-44/kube-apiserver.yaml"
16:12:45 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: b46d6d0fa865381c739f2c1d14a6533f
16:12:50 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: be2b5dd8cf6062dcc303a08b9312bfed
16:12:50 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 2 Pods for label selector component=kube-apiserver
16:12:51 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
16:12:51 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 077d332768503c847e8c912c0ff336e7
16:12:51 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 6005bde0e8c95f871f5807a90ef5f58e
16:12:51 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 2 Pods for label selector component=kube-controller-manager
16:12:54 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
16:12:54 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: e83c2631205a9e5701a40d9c258c4fef
16:12:54 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 66c8b1a26f5e481c00ac90b9b45e1116
16:12:54 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 2 Pods for label selector component=kube-scheduler
16:12:56 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
16:12:56 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.19" in namespace kube-system with the configuration for the kubelets in the cluster
16:12:56 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
16:12:57 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
16:12:57 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
16:12:57 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
16:12:57 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
16:12:59 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
16:13:00 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
16:13:00 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
16:13:04 [ALRT] [upgrade.go:90] fourth to uncordon node, 10 seconds to wait for ready
16:13:14 [ALRT] [upgrade.go:95] fifth to judge nodes is ready
16:13:14 [ALRT] [upgrade.go:151] UpgradeOtherMasters
16:13:14 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
16:13:14 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
16:13:14 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-hf5z2, kube-system/kube-proxy-md8nz
16:13:14 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-f9fd979d6-qgsxk
16:13:14 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-69b47f4dfb-pv6k2
16:13:21 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-69b47f4dfb-pv6k2 evicted
16:13:22 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-qgsxk evicted
16:13:22 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-rnmmf evicted
16:13:22 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade node --certificate-renewal=false 
16:13:23 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
16:13:31 [ALRT] [upgrade.go:182] fourth to uncordon node, 10 seconds to wait for ready
16:13:41 [ALRT] [upgrade.go:187] fifth to judge nodes is ready
```

</pre></details>


## test case 3

一主一从。 目前集群是v1.19.1 升级至 v1.19.2.

<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
$ kubectl get nodes 
NAME             STATUS   ROLES    AGE    VERSION
dev-k8s-master   Ready    master   114s   v1.19.1
dev-k8s-node     Ready    <none>   81s    v1.19.1
$ kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-69b47f4dfb-x7j6h   1/1     Running   0          102s
kube-system   calico-node-2w4jc                          1/1     Running   0          91s
kube-system   calico-node-vxjps                          1/1     Running   0          102s
kube-system   coredns-f9fd979d6-j86cz                    1/1     Running   0          102s
kube-system   coredns-f9fd979d6-t28hv                    1/1     Running   0          102s
kube-system   etcd-dev-k8s-master                        1/1     Running   0          114s
kube-system   kube-apiserver-dev-k8s-master              1/1     Running   0          114s
kube-system   kube-controller-manager-dev-k8s-master     1/1     Running   0          114s
kube-system   kube-proxy-2cpr9                           1/1     Running   0          91s
kube-system   kube-proxy-nj55s                           1/1     Running   0          102s
kube-system   kube-scheduler-dev-k8s-master              1/1     Running   0          114s
kube-system   kube-sealyun-lvscare-dev-k8s-node          1/1     Running   0          89s


$ sealos upgrade  --pkg-url kube1.19.2.tar.gz --version v1.19.2 -f  
17:02:27 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
17:02:27 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

17:02:27 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
17:02:27 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

17:02:33 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
17:02:33 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
17:02:33 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
17:02:33 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.19.1.tar.gz 2>/dev/null |wc -l
17:02:33 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
17:02:33 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.19.1.tar.gz 2>/dev/null |wc -l
17:02:33 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

17:02:33 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
17:02:33 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
17:02:33 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
17:02:35 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
17:02:35 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

17:02:35 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
17:02:35 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
17:02:35 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.19.2.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
17:02:35 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
17:02:36 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
17:02:37 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
17:02:38 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
17:02:38 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
17:02:39 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
17:02:39 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
17:02:40 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
17:02:41 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
17:02:41 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
17:02:41 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubeadm
17:02:41 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
17:02:44 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
17:03:28 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
17:03:44 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-proxy:v1.19.2
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/etcd:3.4.13-0
17:05:30 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/coredns:1.7.0
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/pause:3.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.19.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.19.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.19.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.19.2
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.13-0
17:05:43 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/coredns:1.7.0
17:05:47 [ALRT] [upgrade.go:63] UpgradeMaster0
17:05:47 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
17:05:50 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
17:05:50 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-vxjps, kube-system/kube-proxy-nj55s
17:05:50 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-69b47f4dfb-x7j6h
17:05:50 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-f9fd979d6-t28hv
17:06:05 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-j86cz evicted
17:06:05 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-69b47f4dfb-x7j6h evicted
17:06:05 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  -y v1.19.2
17:06:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
17:06:07 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
17:06:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.19.2"
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.19.1
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Pulling images required for setting up a Kubernetes cluster
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/apply] Upgrading your Static Pod-hosted control plane to version "v1.19.2"...
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: b46d6d0fa865381c739f2c1d14a6533f
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 077d332768503c847e8c912c0ff336e7
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: e83c2631205a9e5701a40d9c258c4fef
17:06:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
17:06:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version "3.4.13-0" is not newer than the currently installed "3.4.13-0". Skipping etcd upgrade
17:06:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
17:06:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-17-06-10/kube-apiserver.yaml"
17:06:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: b46d6d0fa865381c739f2c1d14a6533f
17:07:30 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-apiserver
17:07:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
17:07:35 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 077d332768503c847e8c912c0ff336e7
17:07:36 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 6005bde0e8c95f871f5807a90ef5f58e
17:07:36 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-controller-manager
17:07:37 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
17:07:37 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-scheduler.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-17-06-10/kube-scheduler.yaml"
17:07:37 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: e83c2631205a9e5701a40d9c258c4fef
17:07:37 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 66c8b1a26f5e481c00ac90b9b45e1116
17:07:37 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-scheduler
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.19" in namespace kube-system with the configuration for the kubelets in the cluster
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
17:07:39 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
17:07:40 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
17:07:42 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
17:07:43 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
17:07:43 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
17:07:45 [ALRT] [upgrade.go:90] fourth to uncordon node, 10 seconds to wait for ready
17:07:55 [ALRT] [upgrade.go:95] fifth to judge nodes is ready
17:07:55 [ALRT] [upgrade.go:101] UpgradeNodes
17:07:55 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
17:07:55 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
17:07:55 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-2w4jc, kube-system/kube-proxy-2cpr9
17:07:55 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-69b47f4dfb-chqgt
17:07:59 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-69b47f4dfb-chqgt evicted
17:08:09 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-f9fd979d6-x9q5p evicted
17:08:09 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] 
17:08:09 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
17:08:12 [ALRT] [upgrade.go:135] fourth to uncordon node
17:08:22 [ALRT] [upgrade.go:141] fifth to judge nodes is ready

$ kubectl get nodes 
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   8m42s   v1.19.2
dev-k8s-node     Ready    <none>   8m9s    v1.19.2
```

</pre></details>

## test case 4

1主1从， 1.18.0 -> 1.18.3

<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS                     ROLES    AGE     VERSION
dev-k8s-master   Ready,SchedulingDisabled   master   10m     v1.18.0
dev-k8s-node     Ready                      <none>   8m31s   v1.18.0

$ sealos  upgrade  --pkg-url /root/kube1.18.3.tar.gz  --version v1.18.3 -f | tee -a upgrade.1180-1183.log 
19:49:44 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
19:49:44 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

19:49:44 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
19:49:44 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

19:49:48 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
19:49:48 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
19:49:48 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
19:49:48 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
19:49:48 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
19:49:48 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
19:49:48 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

19:49:48 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
19:49:48 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
19:49:48 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
19:49:49 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

19:49:49 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
19:49:49 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
19:49:49 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
19:49:49 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
19:49:49 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
19:49:50 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/sealos
19:49:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/sealos
19:49:50 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
19:49:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
19:49:50 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
19:49:50 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
19:49:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
19:49:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
19:49:50 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/kubelet.service
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/10-kubeadm.conf
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/net/calico.yaml
19:49:51 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
19:49:51 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/10-kubeadm.conf
19:49:51 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
19:49:51 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
19:50:16 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
19:50:33 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
19:51:47 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
19:51:47 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/pause:3.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
19:51:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-proxy:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/pause:3.2
19:51:48 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
19:51:49 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
19:52:03 [ALRT] [upgrade.go:67] UpgradeMaster0
19:52:03 [ALRT] [upgrade.go:70] fist to drain node dev-k8s-master
19:52:03 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
19:52:08 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
19:52:08 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-8wz86, kube-system/kube-proxy-9gh7c
19:52:08 [ALRT] [upgrade.go:78] second to exec kubeadm upgrade apply
19:52:08 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.18.3
19:52:09 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
19:52:09 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
19:52:09 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.18.3"
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.18.3
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component etcd.
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
19:52:24 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-etcd
19:52:31 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
19:52:31 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
19:52:32 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
19:52:32 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
19:52:34 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component etcd.
19:52:34 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-scheduler.
19:52:34 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-controller-manager.
19:52:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-apiserver.
19:52:35 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
19:52:35 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: a275fe1cd259aa3018f3f1d7c0e7a636
19:52:35 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 695b0d5342155481b9239a61ff533e4d
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] W0923 19:52:36.167110   78651 manifests.go:225] the default kube-apiserver authorization-mode is "Node,RBAC"; using "Node,RBAC"
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Current and new manifests of kube-apiserver are equal, skipping upgrade
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Current and new manifests of kube-controller-manager are equal, skipping upgrade
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Current and new manifests of kube-scheduler are equal, skipping upgrade
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upload-config] Storing the configuration used in ConfigMap "kubeadm-config" in the "kube-system" Namespace
19:52:36 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.18" in namespace kube-system with the configuration for the kubelets in the cluster
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.18" ConfigMap in the kube-system namespace
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
19:52:37 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
19:52:39 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
19:52:40 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
19:52:40 [ALRT] [upgrade.go:86] third to restart dev-k8s-master kubelet
19:52:40 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
19:52:42 [ALRT] [upgrade.go:97] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
19:52:52 [ALRT] [upgrade.go:103] fifth to judge dev-k8s-master nodes is ready
19:52:52 [ALRT] [upgrade.go:109] UpgradeNodes
19:52:52 [ALRT] [upgrade.go:129] fist to drain node dev-k8s-node
19:52:52 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
19:52:53 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
19:52:53 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-sqkc2, kube-system/kube-proxy-p8v8x
19:52:53 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-84445dd79f-zdh6n
19:52:53 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-66bff467f8-tbvt8
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-66bff467f8-pvvvp evicted
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-84445dd79f-zdh6n evicted
19:53:07 [ALRT] [upgrade.go:137] second to exec kubeadm upgrade node on dev-k8s-node
19:53:07 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade node --certificate-renewal=false
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Reading configuration from the cluster...
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Upgrading your Static Pod-hosted control plane instance to version "v1.18.3"...
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 24a39fba2c7e2f71b2a1a965e28e43f7
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: a275fe1cd259aa3018f3f1d7c0e7a636
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 695b0d5342155481b9239a61ff533e4d
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Current and new manifests of kube-apiserver are equal, skipping upgrade
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
19:53:07 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] The configuration for this node was successfully updated!
19:53:07 [ALRT] [upgrade.go:145] third to restart kubelet on dev-k8s-node
19:53:07 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
19:53:14 [ALRT] [upgrade.go:157] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
19:53:24 [ALRT] [upgrade.go:162] fifth to judge dev-k8s-node nodes is ready
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE   VERSION
dev-k8s-master   Ready    master   19m   v1.18.3
dev-k8s-node     Ready    <none>   18m   v1.18.3

```

</pre></details>

## test case 5

1主1从 1.16.10 -> 1.19.2.

```
升级之后报错， 节点处于not ready状态。 CSIDriver not found.
所以跨两个版本以上 ，这边禁止了。 只允许跨1个大版本升级。 如 1.17.12 -> 1.18.8
```

## test case 6 

1主1从， 目前版本是v1.16.10 ,需要升级至1.17.12.  升级成功。
<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
$ sealos upgrade --version v1.17.12 --pkg-url /root/kube1.17.12.tar.gz -f | tee -a upgrade.11610-11712.log
20:10:01 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
20:10:02 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

20:10:02 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
20:10:02 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

20:10:06 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
20:10:06 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
20:10:06 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
20:10:06 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.17.12.tar.gz 2>/dev/null |wc -l
20:10:06 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
20:10:06 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.17.12.tar.gz 2>/dev/null |wc -l
20:10:06 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

20:10:06 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
20:10:06 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
20:10:06 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.17.12.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
20:10:06 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 0

20:10:06 [DEBG] [scp.go:26] [ssh]source file md5 value is a4f6fa2b1721bc2bf6fe3172b72497f2
20:10:07 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
20:10:07 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
20:10:08 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 100.00MB ;speed is 100MB
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/10-kubeadm.conf
20:10:08 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
20:10:09 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 200.00MB ;speed is 100MB
20:10:10 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 300.00MB ;speed is 100MB
20:10:11 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 400.00MB ;speed is 100MB
20:10:12 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 500.00MB ;speed is 100MB
20:10:13 [ALRT] [scp.go:100] [ssh][192.168.160.244:22]transfer total size is: 588.50MB ;speed is 88MB
20:10:13 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] md5sum /root/kube1.17.12.tar.gz | cut -d" " -f1
20:10:23 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: a4f6fa2b1721bc2bf6fe3172b72497f2

20:10:23 [DEBG] [scp.go:29] [ssh]host: 192.168.160.244:22 , remote md5: a4f6fa2b1721bc2bf6fe3172b72497f2
20:10:23 [INFO] [scp.go:33] [ssh]md5 validate true
20:10:23 [INFO] [download.go:38] [192.168.160.244:22]copy file md5 validate success
20:10:23 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
20:10:23 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.17.12.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
20:10:23 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
20:10:24 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
20:10:25 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
20:10:25 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
20:10:25 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
20:10:26 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
20:10:55 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
08d7743c183a: Loading layer  108.7MB/108.7MB
Loaded image: k8s.gcr.io/kube-controller-manager:v1.17.12
20:11:34 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
7c9b0f448297: Loading layer  41.37MB/41.37MB
Loaded image: k8s.gcr.io/coredns:1.6.560.243:22] 
20:11:34 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
20:11:34 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
20:11:35 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/pause:3.1
c126ac2cf4e6: Loading layer  37.82MB/37.82MB
Loaded image: k8s.gcr.io/kube-proxy:v1.17.12:22] 
46ac5add7672: Loading layer  118.8MB/118.8MB
Loaded image: k8s.gcr.io/kube-apiserver:v1.17.12 
6851b39bb59b: Loading layer  42.13MB/42.13MB
Loaded image: k8s.gcr.io/kube-scheduler:v1.17.12 
20:11:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
20:11:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
20:11:48 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
91e3a07063b3: Loading layer  53.89MB/53.89MB
08d7743c183a: Loading layer  108.7MB/108.7MB
Loaded image: k8s.gcr.io/kube-controller-manager:v1.17.12
20:11:56 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
7c9b0f448297: Loading layer  41.37MB/41.37MB
Loaded image: k8s.gcr.io/coredns:1.6.560.244:22] 
20:11:57 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
20:11:57 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
20:11:57 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/pause:3.1
b4e54f331697: Loading layer  21.78MB/21.78MB
b9b82a97c787: Loading layer  5.168MB/5.168MB
1b55846906e8: Loading layer  4.608kB/4.608kB
061bfb5cb861: Loading layer  8.192kB/8.192kB
78dd6c0504a7: Loading layer  8.704kB/8.704kB
c126ac2cf4e6: Loading layer  37.82MB/37.82MB
Loaded image: k8s.gcr.io/kube-proxy:v1.17.12:22] 
46ac5add7672: Loading layer  118.8MB/118.8MB
Loaded image: k8s.gcr.io/kube-apiserver:v1.17.12 
6851b39bb59b: Loading layer  42.13MB/42.13MB
Loaded image: k8s.gcr.io/kube-scheduler:v1.17.12 
20:12:02 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
20:12:02 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
20:12:02 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
20:12:03 [ALRT] [upgrade.go:67] UpgradeMaster0
20:12:03 [ALRT] [upgrade.go:70] fist to drain node dev-k8s-master
20:12:03 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
20:12:08 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
20:12:08 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "calico-kube-controllers-688c5dc8c7-z587x"
20:12:08 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "coredns-5644d7b6d9-jvc58"
20:12:08 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "coredns-5644d7b6d9-rqp8j"
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-5644d7b6d9-jvc58 evicted
20:12:21 [ALRT] [upgrade.go:78] second to exec kubeadm upgrade apply
20:12:21 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.17.12
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Making sure the cluster is healthy:
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.17.12"
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.16.10
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component etcd.
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
20:12:21 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-etcd
20:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
20:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
20:12:22 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
20:12:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-controller-manager.
20:12:24 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-apiserver.
20:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component etcd.
20:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-scheduler.
20:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 34f32c80333b80e995c0070dfc16cf72
20:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 63c28a9fde96b2b251ca4690624529ae
20:12:25 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 3fc3850b80e1466c4cabdda8f12faa50
20:12:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
20:12:26 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 77f5f12e81c13342e0e94eec9d973abe
20:12:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "etcd" upgrade
20:12:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/etcd.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-20-12-25/etcd.yaml"
20:12:29 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 77f5f12e81c13342e0e94eec9d973abe
20:12:29 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 42bd8cc23ee76f01fe086af38efc9f69
20:12:29 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=etcd
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "etcd" upgraded successfully!
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Waiting for etcd to become available
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/tmp/kubeadm-upgraded-manifests473825893"
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [controlplane] Adding extra host path mount "localtime" to "kube-apiserver"
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-20-12-25/kube-apiserver.yaml"
20:12:30 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 34f32c80333b80e995c0070dfc16cf72
20:12:33 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 34f32c80333b80e995c0070dfc16cf72
20:12:34 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
20:12:34 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-apiserver
20:12:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
20:12:35 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 63c28a9fde96b2b251ca4690624529ae
20:12:36 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
20:12:36 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-controller-manager
20:12:36 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
20:12:36 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 3fc3850b80e1466c4cabdda8f12faa50
20:12:37 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
20:12:37 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-scheduler
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.17" in namespace kube-system with the configuration for the kubelets in the cluster
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.17" ConfigMap in the kube-system namespace
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
20:12:38 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
20:12:39 [INFO] [ssh.go:50] [192.168.160.243:22] [addons]: Migrating CoreDNS Corefile
20:12:40 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
20:12:41 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
20:12:41 [ALRT] [upgrade.go:86] third to restart dev-k8s-master kubelet
20:12:41 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
20:12:42 [ALRT] [upgrade.go:97] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
20:12:52 [ALRT] [upgrade.go:103] fifth to judge dev-k8s-master nodes is ready
20:12:52 [ALRT] [upgrade.go:109] UpgradeNodes
20:12:52 [ALRT] [upgrade.go:129] fist to drain node dev-k8s-node
20:12:52 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
20:12:53 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
20:12:53 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "calico-kube-controllers-688c5dc8c7-fhbwn"
20:12:53 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "coredns-5644d7b6d9-4bgl4"
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-5644d7b6d9-z8dh2 evicted
20:13:02 [ALRT] [upgrade.go:137] second to exec kubeadm upgrade node on dev-k8s-node
20:13:02 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade node --certificate-renewal=false
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Reading configuration from the cluster...
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Upgrading your Static Pod-hosted control plane instance to version "v1.17.12"...
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.17.12" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
20:13:02 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] The configuration for this node was successfully updated!
20:13:02 [ALRT] [upgrade.go:145] third to restart kubelet on dev-k8s-node
20:13:02 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
20:13:09 [ALRT] [upgrade.go:157] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
20:13:19 [ALRT] [upgrade.go:162] fifth to judge dev-k8s-node nodes is ready

```

</pre></details>

升级过程变化

```
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS                     ROLES    AGE     VERSION
dev-k8s-master   Ready,SchedulingDisabled   master   6m      v1.16.10
dev-k8s-node     Ready                      <none>   5m17s   v1.16.10
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   6m29s   v1.16.10
dev-k8s-node     Ready    <none>   5m46s   v1.16.10
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   6m32s   v1.16.10
dev-k8s-node     Ready    <none>   5m49s   v1.16.10
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS                     ROLES    AGE     VERSION
dev-k8s-master   Ready                      master   6m48s   v1.17.12
dev-k8s-node     Ready,SchedulingDisabled   <none>   6m5s    v1.16.10
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   7m6s    v1.17.12
dev-k8s-node     Ready    <none>   6m23s   v1.16.10
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   7m9s    v1.17.12
dev-k8s-node     Ready    <none>   6m26s   v1.17.12

$ kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-688c5dc8c7-xzrds   1/1     Running   0          4m4s
kube-system   calico-node-7vsvh                          1/1     Running   0          10m
kube-system   calico-node-q5x7v                          1/1     Running   0          10m
kube-system   coredns-6955765f44-fzxrs                   1/1     Running   0          4m4s
kube-system   coredns-6955765f44-qxk7g                   1/1     Running   0          4m4s
kube-system   etcd-dev-k8s-master                        1/1     Running   0          4m44s
kube-system   kube-apiserver-dev-k8s-master              1/1     Running   0          4m39s
kube-system   kube-controller-manager-dev-k8s-master     1/1     Running   0          4m37s
kube-system   kube-proxy-9fr7k                           1/1     Running   0          3m41s
kube-system   kube-proxy-v6s4g                           1/1     Running   0          4m2s
kube-system   kube-scheduler-dev-k8s-master              1/1     Running   0          4m36s
kube-system   kube-sealyun-lvscare-dev-k8s-node          1/1     Running   0          9m52s
```

## test case 7
1主1从，目前版本是v1.17.12 ,需要升级至 v1.18.3. sealos 可以升级
<details><summary><code>upgrade logs </code> Output</summary><br><pre>

```
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   3h44m   v1.17.12
dev-k8s-node     Ready    <none>   3h43m   v1.17.12
[root@dev-k8s-master ~]# sealos  upgrade --version v1.18.3 --pkg-url /root/kube1.18.3.tar.gz  -f |tee -a upgrade.11712-1183.log
23:51:52 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
23:51:53 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

23:51:53 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
23:51:53 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

23:51:57 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
23:51:57 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
23:51:57 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
23:51:57 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
23:51:57 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
23:51:57 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
23:51:57 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

23:51:57 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
23:51:57 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
23:51:57 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
23:51:57 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

23:51:57 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
23:51:57 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
23:51:57 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
23:51:58 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
23:51:58 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
23:51:58 [INFO] [ssh.go:50] [192.168.160.243:22] kube/shell/master.sh
23:51:58 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/sealos
23:51:58 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/sealos
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubeadm
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/10-kubeadm.conf
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/net/
23:51:59 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/net/calico.yaml
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/calico.yaml
23:51:59 [INFO] [ssh.go:50] [192.168.160.244:22] kube/conf/10-kubeadm.conf
23:52:00 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
23:52:00 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
23:52:35 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
23:52:55 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/coredns:1.6.7
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/cni:v3.8.2
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/kube-controllers:v3.8.2
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-proxy:v1.18.3
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: fanux/lvscare:latest
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/pause:3.2
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
23:53:43 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
23:53:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
23:53:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/coredns:1.6.7
23:53:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.18.3
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/pause:3.2
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
23:53:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
23:53:58 [ALRT] [upgrade.go:67] UpgradeMaster0
23:53:58 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-master
23:53:58 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
23:54:00 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
23:54:01 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-7vsvh, kube-system/kube-proxy-v6s4g
23:54:01 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-master
23:54:01 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.18.3
23:54:01 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
23:54:01 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
23:54:01 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.18.3"
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.17.12
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component etcd.
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component kube-apiserver.
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-etcd
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
23:54:06 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
23:54:07 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
23:54:07 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
23:54:07 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
23:54:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-scheduler.
23:54:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-apiserver.
23:54:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component etcd.
23:54:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-controller-manager.
23:54:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
23:54:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
23:54:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] W0923 23:54:12.676153  123508 manifests.go:225] the default kube-apiserver authorization-mode is "Node,RBAC"; using "Node,RBAC"
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-apiserver.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-23-23-54-11/kube-apiserver.yaml"
23:54:12 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
23:54:18 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 3ffb1b5cd637de6412fa95b11cae4700
23:54:18 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-apiserver
23:54:23 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
23:54:23 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
23:54:24 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 5774a402312acd98241d318951797558
23:54:24 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-controller-manager
23:54:25 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
23:54:25 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
23:54:25 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 738192d31444bd5d1118c309bca86763
23:54:25 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-scheduler
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.18" in namespace kube-system with the configuration for the kubelets in the cluster
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.18" ConfigMap in the kube-system namespace
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
23:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
23:54:29 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
23:54:30 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
23:54:30 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-master
23:54:30 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
23:54:37 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
23:54:57 [ALRT] [upgrade.go:74] UpgradeNodes
23:54:57 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-node
23:54:57 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
23:55:00 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
23:55:00 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-q5x7v, kube-system/kube-proxy-9fr7k
23:55:00 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-688c5dc8c7-xzrds
23:55:00 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-6955765f44-fzxrs
23:55:00 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-6955765f44-qxk7g
23:55:03 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-688c5dc8c7-xzrds evicted
23:55:07 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-6955765f44-fzxrs evicted
23:55:07 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-6955765f44-qxk7g evicted
23:55:07 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-node
23:55:07 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] kubeadm upgrade node --certificate-renewal=false
23:55:08 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Reading configuration from the cluster...
23:55:08 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Skipping phase. Not a control plane node.
23:55:08 [INFO] [ssh.go:50] [192.168.160.244:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
23:55:08 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-node
23:55:08 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
23:55:14 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
23:55:24 [ALRT] [upgrade.go:132] fifth to judge dev-k8s-node nodes is ready
[root@dev-k8s-master ~]# ls
1                calico.yaml       go1.15.2.linux-amd64.tar.gz     join.1.18.0.log        kubeadm-config.yaml  nfs                   speedtest.py
1.16.10.new.log  CHANGELOG.md      harbor.yaml                     kube                   kube-prometheus      nginx-1.18.0          temp
1.19.1.log       clean.log         hello-contour.yaml              kube1.16.10.tar.gz     kuboard.tar          oneMasterOneNode.log  Templates
1.19.1.new.log   config            helloworld.yaml                 kube1.17.12.tar.gz     kuboard.yaml         on.log                test
1.19.2.new.log   Desktop           httpbin.yaml                    kube1.18.0.tar.gz      LICENSE              Pictures              testsealos.sh
a.log            Documents         ingress                         kube1.18.3.tar.gz      LICENSE.md           Public                upgrade.11610-11712.log
anaconda-ks.cfg  doublemaster.log  install.log                     kube1.19.1.tar.gz      linux-amd64          README.md             upgrade.11712-1183.log
as.log           Downloads         istio-1.6.8                     kube1.19.1.tar.gz.bak  manifests            sealos                upgrade.11712-1192.log
a.txt            etcd-config.yaml  istio-1.6.8-linux-amd64.tar.gz  kube1.19.2.tar.gz      Music                sealos.bak            upgrade.1180-1183.log
azk8s.sh         go                istio.yaml                      kubeadm                new.yaml             sealos.latest         Videos
[root@dev-k8s-master ~]# kubectl get pods
No resources found in default namespace.
[root@dev-k8s-master ~]# kubectl get nodes
NAME             STATUS   ROLES    AGE     VERSION
dev-k8s-master   Ready    master   3h49m   v1.18.3
dev-k8s-node     Ready    <none>   3h48m   v1.18.3

```

</pre></details>

## test case 8
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

</pre></details>


## test case 9
1 master 2 worker . 目前版本是v1.16.10 ,需要升级至 v1.17.12. sealos 可以升级. 
<details><summary><code>upgrade logs </code> Output</summary><br><pre>

安装

```
$ sealos init --master 192.168.160.243  --pkg-url /root/kube1.16.10.tar.gz --version v1.16.10  --passwd centos  --node 192.168.160.244 --node 192.168.160.245 | tee -a install.16.10.log
....wait for kubernetes install success...
$ kubectl get nodes  -owide 
NAME             STATUS   ROLES    AGE   VERSION    INTERNAL-IP       EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION                CONTAINER-RUNTIME
centos8-k8s      Ready    <none>   2m   v1.16.10   192.168.160.245   <none>        CentOS Linux 8 (Core)   4.18.0-147.el8.x86_64         docker://19.3.0
dev-k8s-master   Ready    master   3m   v1.16.10   192.168.160.243   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.12
dev-k8s-node     Ready    <none>   2m   v1.16.10   192.168.160.244   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.9
```
升级

```
 sealos upgrade --version v1.17.12 --pkg-url /root/kube1.17.12.tar.gz -f | tee -a upgrade.onemastertwonode.11610-11712.log 
11:35:12 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
11:35:12 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

11:35:12 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
11:35:13 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

11:35:13 [INFO] [ssh.go:12] [ssh][192.168.160.245:22] hostname
11:35:13 [DEBG] [ssh.go:24] [ssh][192.168.160.245:22]command result is: centos8-k8s
...
11:39:17 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
11:39:22 [ALRT] [upgrade.go:67] UpgradeMaster0
11:39:22 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-master
11:39:22 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
11:39:24 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
11:39:24 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "calico-kube-controllers-688c5dc8c7-zj6cp"
11:39:24 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "coredns-5644d7b6d9-pxgjn"
11:39:34 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-5644d7b6d9-pxgjn evicted
11:39:34 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-688c5dc8c7-zj6cp evicted
11:39:34 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-master
11:39:34 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.17.12
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Making sure the cluster is healthy:
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.17.12"
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.16.10
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component etcd.
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component kube-apiserver.
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component kube-controller-manager.
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
11:39:35 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
11:39:36 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
11:39:39 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-scheduler.
11:39:39 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-apiserver.
11:39:39 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component etcd.
11:39:39 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-controller-manager.
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 34f32c80333b80e995c0070dfc16cf72
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 63c28a9fde96b2b251ca4690624529ae
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 3fc3850b80e1466c4cabdda8f12faa50
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 77f5f12e81c13342e0e94eec9d973abe
11:39:40 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "etcd" upgrade
11:39:43 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 77f5f12e81c13342e0e94eec9d973abe
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: etcd-dev-k8s-master hash: 42bd8cc23ee76f01fe086af38efc9f69
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=etcd
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "etcd" upgraded successfully!
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Waiting for etcd to become available
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Writing new Static Pod manifests to "/etc/kubernetes/tmp/kubeadm-upgraded-manifests744837085"
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [controlplane] Adding extra host path mount "localtime" to "kube-apiserver"
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
11:39:44 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 34f32c80333b80e995c0070dfc16cf72
11:39:49 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
11:39:49 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-apiserver
11:39:49 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
11:39:49 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 63c28a9fde96b2b251ca4690624529ae
11:39:50 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
11:39:50 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-controller-manager
11:39:51 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
11:39:51 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 3fc3850b80e1466c4cabdda8f12faa50
11:39:52 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
11:39:52 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector component=kube-scheduler
11:39:53 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
11:39:53 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.17" in namespace kube-system with the configuration for the kubelets in the cluster
11:39:53 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.17" ConfigMap in the kube-system namespace
11:39:53 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
11:39:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
11:39:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
11:39:54 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
11:39:55 [INFO] [ssh.go:50] [192.168.160.243:22] [addons]: Migrating CoreDNS Corefile
11:39:55 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
11:39:57 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
11:39:57 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-master
11:39:57 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
11:40:04 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
11:40:14 [ALRT] [upgrade.go:132] fifth to judge dev-k8s-master nodes is ready
11:40:14 [ALRT] [upgrade.go:74] UpgradeNodes
11:40:14 [ALRT] [upgrade.go:94] fist to drain node centos8-k8s
11:40:14 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain centos8-k8s --ignore-daemonsets
11:40:14 [ALRT] [upgrade.go:94] fist to drain node dev-k8s-node
11:40:14 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
11:40:15 [INFO] [ssh.go:50] [192.168.160.243:22] node/centos8-k8s cordoned
11:40:15 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
11:40:15 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "calico-kube-controllers-688c5dc8c7-fhkls"
11:40:15 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod "coredns-5644d7b6d9-gsv6p"
11:40:26 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-5644d7b6d9-hhpl4 evicted
11:40:26 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-688c5dc8c7-fhkls evicted
11:40:26 [INFO] [ssh.go:50] [192.168.160.243:22] node/centos8-k8s evicted
11:40:26 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on centos8-k8s
11:40:26 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] kubeadm upgrade node --certificate-renewal=false
11:40:27 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-5644d7b6d9-gsv6p evicted
11:40:27 [ALRT] [upgrade.go:102] second to exec kubeadm upgrade node on dev-k8s-node
11:40:27 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] kubeadm upgrade node --certificate-renewal=false
11:40:27 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] Reading configuration from the cluster...
11:40:27 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] Skipping phase. Not a control plane node.
11:40:27 [INFO] [ssh.go:50] [192.168.160.245:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
11:40:27 [ALRT] [upgrade.go:116] third to restart kubelet on centos8-k8s
11:40:27 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] systemctl daemon-reload && systemctl restart kubelet
11:40:31 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Reading configuration from the cluster...
11:40:31 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Skipping phase. Not a control plane node.
11:40:31 [INFO] [ssh.go:50] [192.168.160.244:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
11:40:31 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] The configuration for this node was successfully updated!
11:40:31 [ALRT] [upgrade.go:116] third to restart kubelet on dev-k8s-node
11:40:31 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
11:40:36 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for centos8-k8s ready
11:40:37 [ALRT] [upgrade.go:127] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
11:40:46 [ALRT] [upgrade.go:132] fifth to judge centos8-k8s nodes is ready
11:40:47 [ALRT] [upgrade.go:132] fifth to judge dev-k8s-node nodes is ready
```

验证

```
$ kubectl get nodes  -owide 
NAME             STATUS   ROLES    AGE   VERSION    INTERNAL-IP       EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION                CONTAINER-RUNTIME
centos8-k8s      Ready    <none>   13m   v1.17.12   192.168.160.245   <none>        CentOS Linux 8 (Core)   4.18.0-147.el8.x86_64         docker://19.3.0
dev-k8s-master   Ready    master   14m   v1.17.12   192.168.160.243   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.12
dev-k8s-node     Ready    <none>   13m   v1.17.12   192.168.160.244   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.9
$  kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-688c5dc8c7-lgw7c   1/1     Running   0          8m7s
kube-system   calico-node-4h49q                          1/1     Running   0          15m
kube-system   calico-node-ps45d                          1/1     Running   0          15m
kube-system   calico-node-s2ngj                          1/1     Running   0          16m
kube-system   coredns-6955765f44-cz4gq                   1/1     Running   0          8m7s
kube-system   coredns-6955765f44-jlkx4                   1/1     Running   0          8m7s
kube-system   etcd-dev-k8s-master                        1/1     Running   0          8m50s
kube-system   kube-apiserver-dev-k8s-master              1/1     Running   0          8m49s
kube-system   kube-controller-manager-dev-k8s-master     1/1     Running   0          8m44s
kube-system   kube-proxy-f7gc5                           1/1     Running   0          8m3s
kube-system   kube-proxy-gjstj                           1/1     Running   0          7m34s
kube-system   kube-proxy-lchg6                           1/1     Running   0          7m37s
kube-system   kube-scheduler-dev-k8s-master              1/1     Running   0          8m42s
kube-system   kube-sealyun-lvscare-centos8-k8s           1/1     Running   0          15m
kube-system   kube-sealyun-lvscare-dev-k8s-node          1/1     Running   0          15m
```

</pre></details>


## test case 10
3 master . 目前版本是v1.17.12 ,需要升级至 v1.18.3. sealos 可以升级. 
<details><summary><code>upgrade logs </code> Output</summary><br><pre>

集群情况

```
$ kubectl get nodes
NAME             STATUS   ROLES    AGE    VERSION
centos8-k8s      Ready    master   52m    v1.17.12
dev-k8s-master   Ready    master   129m   v1.17.12
dev-k8s-node     Ready    master   52m    v1.17.12
```
升级

```
 sealos  upgrade --version v1.18.3 --pkg-url /root/kube1.18.3.tar.gz  -f | tee -a upgrade.threemaster.11712-1183.log
13:42:32 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] hostname
13:42:33 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: dev-k8s-master

13:42:33 [INFO] [ssh.go:12] [ssh][192.168.160.245:22] hostname
13:42:33 [DEBG] [ssh.go:24] [ssh][192.168.160.245:22]command result is: centos8-k8s

13:42:33 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] hostname
13:42:33 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: dev-k8s-node

13:42:52 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] mkdir -p /root || true
13:42:52 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] mkdir -p /root || true
13:42:52 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] mkdir -p /root || true
13:42:52 [DEBG] [download.go:29] [192.168.160.244:22]please wait for mkDstDir
13:42:52 [INFO] [ssh.go:12] [ssh][192.168.160.244:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
13:42:53 [DEBG] [download.go:29] [192.168.160.245:22]please wait for mkDstDir
13:42:53 [INFO] [ssh.go:12] [ssh][192.168.160.245:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
13:42:53 [DEBG] [ssh.go:24] [ssh][192.168.160.245:22]command result is: 0

13:42:53 [DEBG] [scp.go:26] [ssh]source file md5 value is 48f377585faf683d8c2b970f0bf0d974
13:42:53 [DEBG] [ssh.go:24] [ssh][192.168.160.244:22]command result is: 1

13:42:53 [WARN] [download.go:35] [192.168.160.244:22]SendPackage: file is exist
13:42:53 [DEBG] [download.go:44] [192.168.160.244:22]please wait for after hook
13:42:53 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
13:42:55 [INFO] [ssh.go:50] [192.168.160.244:22] kube/
13:43:00 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/sealos
13:43:07 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubectl
13:43:09 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/crictl
13:43:15 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/conntrack
13:43:20 [INFO] [ssh.go:50] [192.168.160.244:22] kube/bin/kubelet-pre-start.sh
13:43:30 [INFO] [ssh.go:50] [192.168.160.244:22] kube/docker/README.md
13:43:30 [DEBG] [download.go:29] [192.168.160.243:22]please wait for mkDstDir
13:43:30 [INFO] [ssh.go:12] [ssh][192.168.160.243:22] ls -l /root/kube1.18.3.tar.gz 2>/dev/null |wc -l
13:43:49 [DEBG] [ssh.go:24] [ssh][192.168.160.243:22]command result is: 1

13:43:49 [WARN] [download.go:35] [192.168.160.243:22]SendPackage: file is exist
13:43:49 [DEBG] [download.go:44] [192.168.160.243:22]please wait for after hook
13:43:49 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
13:43:53 [INFO] [ssh.go:50] [192.168.160.243:22] kube/
13:44:03 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 100.00MB ;speed is 100MB
13:44:03 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/sealos
13:44:04 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubectl
13:44:04 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/crictl
13:44:05 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/conntrack
13:44:11 [INFO] [ssh.go:50] [192.168.160.243:22] kube/bin/kubelet-pre-start.sh
13:44:11 [INFO] [ssh.go:50] [192.168.160.243:22] kube/conf/10-kubeadm.conf
13:44:17 [INFO] [ssh.go:50] [192.168.160.243:22] kube/docker/README.md
13:44:24 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 200.00MB ;speed is 100MB
13:44:52 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 300.00MB ;speed is 100MB
13:45:51 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 400.00MB ;speed is 100MB
13:45:58 [INFO] [ssh.go:50] [192.168.160.244:22] kube/images/README.md
13:47:09 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 500.00MB ;speed is 100MB
13:47:58 [INFO] [ssh.go:50] [192.168.160.243:22] kube/images/README.md
13:48:09 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 600.00MB ;speed is 100MB
13:48:13 [ALRT] [scp.go:100] [ssh][192.168.160.245:22]transfer total size is: 609.98MB ;speed is 9MB
13:48:15 [INFO] [ssh.go:12] [ssh][192.168.160.245:22] md5sum /root/kube1.18.3.tar.gz | cut -d" " -f1
13:48:31 [DEBG] [ssh.go:24] [ssh][192.168.160.245:22]command result is: 48f377585faf683d8c2b970f0bf0d974

13:48:31 [DEBG] [scp.go:29] [ssh]host: 192.168.160.245:22 , remote md5: 48f377585faf683d8c2b970f0bf0d974
13:48:31 [INFO] [scp.go:33] [ssh]md5 validate true
13:48:31 [INFO] [download.go:38] [192.168.160.245:22]copy file md5 validate success
13:48:31 [DEBG] [download.go:44] [192.168.160.245:22]please wait for after hook
13:48:31 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] cd /root && rm -rf kube && tar zxvf kube1.18.3.tar.gz  && cd /root/kube/shell && rm -f ../bin/sealos && (docker load -i ../images/images.tar || ture) && cp -f ../bin/* /usr/bin/ 
13:48:34 [INFO] [ssh.go:50] [192.168.160.245:22] kube/
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/pause:3.2
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
13:48:35 [INFO] [ssh.go:50] [192.168.160.244:22] Loaded image: calico/node:v3.8.2
13:48:46 [INFO] [ssh.go:50] [192.168.160.245:22] kube/bin/sealos
13:48:54 [INFO] [ssh.go:50] [192.168.160.245:22] kube/bin/kubectl
13:49:00 [INFO] [ssh.go:50] [192.168.160.245:22] kube/bin/crictl
13:49:02 [INFO] [ssh.go:50] [192.168.160.245:22] kube/bin/conntrack
13:49:04 [INFO] [ssh.go:50] [192.168.160.245:22] kube/bin/kubelet-pre-start.sh
13:49:14 [INFO] [ssh.go:50] [192.168.160.245:22] kube/docker/README.md
13:51:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
13:51:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/coredns:1.6.7
13:51:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/cni:v3.8.2
13:51:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
13:51:54 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/kube-controllers:v3.8.2
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-proxy:v1.18.3
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: fanux/lvscare:latest
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/pause:3.2
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
13:51:55 [INFO] [ssh.go:50] [192.168.160.243:22] Loaded image: calico/node:v3.8.2
13:52:24 [INFO] [ssh.go:50] [192.168.160.245:22] kube/images/README.md
472b50132667: Loading layer  110.1MB/110.1MB
Loaded image: k8s.gcr.io/kube-controller-manager:v1.18.3
13:53:45 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: k8s.gcr.io/coredns:1.6.7
13:53:45 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: calico/cni:v3.8.2
13:53:45 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: calico/pod2daemon-flexvol:v3.8.2
13:53:45 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: calico/kube-controllers:v3.8.2
0d542b1bbf55: Loading layer  38.38MB/38.38MB
Loaded image: k8s.gcr.io/kube-proxy:v1.18.35:22] 
d7637f39347d: Loading layer  120.7MB/120.7MB
Loaded image: k8s.gcr.io/kube-apiserver:v1.18.3] 
09bd2ef1cfd6: Loading layer  42.95MB/42.95MB
Loaded image: k8s.gcr.io/kube-scheduler:v1.18.3] 
13:53:54 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: fanux/lvscare:latest
13:53:54 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: k8s.gcr.io/pause:3.2
13:53:55 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: k8s.gcr.io/etcd:3.4.3-0
13:53:55 [INFO] [ssh.go:50] [192.168.160.245:22] Loaded image: calico/node:v3.8.2
13:54:02 [ALRT] [upgrade.go:76] UpgradeMaster0
13:54:02 [ALRT] [upgrade.go:103] fist to drain node dev-k8s-master
13:54:02 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-master --ignore-daemonsets
13:54:03 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-master cordoned
13:54:04 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-s2ngj, kube-system/kube-proxy-lchg6
13:54:04 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-688c5dc8c7-lgw7c
13:54:04 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-6955765f44-jlkx4
13:54:14 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-688c5dc8c7-lgw7c evicted
13:54:21 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-6955765f44-jlkx4 evicted
13:54:21 [ALRT] [upgrade.go:111] second to exec kubeadm upgrade node on dev-k8s-master
13:54:21 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubeadm upgrade apply --certificate-renewal=false  --yes v1.18.3
13:54:26 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/config] Making sure the configuration is correct:
13:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [preflight] Running pre-flight checks.
13:54:27 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade] Running cluster health checks
13:54:42 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/version] You have chosen to change the cluster version to "v1.18.3"
13:54:42 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/versions] Cluster version: v1.17.12
13:54:42 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Will prepull images for components [kube-apiserver kube-controller-manager kube-scheduler etcd]
13:54:42 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulling image for component etcd.
13:54:42 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
13:54:43 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector k8s-app=upgrade-prepull-kube-apiserver
13:54:43 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 0 Pods for label selector k8s-app=upgrade-prepull-etcd
13:54:43 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector k8s-app=upgrade-prepull-kube-controller-manager
13:54:44 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector k8s-app=upgrade-prepull-kube-scheduler
13:54:44 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 1 Pods for label selector k8s-app=upgrade-prepull-etcd
13:54:45 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector k8s-app=upgrade-prepull-etcd
13:55:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-controller-manager.
13:55:10 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component etcd.
13:55:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-scheduler.
13:55:11 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/prepull] Prepulled image for component kube-apiserver.
13:55:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
13:55:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
13:55:11 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
13:55:12 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Upgrading to TLS for etcd
13:55:14 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
13:55:14 [INFO] [ssh.go:50] [192.168.160.243:22] W0924 13:55:14.130233   59434 manifests.go:225] the default kube-apiserver authorization-mode is "Node,RBAC"; using "Node,RBAC"
13:55:14 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
13:55:14 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
13:55:28 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
13:55:28 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: fcbbb5a07dda4ac18c1c409dd8c21c70
13:55:28 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-apiserver-dev-k8s-master hash: 3ffb1b5cd637de6412fa95b11cae4700
13:55:28 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector component=kube-apiserver
13:55:31 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
13:55:31 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-controller-manager.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-24-13-55-11/kube-controller-manager.yaml"
13:55:31 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 79561830e5eb0398f029dacf3fe02884
13:55:31 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-controller-manager-dev-k8s-master hash: 5774a402312acd98241d318951797558
13:55:31 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector component=kube-controller-manager
13:55:33 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
13:55:33 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-scheduler.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-24-13-55-11/kube-scheduler.yaml"
13:55:33 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 5a63e5b879c453505335c9d4920890cc
13:55:33 [INFO] [ssh.go:50] [192.168.160.243:22] Static pod: kube-scheduler-dev-k8s-master hash: 738192d31444bd5d1118c309bca86763
13:55:33 [INFO] [ssh.go:50] [192.168.160.243:22] [apiclient] Found 3 Pods for label selector component=kube-scheduler
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet] Creating a ConfigMap "kubelet-config-1.18" in namespace kube-system with the configuration for the kubelets in the cluster
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Downloading configuration for the kubelet from the "kubelet-config-1.18" ConfigMap in the kube-system namespace
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to get nodes
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow Node Bootstrap tokens to post CSRs in order for nodes to get long term certificate credentials
13:55:35 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow the csrapprover controller automatically approve CSRs from a Node Bootstrap Token
13:55:36 [INFO] [ssh.go:50] [192.168.160.243:22] [bootstrap-token] configured RBAC rules to allow certificate rotation for all node client certificates in the cluster
13:55:37 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: CoreDNS
13:55:39 [INFO] [ssh.go:50] [192.168.160.243:22] [addons] Applied essential addon: kube-proxy
13:55:39 [ALRT] [upgrade.go:125] third to restart kubelet on dev-k8s-master
13:55:39 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] systemctl daemon-reload && systemctl restart kubelet
13:55:47 [ALRT] [upgrade.go:136] fourth to uncordon node, 10 seconds to wait for dev-k8s-master ready
13:55:58 [ALRT] [upgrade.go:141] fifth to judge dev-k8s-master nodes is ready
13:55:58 [ALRT] [upgrade.go:90] UpgradeOtherMasters
13:55:58 [ALRT] [upgrade.go:103] fist to drain node dev-k8s-node
13:55:58 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain dev-k8s-node --ignore-daemonsets
13:55:58 [ALRT] [upgrade.go:103] fist to drain node centos8-k8s
13:55:58 [INFO] [ssh.go:57] [ssh][192.168.160.243:22] kubectl drain centos8-k8s --ignore-daemonsets
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] node/centos8-k8s cordoned
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] node/dev-k8s-node cordoned
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-56p7s, kube-system/kube-proxy-jpk84, kube-system/upgrade-prepull-etcd-nsf2g, kube-system/upgrade-prepull-kube-apiserver-m2tcp, kube-system/upgrade-prepull-kube-controller-manager-rhp85, kube-system/upgrade-prepull-kube-scheduler-zgcvj
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/calico-kube-controllers-688c5dc8c7-xz9ks
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-6955765f44-r5mdn
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] WARNING: ignoring DaemonSet-managed Pods: kube-system/calico-node-d2qz9, kube-system/kube-proxy-7bxq6, kube-system/upgrade-prepull-etcd-b49ft, kube-system/upgrade-prepull-kube-apiserver-d76tv, kube-system/upgrade-prepull-kube-controller-manager-cbg86, kube-system/upgrade-prepull-kube-scheduler-cv6jg
13:55:59 [INFO] [ssh.go:50] [192.168.160.243:22] evicting pod kube-system/coredns-6955765f44-hw8mp
13:56:02 [INFO] [ssh.go:50] [192.168.160.243:22] pod/calico-kube-controllers-688c5dc8c7-xz9ks evicted
13:56:06 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-6955765f44-hw8mp evicted
13:56:06 [ALRT] [upgrade.go:111] second to exec kubeadm upgrade node on dev-k8s-node
13:56:06 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] kubeadm upgrade node --certificate-renewal=false
13:56:08 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Reading configuration from the cluster...
13:56:08 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Upgrading your Static Pod-hosted control plane instance to version "v1.18.3"...
13:56:08 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-apiserver-dev-k8s-node hash: db0cc0774c4b89e5ea5f738009ad410c
13:56:08 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-controller-manager-dev-k8s-node hash: 79561830e5eb0398f029dacf3fe02884
13:56:08 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-scheduler-dev-k8s-node hash: 5a63e5b879c453505335c9d4920890cc
13:56:09 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/etcd] Upgrading to TLS for etcd
13:56:09 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
13:56:09 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
13:56:09 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-apiserver-dev-k8s-node hash: db0cc0774c4b89e5ea5f738009ad410c
13:56:14 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-apiserver-dev-k8s-node hash: db0cc0774c4b89e5ea5f738009ad410c
13:56:14 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-apiserver-dev-k8s-node hash: 328f0738eb4e2d4c76194db664467652
13:56:14 [INFO] [ssh.go:50] [192.168.160.244:22] [apiclient] Found 3 Pods for label selector component=kube-apiserver
13:56:17 [INFO] [ssh.go:50] [192.168.160.243:22] pod/coredns-6955765f44-r5mdn evicted
13:56:17 [ALRT] [upgrade.go:111] second to exec kubeadm upgrade node on centos8-k8s
13:56:17 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] kubeadm upgrade node --certificate-renewal=false
13:56:17 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
13:56:17 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-controller-manager-dev-k8s-node hash: 79561830e5eb0398f029dacf3fe02884
13:56:18 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-controller-manager-dev-k8s-node hash: 5774a402312acd98241d318951797558
13:56:18 [INFO] [ssh.go:50] [192.168.160.244:22] [apiclient] Found 3 Pods for label selector component=kube-controller-manager
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] Reading configuration from the cluster...
13:56:21 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
13:56:21 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-scheduler-dev-k8s-node hash: 5a63e5b879c453505335c9d4920890cc
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] Upgrading your Static Pod-hosted control plane instance to version "v1.18.3"...
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-controller-manager-centos8-k8s hash: 79561830e5eb0398f029dacf3fe02884
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-scheduler-centos8-k8s hash: 5a63e5b879c453505335c9d4920890cc
13:56:21 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/etcd] Upgrading to TLS for etcd
13:56:21 [INFO] [ssh.go:50] [192.168.160.244:22] Static pod: kube-scheduler-dev-k8s-node hash: 738192d31444bd5d1118c309bca86763
13:56:22 [INFO] [ssh.go:50] [192.168.160.244:22] [apiclient] Found 3 Pods for label selector component=kube-scheduler
13:56:24 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
13:56:24 [INFO] [ssh.go:50] [192.168.160.244:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
13:56:24 [INFO] [ssh.go:50] [192.168.160.244:22] [upgrade] Now you should go ahead and upgrade the kubelet package using your package manager.
13:56:24 [ALRT] [upgrade.go:125] third to restart kubelet on dev-k8s-node
13:56:24 [INFO] [ssh.go:57] [ssh][192.168.160.244:22] systemctl daemon-reload && systemctl restart kubelet
13:56:26 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/etcd] Non fatal issue encountered during upgrade: the desired etcd version for this Kubernetes version "v1.18.3" is "3.4.3-0", but the current etcd version is "3.4.3". Won't downgrade etcd, instead just continue
13:56:26 [INFO] [ssh.go:50] [192.168.160.245:22] W0924 01:56:26.134571   21760 manifests.go:225] the default kube-apiserver authorization-mode is "Node,RBAC"; using "Node,RBAC"
13:56:26 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/staticpods] Preparing for "kube-apiserver" upgrade
13:56:26 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:56:41 [ALRT] [upgrade.go:136] fourth to uncordon node, 10 seconds to wait for dev-k8s-node ready
13:56:47 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0

13:58:03 [INFO] [ssh.go:50] [192.168.160.245:22] [apiclient] Found 2 Pods for label selector component=kube-apiserver
13:58:07 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/staticpods] Component "kube-apiserver" upgraded successfully!
13:58:07 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/staticpods] Moved new manifest to "/etc/kubernetes/manifests/kube-controller-manager.yaml" and backed up old manifest to "/etc/kubernetes/tmp/kubeadm-backup-manifests-2020-09-24-01-56-21/kube-controller-manager.yaml"
13:58:07 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-controller-manager-centos8-k8s hash: 79561830e5eb0398f029dacf3fe02884
13:58:07 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-controller-manager-centos8-k8s hash: 5774a402312acd98241d318951797558
13:58:07 [INFO] [ssh.go:50] [192.168.160.245:22] [apiclient] Found 2 Pods for label selector component=kube-controller-manager
13:58:08 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/staticpods] Component "kube-controller-manager" upgraded successfully!
13:58:08 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-scheduler-centos8-k8s hash: 5a63e5b879c453505335c9d4920890cc
13:58:09 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-scheduler-centos8-k8s hash: 738192d31444bd5d1118c309bca86763
13:58:09 [INFO] [ssh.go:50] [192.168.160.245:22] [apiclient] Found 2 Pods for label selector component=kube-scheduler
13:58:11 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade/staticpods] Component "kube-scheduler" upgraded successfully!
13:58:11 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] The control plane instance for this node was successfully updated!
13:58:11 [INFO] [ssh.go:50] [192.168.160.245:22] [kubelet-start] Writing kubelet configuration to file "/var/lib/kubelet/config.yaml"
13:58:11 [INFO] [ssh.go:50] [192.168.160.245:22] [upgrade] The configuration for this node was successfully updated!
13:58:11 [ALRT] [upgrade.go:125] third to restart kubelet on centos8-k8s
13:58:11 [INFO] [ssh.go:57] [ssh][192.168.160.245:22] systemctl daemon-reload && systemctl restart kubelet
13:58:20 [ALRT] [upgrade.go:136] fourth to uncordon node, 10 seconds to wait for centos8-k8s ready
13:58:30 [ALRT] [upgrade.go:141] fifth to judge centos8-k8s nodes is ready
```

验证

```
$ kubectl get nodes -o wide
NAME             STATUS   ROLES    AGE    VERSION   INTERNAL-IP       EXTERNAL-IP   OS-IMAGE                KERNEL-VERSION                CONTAINER-RUNTIME
centos8-k8s      Ready    master   69m    v1.18.3   192.168.160.245   <none>        CentOS Linux 8 (Core)   4.18.0-147.el8.x86_64         docker://19.3.0
dev-k8s-master   Ready    master   146m   v1.18.3   192.168.160.243   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.12
dev-k8s-node     Ready    master   69m    v1.18.3   192.168.160.244   <none>        CentOS Linux 7 (Core)   4.4.228-2.el7.elrepo.x86_64   docker://19.3.9
$ kubectl get pod -A
NAMESPACE     NAME                                       READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-688c5dc8c7-djwrj   1/1     Running   0          2m11s
kube-system   calico-node-56p7s                          1/1     Running   0          69m
kube-system   calico-node-d2qz9                          1/1     Running   0          68m
kube-system   calico-node-s2ngj                          1/1     Running   0          146m
kube-system   coredns-66bff467f8-jv56p                   1/1     Running   0          2m11s
kube-system   coredns-66bff467f8-nx2bv                   1/1     Running   0          2m11s
kube-system   etcd-centos8-k8s                           1/1     Running   0          16s
kube-system   etcd-dev-k8s-master                        1/1     Running   0          2m47s
kube-system   etcd-dev-k8s-node                          1/1     Running   0          35s
kube-system   kube-apiserver-centos8-k8s                 1/1     Running   0          16s
kube-system   kube-apiserver-dev-k8s-master              1/1     Running   1          2m47s
kube-system   kube-apiserver-dev-k8s-node                1/1     Running   0          12s
kube-system   kube-controller-manager-centos8-k8s        1/1     Running   0          21s
kube-system   kube-controller-manager-dev-k8s-master     1/1     Running   0          2m47s
kube-system   kube-controller-manager-dev-k8s-node       1/1     Running   0          15s
kube-system   kube-proxy-5xvwk                           1/1     Running   0          94s
kube-system   kube-proxy-pk7fb                           1/1     Running   0          110s
kube-system   kube-proxy-t756k                           1/1     Running   0          90s
kube-system   kube-scheduler-centos8-k8s                 1/1     Running   0          21s
kube-system   kube-scheduler-dev-k8s-master              1/1     Running   0          86s
kube-system   kube-scheduler-dev-k8s-node                1/1     Running   0          11s
```

</pre></details>

问题日志:  升级过程发现大量打印这个 `Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0`日志.
最终是升级成功了. 这个是 `kubeadm`  升级过程打印的. 
```
...
13:57:59 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:57:59 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:00 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:00 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:01 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:01 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:02 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:02 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: d538891b2e8afcdbbab5a8f4ec8dc0d0
13:58:03 [INFO] [ssh.go:50] [192.168.160.245:22] Static pod: kube-apiserver-centos8-k8s hash: f7a9d7abe2eb7bbfd96771bfca89e17f
....
```