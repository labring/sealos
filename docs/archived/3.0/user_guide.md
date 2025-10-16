# 使用教程
## 前提条件
* 安装并启动docker/containerd(1.20+安装containerd),**已经安装了会重启docker/containerd.** 高版本离线包自带docker/containerd，如没安装docker/containerd会自动安装.
* 下载[kubernetes 离线安装包](https://www.sealyun.com/goodsList).
* 下载[最新版本sealos](https://github.com/labring/sealos/releases).
* 务必同步服务器时间
* 主机名不可重复
* master节点CPU必须2C以上
* 请使用sealos 3.2.0以上版本

## [视频教程](http://mp.weixin.qq.com/mp/video?__biz=Mzg2NzAzODE5Ng==&mid=100000268&sn=e932ef75dfc38414c21b6b365df07c8e&vid=wxv_1003349861900664832&idx=1&vidsn=e934d4cf8bacd1f569514b69c1344cf6&fromid=1&scene=18&xtrack=1#wechat_redirect)

## 安装教程
多master HA:
```bash
sealos init --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \
    --node 192.168.0.5 \
    --user root \
    --passwd your-server-password \
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz     
```

或者单master多node:
```bash
sealos init --master 192.168.0.2 \
    --node 192.168.0.5 \
    --user root \
    --passwd your-server-password \
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz 
```

使用免密钥或者密钥对： 如果密钥对有密码， 添加`--pk-passwd password`
```bash
sealos init --master 172.16.198.83 \
    --node 172.16.198.84 \
    --pkg-url https://YOUR_HTTP_SERVER/kube1.15.0.tar.gz \
    --pk /root/kubernetes.pem \
    --version v1.15.0
```

自定义ssh端口号,如2022：
```bash
sealos init --master 172.16.198.83:2022 \
    --pkg-url https://YOUR_HTTP_SERVER/kube1.15.0.tar.gz \
    --pk /root/kubernetes.pem \
    --version v1.15.0
```

| 参数名         | 含义                                                         | 示例                    | 是否必须             |
| -------------- | ------------------------------------------------------------ | ----------------------- | -------------------- |
| passwd         | 服务器密码                                                   | 123456                  | 和私钥二选一         |
| master         | k8s master节点IP地址                                         | 192.168.0.2             | 必须                 |
| node           | k8s node节点IP地址                                           | 192.168.0.3             | 可选                 |
| pkg-url        | 离线资源包地址，支持下载到本地，或者一个远程地址             | /root/kube1.16.0.tar.gz | 必须                 |
| version        | [资源包](https://www.sealyun.com/goodsList)对应的版本                 | v1.16.0                 | 必须                 |
| kubeadm-config | 自定义kubeadm配置文件                                        | kubeadm.yaml.temp       | 可选                 |
| pk             | ssh私钥地址，免密钥时使用                                    | /root/.ssh/id_rsa       | 和passwd二选一       |
| pk-passwd      | ssh私钥密码                                                  | 默认为空                | 私钥有密码时添加即可 |
| user           | ssh用户名                                                    | root                    | 可选                 |
| interface      | 机器网卡名，CNI网卡发现用                                    | eth.*                   | 可选                 |
| network        | CNI类型如calico flannel                                      | calico                  | 可选                 |
| podcidr        | pod网段                                                      | 100.64.0.0/10           | 可选                 |
| repo           | 镜像仓库,离线包通常不用配置,除非你把镜像导入到自己私有仓库了 | k8s.gcr.io              | 可选                 |
| svccidr        | clusterip网段                                                | 10.96.0.0/12            | 可选                 |
| vlog           | kubeadm 日志等级                                             | 5                       | 可选                 |
| cert-sans      | kubernetes apiServerCertSANs                                 | sealyun.com             | 可选                 |
| without-cni    | 不装cni插件，为了用户自己装别的CNI                           | 默认安装calico-cni      | 可选                 |

具体详细参数执行 sealos init --help

检查安装是否正常:
```sh
[root@iZj6cdqfqw4o4o9tc0q44rZ ~]# kubectl get node
NAME                      STATUS   ROLES    AGE     VERSION
izj6cdqfqw4o4o9tc0q44rz   Ready    master   2m25s   v1.14.1
izj6cdqfqw4o4o9tc0q44sz   Ready    master   119s    v1.14.1
izj6cdqfqw4o4o9tc0q44tz   Ready    master   63s     v1.14.1
izj6cdqfqw4o4o9tc0q44uz   Ready    <none>   38s     v1.14.1
[root@iZj6cdqfqw4o4o9tc0q44rZ ~]# kubectl get pod --all-namespaces
NAMESPACE     NAME                                              READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-5cbcccc885-9n2p8          1/1     Running   0          3m1s
kube-system   calico-node-656zn                                 1/1     Running   0          93s
kube-system   calico-node-bv5hn                                 1/1     Running   0          2m54s
kube-system   calico-node-f2vmd                                 1/1     Running   0          3m1s
kube-system   calico-node-tbd5l                                 1/1     Running   0          118s
kube-system   coredns-fb8b8dccf-8bnkv                           1/1     Running   0          3m1s
kube-system   coredns-fb8b8dccf-spq7r                           1/1     Running   0          3m1s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44rz                      1/1     Running   0          2m25s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44sz                      1/1     Running   0          2m53s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44tz                      1/1     Running   0          118s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44rz            1/1     Running   0          2m15s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44sz            1/1     Running   0          2m54s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44tz            1/1     Running   1          47s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44rz   1/1     Running   1          2m43s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44sz   1/1     Running   0          2m54s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44tz   1/1     Running   0          63s
kube-system   kube-proxy-b9b9z                                  1/1     Running   0          2m54s
kube-system   kube-proxy-nf66n                                  1/1     Running   0          3m1s
kube-system   kube-proxy-q2bqp                                  1/1     Running   0          118s
kube-system   kube-proxy-s5g2k                                  1/1     Running   0          93s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44rz            1/1     Running   1          2m43s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44sz            1/1     Running   0          2m54s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44tz            1/1     Running   0          61s
kube-system   kube-sealyun-lvscare-izj6cdqfqw4o4o9tc0q44uz      1/1     Running   0          86s
```

## 清理
```bash
sealos clean --all
```
## 增加master

```bash
sealos join --master 192.168.0.6 --master 192.168.0.7
sealos join --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

## 增加node

```bash
sealos join --node 192.168.0.6 --node 192.168.0.7
sealos join --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```
## 删除指定master节点

注意clean不加任何参数会清理整个集群

```bash
sealos clean --master 192.168.0.6 --master 192.168.0.7
sealos clean --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

## 删除指定node节点

```bash
sealos clean --node 192.168.0.6 --node 192.168.0.7
sealos clean --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

## 自定义网络

* podcidr 参数指定自定义pod网段 如 --podcidr 100.64.0.0/10
* svccidr 参数指定clusterip网段 如 --svccidr 10.96.0.0/12
* without-cni sealos自带calico网络，如果你想自己装CNI不用默认可加此参数， 如 sealos init --without-cni .....


## 添加apiServerCertSans证书

如果仅仅需要添加证书， 在`init`的时候指定`--cert-sans sealyun.com`即可

```bash
sealos init --cert-sans sealyun.com \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \
    --node 192.168.0.5 \
    --user root \
    --passwd your-server-password \
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz 
```

## 使用自定义kubeadm配置文件
比如我们需要在证书里加入 `sealyun.com`， 自定义`pod`网络 修改 `{{.PodCIDR}}` 为你想要的网段即可 :

先获取配置文件模板：

```bash
sealos config -t kubeadm >>  kubeadm-config.yaml.tmpl
```

修改`kubeadm-config.yaml.tmpl`,文件即可， 编辑增加 `sealyun.com`, 注意其它部分不用动，sealos会自动填充模板里面的内容:

```yaml
apiVersion: kubeadm.k8s.io/v1beta1
kind: InitConfiguration
localAPIEndpoint:
  advertiseAddress: {{.Master0}}
  bindPort: 6443
---
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: {{.Version}}
controlPlaneEndpoint: "{{.ApiServer}}:6443"
imageRepository: {{.Repo}}
networking:
  # dnsDomain: cluster.local
  podSubnet: {{.PodCIDR}}
  serviceSubnet: {{.SvcCIDR}}
apiServer:
  certSANs:
  - 127.0.0.1
  - sealyun.com
  - {{.ApiServer}}
  {{range .Masters -}}
  - {{.}}
  {{end -}}
  {{range .CertSANS -}}
  - {{.}}
  {{end -}}
  - {{.VIP}}
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - name: localtime
    hostPath: /etc/localtime
    mountPath: /etc/localtime
    readOnly: true
    pathType: File
controllerManager:
  extraArgs:
    feature-gates: TTLAfterFinished=true
    experimental-cluster-signing-duration: 876000h
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
  excludeCIDRs: 
  - "{{.VIP}}/32"
```

使用 --kubeadm-config 指定配置文件模板即可:

```sh
sealos init --kubeadm-config kubeadm-config.yaml.tmpl \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \
    --node 192.168.0.5 \
    --user root \
    --passwd your-server-password \
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz 
```

## 清理集群

> 清理指定节点

```bash
sealos clean --master 192.168.0.2
sealos clean --node 192.168.0.5
```

> 全部清理. 但是保留`kube1.XX.tar.gz`文件

```bash
sealos clean --all
```

## 备份集群



命令帮助如下，详情[查看github](https://github.com/labring/sealos/docs/etcdbackup.md)

```bash
sealos etcd save -h
Flags:
      --aliId string        aliyun accessKeyId to save snapshot
      --aliKey string       aliyun accessKeySecrets to save snapshot
      --backupPath string   Specify snapshot backup dir (default "/opt/sealos/ectd-backup")
      --bucket string       oss bucketName to save snapshot
      --docker              snapshot your kubernets etcd in container, will add unix timestamp to snapshot name
      --ep string           aliyun endpoints to save snapshot
  -h, --help                help for save
      --name string         Specify snapshot name (default "snapshot")
      --objectPath string   aliyun oss objectPath to save snapshot, like: /sealos/snapshots/
```

1. 本地备份, 默认保存在`/opt/sealos/ectd-backup`这个目录， 默认名称为`sanpshot`

```bash
sealos etcd save
```

2. 本地备份并复制到各`master`节点。增加`--docker`， 默认在生成的文件下添加当前的`uinx`时间戳
   然后复制到`master`节点

```bash
sealos etcd save --docker
```

3. 备份上传至oss，首次执行带命令行或者编辑`~/.sealos/config.yaml`

```bash
sealos etcd save --docker \
    --aliId youraliyunkeyid \
    --aliKey youraliyunkeysecrets \
    --ep oss-cn-hangzhou.aliyuncs.com  \
    --bucket etcdbackup  \
    --objectPath /sealos/ 
```
