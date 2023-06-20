1. 如果有备份,则恢复备份.
2. 没有备份.手动恢复.

安装完成后, 默认会有以下目录. 手动恢复需要根据当前的节点情况自己写一些配置.

```
ls ~/.sealos
config.yaml
pki
sealos.log
```

配置 config.yaml

```
masters:
- 192.168.0.2
- 192.168.0.4
- 192.168.0.3
nodes:
- 192.168.0.5
- 192.168.0.6
dnsdomain: ""
apiservercertsans:
- apiserver.cluster.local
- 127.0.0.1
user: root
passwd: "123456"
privatekey: /root/.ssh/id_rsa
pkpassword: ""
apiserverdomain: apiserver.cluster.local
network: calico
vip: 10.103.97.2
pkgurl: /Users/louis/kube1.17.13.tar.gz
version: v1.17.13
repo: k8s.gcr.io
podcidr: 100.64.0.0/10
svccidr: 10.96.0.0/12
certpath: /root/.sealos/pki
certetcdpath: /root/.sealos/pki/etcd
lvscarename: fanux/lvscare
lvscaretag: latest
alioss:
  ossendpoint: ""
  accesskeyid: ""
  accesskeysecrets: ""
  bucketname: ""
  objectpath: ""

```

2. 恢复 pki 目录.


```
cd ~/.sealos
cp -r /etc/kubernetes/pki .
cp /etc/kubernetes/admin.conf .
cp /etc/kubernetes/controller-manager.conf .
cp /etc/kubernetes/scheduler.conf .
```

3. 重新 join 即可 宕机的 master 即可.

```
sealos join --master $masterip. 
```
