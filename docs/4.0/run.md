### run calico

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.22.8-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```


### run openebs

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico-openebs:1.22.8-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```
