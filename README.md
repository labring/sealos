build a production kubernetes cluster

## 免密钥操作
在ansible的操作机器上：
```
cd ~/.ssh
cd ~/.ssh/
ssh-keygen -t rsa
```
enter到底

然后就能看到公钥：
```
[root@dev-86-201 .ssh]# cat id_rsa.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC1xT4vvA/hsXuTJa1a0k9rQxlxHUSZNS7QNtMdNwqyQ+WPkPN0WGrKTLeFZLFBz4bPzbHt+5Wm7/dpF8AkWTir8X3DLB71Jj9lK4pNqLTKbjDeHXAlnHE44UvAYMVkM+irPbbt9KfxgFO3de2LQNsOzqNgM9zYbYO8KD78EhaK1Q81LDEWSCG7J3tj05wzN5MhwbRju5vjnuOI0F3ZFtyD9QRap5LmbI7wBaMLFnygKz0zQMu68W0/oMx3XGNtmfZLHziqPTGamAxcH3TkzrFPw2Z4h8NlFq5iDSWTWCci3IyQiWPCVGGHMWb3iJu2duE/A1vTkhQHaISxQCFti6+X root@dev-86-201
```
把这个公钥分发到所有机器上，追加到authorized_keys 文件后面
```
[root@dev-86-201 .ssh]# echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC1xT4vvA/hsXuTJa1a0k9rQxlxHUSZNS7QNtMdNwqyQ+WPkPN0WGrKTLeFZLFBz4bPzbHt+5Wm7/dpF8AkWTir8X3DLB71Jj9lK4pNqLTKbjDeHXAlnHE44UvAYMVkM+irPbbt9KfxgFO3de2LQNsOzqNgM9zYbYO8KD78EhaK1Q81LDEWSCG7J3tj05wzN5MhwbRju5vjnuOI0F3ZFtyD9QRap5LmbI7wBaMLFnygKz0zQMu68W0/oMx3XGNtmfZLHziqPTGamAxcH3TkzrFPw2Z4h8NlFq5iDSWTWCci3IyQiWPCVGGHMWb3iJu2duE/A1vTkhQHaISxQCFti6+X root@dev-86-201" >> authorized_keys
```

```
cd /etc/ansible
git clone https://github.com/fanux/sealos.git
mv sealos/* .
# 修改好hosts文件
ansible k8s-all -m ping
```
