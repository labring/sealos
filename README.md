build a production kubernetes cluster

# run with docker
```
docker run -v /Users/fanux/work/src/github.com/sealyun/sealos:/etc/ansible -v /Users/fanux:/data -it -w /etc/ansible ansible/ansible:centos7 bash
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

# install etcd
ansible-playbook roles/install-etcd.yaml
