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
wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos && \
chmod +x sealos && mv sealos /usr/bin 
```
