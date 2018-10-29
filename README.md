[简体中文](https://github.com/fanux/sealos/blob/master/docs/README_zh.md)

build a production kubernetes cluster

# Features & TODO list
- [x] support etcd cluster and TLS, using static pod to init etcd cluster, so monitor and management will be easy
- [x] kubernetes master cluster
- [x] calico etcd TLS, calico using etcd cluster
- [x] dashboard, heapster coreDNS addons
- [x] master haproxy, using static pod
- [x] master keepalived
- [x] join nodes, change kube-proxy configmap, change kubelet config
- [ ] cluster health check
- [ ] promethus support
- [ ] EFK support
- [x] [istio support](https://sealyun.com/pro/istio/)

# ship on docker
## you need already has [sealyun offline package](https://sealyun.com/pro/products/) ( default is v1.12.x )
copy it to `/data` dir 
```
docker run --rm -v /data/kube1.11.1.tar.gz:/data/kube1.11.1.tar.gz -it -w /etc/ansible fanux/sealos:v1.12.0-beta.0 bash
```

generate ssh public key (in docker):
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
# ssh setting on all hosts
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

# uninstall all
```
# ansible-playbook roles/uninstall-all.yaml
```
