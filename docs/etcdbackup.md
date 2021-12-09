# `sealos etcd` 命令

## 使用`sealos etcd save`

备份落盘位置会在执行sealos的主机上. 同时, restore的时候, 也会恢复在`执行sealos的主机上`, `sealos save` 逻辑是**调用 `etcd clientv3` 生成`snapshot`备份文件.** 

```
$ sealos etcd save -h
Flags:
      --aliId string        aliyun accessKeyId to save snapshot
      --aliKey string       aliyun accessKeySecrets to save snapshot
      --backupPath string   Specify snapshot backup dir (default "/opt/sealos/etcd-backup")
      --bucket string       oss bucketName to save snapshot
      --docker              snapshot your kubernets etcd in container, will add unix timestamp to snapshot name
      --ep string           aliyun endpoints to save snapshot
  -h, --help                help for save
      --name string         Specify snapshot name (default "snapshot")
      --objectPath string   aliyun oss objectPath to save snapshot, like: /sealos/snapshots/
```

说明一下选项

- `--aliId`:  阿里云的`accessKeyId` 
- `--aliKey`: 阿里云的`accessKeySecrets`
- `--backupPath`:  在执行sealos的主机以及master主机上的备份路径. 默认为`/opt/sealos/etcd-backup`
- `--bucket`: 阿里云的`oss bucketName`
- `--ep`: 阿里云`oss endpoint`. 例如: `oss-cn-hangzhou.aliyuncs.com`
- `--name`: 备份文件的名字, 默认为`snapshot`
- `--objectPath`: 阿里云`oss objectPath`. 例如:  `/sealos/snapshots/`

这里, 上传阿里云oss. 使用命令行或者编辑配置文件均可.

```
$ sealos etcd save --docker \
    --aliId youraliyunkeyid \
    --aliKey youraliyunkeysecrets \
    --ep oss-cn-hangzhou.aliyuncs.com  \
    --bucket etcdbackup  \
    --objectPath /sealos/ 
```

或者使用`vim` 编辑 `.sealos/config.yaml `文件. 均可

```
$ cat .sealos/config.yaml 
masters:
- 192.168.0.31:22
nodes:
- 192.168.0.30:22
- 192.168.0.88:22
- 192.168.0.65:22
dnsdomain: cluster.local
apiservercertsans:
- 127.0.0.1
- apiserver.cluster.local
- 192.168.0.31
- 10.103.97.2
user: root
passwd: ""
privatekey: /root/.ssh/id_rsa
pkpassword: ""
apiserverdomain: apiserver.cluster.local
vip: 10.103.97.2
pkgurl: /root/kube1.18.0.tar.gz
version: v1.18.0
repo: k8s.gcr.io
podcidr: 100.64.0.0/10
svccidr: 10.96.0.0/12
certpath: /root/.sealos/pki
certetcdpath: /root/.sealos/pki/etcd
lvscarename: fanux/lvscare
lvscaretag: latest
alioss:
  ossendpoint: oss-cn-hangzhou.aliyuncs.com
  accesskeyid: *****
  accesskeysecrets: ****
  bucketname: etcdbackup
  objectpath: /sealos/
```

### 在`kubernetes `使用`cronjob`备份

依赖 `~/.sealos/config.yaml`
依赖 `etcd cacert，cert， key`， 目前读取的文件是 `~/.sealos/pki/etcd/`的证书。

首先. 只需要挂载`~/.sealos/`到容器`~/.sealos/`.   挂载这个目录的目的是， 使用其中四个文件. 给四个文件创建`secret`感觉有点臃肿. 故而采用目录挂载.  我们假设`master-01`是您执行`sealos init`的主机. 

>  如果在集群外执行`init`. 请使用`scp`. 例如`scp -rf ~/.sealos master-01:/root/`.

```
$ kubectl label nodes master-01  name=sealos --overwrite
```

如果你通过ssh连接到各master的方式如果为秘钥验证, 则需要添加一个`secret`保存秘钥即可.  为了安全，我这边使用在`kube-system`中创建的。

```
$ kubectl create secret generic pk-sealos --from-file=/root/.ssh/id_rsa  -n kube-system
```

我们编辑`crontjob.yaml`

