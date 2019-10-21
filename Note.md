# 新增app（addons）安装功能

# 使用方法
本地拉取：
```
sealos install --pkg-url dashboard.tar
```
远程拉取：
```
sealos install --pkg-url https://github.com/sealstore/dashboard/releases/download/v1.10.0-alpha.0/dashboard.tar
```

# dashboard.tar如何构造
dashboard.tar里包含yaml文件与镜像文件等

```
[root@iZj6c2ihvsz4y7barissm4Z test]# cat config 
LOAD docker load -i image.tar
APPLY kubectl apply -f manifests
DELETE kubectl delete -f manifests
REMOVE sleep 10 && docker rmi -f k8s.gcr.io/kubernetes-dashboard-amd64:v1.10.0
[root@iZj6c2ihvsz4y7barissm4Z test]# ls
config  image.tar  manifests
```
把上述三个文件打包

```
[root@iZj6c2ihvsz4y7barissm4Z test]#  tar cvf dashboard.tar config image.tar manifests
```
