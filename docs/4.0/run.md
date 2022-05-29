### run calico use one image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico:1.24.0-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```

### run calico use multi image

```shell
sealos run kubernetes:v1.24.0 \
  calico:v3.22.1 \
--masters 192.168.64.2,192.168.64.22,192.168.64.20 \
--nodes 192.168.64.21,192.168.64.19
```



### run openebs use one image

```shell
sealos run registry.cn-hongkong.aliyuncs.com/sealyun/oci-kubernetes-calico-openebs:1.24.0-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```


### run openebs use multi image

```shell
sealos run kubernetes:v1.24.0 \
  --masters 192.168.64.2,192.168.64.22,192.168.64.20  \
  --nodes 192.168.64.21,192.168.64.19

sealos run   calico:v3.22.1
sealos run   openebs:3.1.0
```
