---
sidebar_position: 6
---

# 使用 sealos registry 存储和分发你的集群镜像

sealos registry 使用 docker v2 registry， 我们设计用来专门存储和分发集群镜像的仓库。

镜像仓库域名是`hub.sealos.cn`。

## 登录 sealos cloud 并下载 kubernetes config.yml

首先，你可以在 [sealos cloud](https://cloud.sealos.io/) 免费注册一个账号。

然后， 下载并保存 config.yml， 在登录 sealos registry 时将会用到。

## 登录 sealos registry

```shell
$ sealos login -k config.yml hub.sealos.cn
```

## 使用 sealos registry 中的镜像以加快下载速度

在使用 sealos cli 时替换镜像域名为 `hub.sealos.cn` 。

下面是一个例子:
```shell
$ sealos run hub.sealos.cn/labring/kubernetes:v1.24.0 hub.sealos.cn/labring/calico:v3.22.1
```

## 推送你的集群镜像到 sealos registry

首先， 你需要在sealos cloud imagehub应用中创建一个组织.

你可以修改下面的yaml文件然后在sealos cloud terminal 应用中apply，就能创建你自己的组织

```yaml
apiVersion: imagehub.sealos.io/v1
kind: Organization
metadata:
  name: your-organization-name
spec:
  name: your-organization-name # same as metadata.name
  creator: your-uuid # find at sealos cloud page
  manager: [ your-uuid ] # you can add other user as manager
```

**注意只有组织的管理员可以推送镜像到sealos registry**

之后， 你就能使用域名 `hub.sealos.cn` 和你创建的组织名 tag 你的镜像， 然后推送到sealos registry！

```shell
$ sealos login -k config.yml hub.sealos.cn
$ sealos tag your-image-id hub.sealos.cn/your-organization-name/your-image-name:tag
$ sealos push your-image-id hub.sealos.cn/your-organization-name/your-image-name:tag
```