```
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: backup-etcd
  namespace: kube-system   ## you can change to any namespace
spec: #当没有指定pod选择器时它将根据pod模板中的标签创建
  schedule: "0 21 * * *"  # backup everyday on 21：00
  successfulJobsHistoryLimit: 3
  jobTemplate: #创建新pod所使用的pod模板
    spec:
      template: # 此CronJob创建Job资源会用到的模板
        spec:
          restartPolicy: OnFailure  # Job不能使用Always作为默认的重新启动策略
          nodeSelector:
            name: sealos    ## this is your sealos init machine. so we can use hostPath.
          volumes:
          - hostPath:
              path: /root/.sealos
              type: DirectoryOrCreate
            name: sealos-home
          # if use password to auth, just remove this secret
          # before use secret, you must create it.
          - secret:
              defaultMode: 420
              items:
                - key: id_rsa
                  path: id_rsa
              secretName: pk-sealos
            name: pk-sealos
          containers:
          - name: sealos
            image: louisehong/sealos:3.3.10
            args:
              - etcd
              - save
              - --docker
            volumeMounts:
              - mountPath: /root/.sealos
                name: sealos-home
              # if use password to auth, just remove this volumeMounts
              - mountPath: /root/.ssh/id_rsa
                name: pk-sealos
                subPath: id_rsa
```

然后执行`apply`即可.

```
$ kubectl apply -f crontjob.yaml
$ kubectl get cronjobs.batch -n kube-system 
NAME          SCHEDULE     SUSPEND   ACTIVE   LAST SCHEDULE   AGE
backup-etcd   0 21 * * *   False     0        20h             9d
```

备份后, 可以查看具体的日志. 

```
$ $ kubectl get pods -n kube-system| grep backup
backup-etcd-1598662800-69sbh               0/1     Completed   0          2d8h
backup-etcd-1598706000-vwhpz               0/1     Completed   0          44h
backup-etcd-1598792400-m5z5z               0/1     Completed   0          20h
$ kubectl logs -f backup-etcd-1598792400-m5z5z -n kube-system
...
13:00:12 [INFO] [etcd_save.go:120] Finished saving/uploading snapshot [snapshot-1598792407] on aliyun oss [etcdbackup] bucket
13:00:12 [INFO] [etcd.go:111] Finished saving/uploading snapshot [snapshot-1598792407]
13:00:12 [INFO] [etcd_save.go:259] health check for etcd: [{192.168.0.31:2379 true 18.571896ms }]
```

## 使用`sealos etcd health`

很简单的调用`etcd clientv3`的sdk. 执行健康检查. 每次 `save` 也会进行健康检查. 

```
$ sealos etcd health
17:14:06 [INFO] [etcd_save.go:255] health check for etcd: [{192.168.0.31:2379 true 10.493436ms }]
```

## 使用`sealos etcd restore`

`restore`的逻辑是(如果有高手有好的恢复逻辑, 请单独联系我): 

1. 手动交互确认. 如果使用了`-f 或者 --force` 则跳过确认.
2.  通过`save`下来的文件, 进行`restore`操作. 会在执行`sealos etcd restore`的主机下生成目录`restorePath + hostname`.  
3. 停止 `kubernetes kube-apiserver kube-controller-manager kube-scheduler etcd  `. 并备份`/var/lib/etcd/`
4. 将2生成的备份目录打包成`tar`包, 复制到各`etcd`节点(一般是`master`节点).  然后在各节点分别解压到` /var/lib/etcd `.
5. 启动`kubernetes kube-apiserver kube-controller-manager kube-scheduler etcd`
6. 最后做一次健康检查(60s). 
7. 如果其中有错误发生. 则恢复3步骤的备份. 

```
$ sealos etcd restore -h
Restores an etcd member snapshot to an etcd directory

Usage:
  sealos etcd restore [flags]

Flags:
      --backupPath string    Specify snapshot backup dir (default "/opt/sealos/etcd-backup")
  -f, --force                restore need interactive to confirm
  -h, --help                 help for restore
      --name string          Specify snapshot name (default "snapshot")
      --restorePath string   Specify snapshot restore dir (default "/opt/sealos/etcd-restore")

Global Flags:
      --config string   config file (default is $HOME/.sealos/config.yaml)
```

与`sealos save` 相反的操作.  但是此操作比较危险.  所以添加了交互确认. 

选项说明

- `--backupPath`:  存储备份的文件夹. 默认和`save`下来的一致, `/opt/sealos/etcd-backup`

- `--restorePath`:  恢复文件夹. 默认`/opt/sealos/etcd-restore`. 配合主机名. 避免多`master`导致恢复文件夹重复. 
- `-f, --force`:  交互式确认是否要执行restore.
- `--name`:  备份的文件名字. 默认和`save`下来的一致. `snapshot`

### 单机测试restore恢复

如下: 

