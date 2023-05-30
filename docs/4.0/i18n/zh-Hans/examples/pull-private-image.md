# 在 sealos cloud 上面拉取私有镜像教程

本文档教您如何在 sealos 云中运行私有镜像 pod

## 在 sealos cloud 上面创建 docker hub secret

```
kubectl create secret docker-registry regcred \
  --docker-server=<你的镜像仓库服务器> \ //docker hub的话是https://index.docker.io/v1/ 
  --docker-username=<你的用户名> \
  --docker-password=<你的密码> \
  --docker-email=<你的邮箱地址>
```



## 创建 pod

### 上传一个镜像，并且在 docker hub 上面从 public 修改为 private

```
docker pull hellodm/my-first-demo:v1.0
docker tag 375fb2abe5d4 xiaojie99999/my-first-demo:v1.0
docker push xiaojie99999/my-first-demo:v1.0
```



### 在 sealos cloud 上面的 terminal 里面 apply 这个 yaml

```
apiVersion: v1
kind: Pod
metadata:
  name: my-first-demo
  labels:
    app: my-first-demo
spec:
  containers:
    - name: my-first-demo
      image: xiaojie99999/my-first-demo:v1.0
      ports:
        - containerPort: 80
      resources:
        requests:
          cpu: 0.1
          memory: 32Mi
        limits:
          cpu: 0.5
          memory: 32Mi
  imagePullSecrets:
  - name: regcred
```

## 结果

```
root@t5bha6vem:~# kubectl get pod 
NAME                                                             READY   STATUS             RESTARTS        AGE
my-first-demo                                                    1/1     Running            0               8m56s
```



