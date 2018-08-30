build a production kubernetes cluster

# Features & TODO list
- [x] 支持etcd集群和TLS,使用静态pod来初始化etcd集群，因此监控和管理将变得简单
- [x] kubernetes master cluster
- [x] calico etcd TLS, 使用 etcd集群
- [x] dashboard, heapster coreDNS 插件
- [x] master haproxy, 使用静态 pod
- [x] master keepalived
- [x] join nodes, 更改 kube-proxy configmap, 更改 kubelet config
- [ ] cluster health check 集群健康检查
- [ ] promethus 支持
- [ ] EFK 支持
- [ ] istio 支持



# run with docker
## 你需要已经下载 [sealyun 离线包](https://sealyun.com/pro/products/) ( 默认版本 v1.11.1 > 1.10.3)
将它复制到 `/data` 目录 ,如果你的版本不是v1.11.1, 你需要修改 hosts config 文件,
这个项目将更新 calico to 3.2.0, 所以他会pull new calico image
```
docker run --rm -v /data/kube1.11.1.tar.gz:/data/kube1.11.1.tar.gz -it -w /etc/ansible fanux/sealos:latest bash
```

generate ssh public key (in docker) 生成ssh公钥(在docker中):
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
# ssh setting on all hosts 所有主机上的#ssh设置
```
cd ~/.ssh
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7fTirP9zPcx7wIjhsF+Dyu0A2sV5llC8jsmp/xtiyuJirE3mclpNEqgrzHC26f+ckfzwoE0HPU0wDPxbWFl3B0K89EwJSBsVZSZ0VLYnZp0u2JgwCLZzZzKfY0018yoqoL9KHz/68RpqtG2bWVf0/WSj+4hN7xTRpRTtXJHBOQRQBfqVSIcfMBSEnO15buUbDaLol/HvQd0YBrWwafQtMacmBlqDG0Z6/yeY4sTNRVRV2Uu5TeaHfzgYgmY9+NxtvPn8Td6tgZtq7cVU//kSsbzkUzDSD8zsh8kPUm4yljT5tYM1cPFLGM4m/zqAjAZN2YaEdFckJFAQ7TWAK857d root@8682294b9464" >> authorized_keys
```

# install all
Config your own hosts
```
# cd /etc/ansible
# vim hosts
```

```
# ansible-playbook roles/install-all.yaml
```

# install etcd
```
# ansible-playbook roles/install-etcd.yaml
```