```
[root@dev-k8s-master ~]# ./sealos etcd restore 
restore cmd will stop your kubernetes cluster immediately and restore etcd from your backup snapshot file  (y/n)?y
17:34:17 [INFO] [ssh.go:12] [ssh][192.168.160.243] hostname
17:34:17 [DEBG] [ssh.go:24] [ssh][192.168.160.243]command result is: dev-k8s-master

17:34:17 [INFO] [ssh.go:105] [ssh][192.168.160.243] cd /tmp && rm -rf /opt/sealos/etcd-restore-dev-k8s-master
17:34:17 [INFO] [ssh.go:12] [ssh][192.168.160.243] hostname
17:34:18 [DEBG] [ssh.go:24] [ssh][192.168.160.243]command result is: dev-k8s-master

{"level":"info","ts":1598866458.160008,"caller":"snapshot/v3_snapshot.go:296","msg":"restoring snapshot","path":"/opt/sealos/etcd-backup/snapshot","wal-dir":"/opt/sealos/etcd-restore-dev-k8s-master/member/wal","data-dir":"/opt/sealos/etcd-restore-dev-k8s-master","snap-dir":"/opt/sealos/etcd-restore-dev-k8s-master/member/snap"}
{"level":"info","ts":1598866458.1982617,"caller":"mvcc/kvstore.go:380","msg":"restored last compact revision","meta-bucket-name":"meta","meta-bucket-name-key":"finishedCompactRev","restored-compact-revision":970469}
{"level":"info","ts":1598866458.2281547,"caller":"membership/cluster.go:392","msg":"added member","cluster-id":"d12074ddc55c9483","local-member-id":"0","added-peer-id":"5dfe17d3cf203a7e","added-peer-peer-urls":["https://192.168.160.243:2380"]}
{"level":"info","ts":1598866458.235216,"caller":"snapshot/v3_snapshot.go:309","msg":"restored snapshot","path":"/opt/sealos/etcd-backup/snapshot","wal-dir":"/opt/sealos/etcd-restore-dev-k8s-master/member/wal","data-dir":"/opt/sealos/etcd-restore-dev-k8s-master","snap-dir":"/opt/sealos/etcd-restore-dev-k8s-master/member/snap"}
17:34:28 [INFO] [ssh.go:105] [ssh][192.168.160.243] cd /tmp && mv /etc/kubernetes/manifests /etc/kubernetes/manifestslezSCljV
17:34:28 [INFO] [ssh.go:105] [ssh][192.168.160.243] cd /tmp && mv /var/lib/etcd /var/lib/etcdlezSCljV
17:34:38 [INFO] [etcd.go:136] send restore file to etcd master node and start etcd
17:34:38 [INFO] [ssh.go:12] [ssh][192.168.160.243] hostname
17:34:38 [DEBG] [ssh.go:24] [ssh][192.168.160.243]command result is: dev-k8s-master

17:34:39 [INFO] [etcd_restore.go:140] compress file
17:34:39 [INFO] [ssh.go:57] [ssh][192.168.160.243] mkdir -p /var/lib || true
17:34:39 [DEBG] [download.go:29] [192.168.160.243]please wait for mkDstDir
17:34:39 [INFO] [ssh.go:12] [ssh][192.168.160.243] ls -l /var/lib/etcd-restore-dev-k8s-master.tar 2>/dev/null |wc -l
17:34:39 [DEBG] [ssh.go:24] [ssh][192.168.160.243]command result is: 0

17:34:39 [DEBG] [scp.go:24] [ssh]source file md5 value is bc76f9bb1aea210fb815a43aed27aa29
17:34:40 [ALRT] [scp.go:98] [ssh][192.168.160.243]transfer total size is: 1244.01KB ;speed is 1MB
17:34:40 [INFO] [ssh.go:12] [ssh][192.168.160.243] md5sum /var/lib/etcd-restore-dev-k8s-master.tar | cut -d" " -f1
17:34:40 [DEBG] [ssh.go:24] [ssh][192.168.160.243]command result is: bc76f9bb1aea210fb815a43aed27aa29

17:34:40 [DEBG] [scp.go:27] [ssh]host: 192.168.160.243 , remote md5: bc76f9bb1aea210fb815a43aed27aa29
17:34:40 [INFO] [scp.go:31] [ssh]md5 validate true
17:34:40 [INFO] [download.go:38] [192.168.160.243]copy file md5 validate success
17:34:40 [DEBG] [download.go:44] [192.168.160.243]please wait for after hook
17:34:40 [INFO] [ssh.go:57] [ssh][192.168.160.243] tar xf /var/lib/etcd-restore-dev-k8s-master.tar -C /var/lib/  && mv /var/lib/etcd-restore-dev-k8s-master  /var/lib/etcd && rm -rf /var/lib/etcd-restore-dev-k8s-master.tar
17:34:41 [INFO] [etcd.go:145] Start kube-apiserver kube-controller-manager kube-scheduler
17:34:41 [INFO] [ssh.go:105] [ssh][192.168.160.243] cd /tmp && mv /etc/kubernetes/manifestslezSCljV /etc/kubernetes/manifests
17:34:41 [INFO] [etcd.go:148] Wait 60s to health check for etcd
17:35:41 [INFO] [etcd_save.go:259] health check for etcd: [{192.168.160.243:2379 true 6.206351ms }]
17:35:41 [INFO] [etcd.go:151] restore kubernetes yourself glad~
```
