build a production kubernetes cluster

# Features
* support etcd cluster and TLS, using static pod to init etcd cluster, so monitor and management will be easy
* kubernetes master HA, HAproxy and keepalived
* calico etcd TLS

# run with docker
```
docker run --rm -it -w /etc/ansible fanux/sealos:latest bash
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
```
# cd /etc/ansible
# ansible-playbook roles/install-all.yaml
```

# install etcd
```
# ansible-playbook roles/install-etcd.yaml
```
