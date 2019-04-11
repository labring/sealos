# [构建生产环境可用的高可用kubernetes集群](https://github.com/fanux/sealos)

# 特性
- [x] 支持任意节点的etcd集群自动构建，且etcd集群使用安全证书，通过static pod方式启动，这样可以通过监控pod来监控etcd集群健康状态
- [x] 支持多master节点，允许任意一台master宕机集群功能不受影响
- [x] calico使用etcd集群，配置安全证书，网络管控数据无单点故障
- [x] 包含dashboard, heapster coreDNS addons, coreDNS双副本，无单点故障
- [x] 使用haproxy负载master节点，同样是用static pod，这样可通过统一监控pod状态来监控haproxy是否健康
- [x] haproxy节点使用keepalived提供虚拟IP，任意一个节点宕机虚拟IP可实现漂移，不影响node连接master
- [x] node节点与kube-proxy配置使用虚拟IP
- [x] promethus 监控功能，一键安装，无需配置
- [x] [istio 微服务支持](https://sealyun.com/pro/istio/)

# ship on docker
## 你必须已经有了[sealyun kubernetes离线安装包](https://sealyun.com/pro/products/) (默认支持kubernetes版本v1.12.x，针对特殊版本的适配会切分支处理)

大概原理是为了减少大家搭建ansible和sealos的环境，客户端的东西都放到docker里，把安装包挂载到容器中，然后ansible脚本会把包分发到你在hosts文件中配置的所有服务器上

所以大概分成三步：

1. 配置免密钥，把docker里的公钥分发给你所有的服务器
2. 配置ansible playbook的hosts文件
3. 执行ansible

下面逐一说明：

# 启动ansible容器与免密钥设置
找台宿主机如你的PC，或者一台服务器，把下载好的离线包拷贝到/data目录，启动sealos容器，把离线包挂载进去：

```
docker run --rm -v /data/kube1.12.0.tar.gz:/data/kube1.12.0.tar.gz -it -w /etc/ansible fanux/sealos:v1.12.0-beta bash
```

在容器里面执行：
```
mkdir ~/.ssh
cd ~/.ssh
ssh-keygen -t rsa
```
ssh public key:
```
cat ~/.ssh/id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7fTirP9zPcx7wIjhsF+Dyu0A2sV5llC8jsmp/xtiyuJirE3mclpNEqgrzHC26f+ckfzwoE0HPU0wDPxbWFl3B0K89EwJSBsVZSZ0VLYnZp0u2JgwCLZzZzKfY0018yoqoL9KHz/68RpqtG2bWVf0/WSj+4hN7xTRpRTtXJHBOQRQBfqVSIcfMBSEnO15buUbDaLol/HvQd0YBrWwafQtMacmBlqDG0Z6/yeY4sTNRVRV2Uu5TeaHfzgYgmY9+NxtvPn8Td6tgZtq7cVU//kSsbzkUzDSD8zsh8kPUm4yljT5tYM1cPFLGM4m/zqAjAZN2YaEdFckJFAQ7TWAK857d root@8682294b9464
```
这样公钥就生成了
## 在其它所有要安装k8s的服务器上执行：
```
cd ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7fTirP9zPcx7wIjhsF+Dyu0A2sV5llC8jsmp/xtiyuJirE3mclpNEqgrzHC26f+ckfzwoE0HPU0wDPxbWFl3B0K89EwJSBsVZSZ0VLYnZp0u2JgwCLZzZzKfY0018yoqoL9KHz/68RpqtG2bWVf0/WSj+4hN7xTRpRTtXJHBOQRQBfqVSIcfMBSEnO15buUbDaLol/HvQd0YBrWwafQtMacmBlqDG0Z6/yeY4sTNRVRV2Uu5TeaHfzgYgmY9+NxtvPn8Td6tgZtq7cVU//kSsbzkUzDSD8zsh8kPUm4yljT5tYM1cPFLGM4m/zqAjAZN2YaEdFckJFAQ7TWAK857d root@8682294b9464" >> authorized_keys
```
这样公钥分发工作完成了，所有的机器直接ssh无需输入密码即可登录
然后登录每台机器, 对hostname进行修改, 要求hostname唯一,不与其他机器重复.

# 修改配置
Config your own hosts
```
# cd /etc/ansible
# vim hosts
```
配置说明：
```
[k8s-master]
10.1.86.204 name=node01 order=1 role=master lb=MASTER lbname=lbmaster priority=100
10.1.86.205 name=node02 order=2 role=master lb=BACKUP lbname=lbbackup priority=80
10.1.86.206 name=node03 order=3 role=master 

[k8s-node]
10.1.86.207 name=node04 role=node

[k8s-all:children]
k8s-master
k8s-node

[all:vars]
tar_local=/data  #k8s安装目录
need_ntp=true  #是否安装ntp
vip=10.1.86.209   # 同网段未被占用IP
k8s_version=1.12.0  # kubernetes版本
etcd_image=k8s.gcr.io/etcd:3.2.24 #镜像名称
haproxy_image=haproxy:1.7
keepalived_image=fanux/keepalied:alpine-2.0.8
calico_node_image=quay.io/calico/node:v3.2.2
calico_cni_image=quay.io/calico/cni:v3.2.2
calico_controller_image=quay.io/calico/kube-controllers:v3.2.2
ip_interface=eth.*
etcd_crts=["ca-key.pem","ca.pem","client-key.pem","client.pem","member1-key.pem","member1.pem","server-key.pem","server.pem","ca.csr","client.csr","member1.csr","server.csr"]
k8s_crts=["apiserver.crt","apiserver-kubelet-client.crt","ca.crt", "front-proxy-ca.key","front-proxy-client.key","sa.pub", "apiserver.key","apiserver-kubelet-client.key",  "ca.key",  "front-proxy-ca.crt",  "front-proxy-client.crt" , "sa.key"]
```

注意role=master的会装etcd与kubernetes控制节点，role=node即k8s node节点，配置比较简单，除了改IP和版本，其它基本不用动

# 启动安装
```
# ansible-playbook roles/install-all.yaml
```

# uninstall all
```
# ansible-playbook roles/uninstall-all.yaml
```


# 注意事项与常见问题
