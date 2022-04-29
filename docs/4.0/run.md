### run calico use one image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.22.8-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```

### run calico use multi image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8-amd64 \
  registry.cn-hongkong.aliyuncs.com/sealyun/oci-calico:v3.22.1-amd64 \
--masters 192.168.64.2,192.168.64.22,192.168.64.20 \
--nodes 192.168.64.21,192.168.64.19
```



### run openebs use one image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico-openebs:1.22.8-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```


### run openebs use multi image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes:1.22.8-amd64 \
  --masters 192.168.64.2,192.168.64.22,192.168.64.20  \
  --nodes 192.168.64.21,192.168.64.19

sealos run   registry.cn-hongkong.aliyuncs.com/sealyun/oci-calico:v3.22.1
sealos run   registry.cn-hongkong.aliyuncs.com/sealyun/oci-openebs:3.1.0
```
