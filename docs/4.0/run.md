### install  buildah 

#### amd64 

```shell
wget https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.amd64 --no-check-certificate -O buildah
chmod a+x buildah && mv buildah /usr/bin
```

#### arm64

```shell
wget https://sealyun-home.oss-accelerate.aliyuncs.com/images/buildah.linux.arm64 --no-check-certificate -O buildah
chmod a+x buildah && mv buildah /usr/bin
```

###  install sealos

```shell
wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos && \
chmod +x sealos && mv sealos /usr/bin 
```

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
