# Install sealos and pre-requirements for hub

## For masters access nodes

* Make sure masters can access nodes each other, using:
    1. password
    2. ssh key(recommended)
        ```bash
        ssh-keygen -t ed25519 -C "master0@hub.sealos.cn"
        ```
        Copy `~/.ssh/id_ed25519.pub` to all masters&nodes root `~/.ssh/authorized_keys`
    3. custom port(optional)
        ```bash
        vim /etc/ssh/sshd_config
        ```
        *change Port to custom*
        ```config
        Port 4238
        ```
        ```bash
        sudo service sshd restart
        ```
        **Also: needs to check custom port are allowed in network acls**

## For cluster init

### Init sealos cluster
```bash
wget https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz && tar -zxvf sealos_4.1.3_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters xxx.xxx.xxx.xxx --nodes xxx.xxx.xxx.xxx --port 4238 -i ~/.ssh/id_ed25519
```

### Install base packages
```bash
sealos run labring/helm:v3.8.2 labring/cert-manager:v1.8.0 
```

### Install DNS proxy (Optional)
When cloud infra pod cannot access outbound network, install this package.
```bash
sealos run labring/coredns:v0.0.1
```

### Install network
```bash
sealos run labring/ingress-nginx:4.1.0
```
```bash
kubectl taint node NODE_NAME node-role.kubernetes.io/master-
kubectl taint node NODE_NAME node-role.kubernetes.io/control-plane:NoSchedule-
```

* If we are using ingress-nginx bare-metal mode, we needs to change things described below:
```bash
# goto sealos rootfs dir
cd /var/lib/sealos/data/default/rootfs
helm upgrade ingress-nginx ingress-nginx --namespace ingress-nginx --set controller.hostNetwork=true,controller.kind=DaemonSet
```

https://cert-manager.io/docs/tutorials/zerossl/zerossl/

## Note for aliyun usage:
By default, sealos's calico image use cidr `100.64.0.0/10` witch will conflict with aliyun's internal oss services.
We need to update this cidr before install kubernetes as documented here:  https://github.com/labring/sealos/issues/1119#issuecomment-1166756114
