# 常见问题

> 如何在build阶段设置代理服务?

```shell
HTTP_PROXY=socket5://127.0.0.1:7890 sealos build xxxxx
```

> 搭建k8s如何选择运行时？

使用镜像 kuberletes-docker 则使用docker的运行时，使用镜像 kuberletes-crio 则使用crio的运行时

> Applied to cluster error: failed to init exec auth.sh failed exit status 127

auth.sh 查看你的镜像和sealos的对应版本，如果用的kubernetes:v1.xx.x 这样的版本是需要升级sealos的。(使用了老版本的sealos但是sealos集群镜像使用的最新版)

> image-cri-shim导致端口大量占用，耗尽服务器socket资源

```shell
wget https://github.com/labring/sealos/releases/download/v4.2.0/sealos_4.2.0_linux_amd64.tar.gz && tar xvf sealos_4.2.0_linux_amd64.tar.gz image-cri-shim
sealos exec -r master,node "systemctl stop image-cri-shim"
sealos scp "./image-cri-shim" "/usr/bin/image-cri-shim"
sealos exec -r master,node "systemctl start image-cri-shim"
sealos exec -r master,node "image-cri-shim -v"
```


> [ERROR FileAvailable--etc-kubernetes-kubelet.conf]: /etc/kubernetes/kubelet.conf already exists 

升级sealos 4.1.7+

> function "semverCompare" not defined

升级到 sealos 4.1.4+
