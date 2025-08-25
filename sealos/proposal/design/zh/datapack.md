# Datapack 设计

Datapack 提供了数据构建和打包的能力：直接使用kubernetes CRD并不方便，因此我们设计了datapack CRD去从不同的CRD打包不同的数据。

## Why use it

对于sealos imagehub应用来说，直接使用get cr不方便：一个repository有多个镜像，并且imagehub应该展示repository的最新的镜像tag信息。
如果直接使用get cr，那么就需要先一个个地`get repository`拿到latest tag名称然后再`get image`获取latest tag的信息。

但是如果是使用datapack，你就能一次性地获取多个repository及其latest tag信息并且通过一定的策略重新使用datapack的结果。

## How it works

每当一个 datapack CR被创建，datapack controller 会基于这个 CR 的 spec type和 names 从不同的image中获取不同粒度的信息。

并且在这个CR reconcile 过程结束后，这些信息会被放在这个CR的status datas中，这样你就能从你apply的datapack
CR的status中拿到你需要的信息。

## How to use it

你需要做下面两步：

- apply your datapack cr

datapack spec 包含 `expireTime` 作为 datapack cr 的存活时间, `names` 作为这个 datapack CR需要打包的镜像名称, 以及 `type`
作为信息整合的粒度。

有三中不同的信息粒度： `base`, `grid`, `detail`。

```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapackuid
spec:
  expireTime: 120m
  names:
    - labring/cert-manager:v1.8.0
  type: detail
```

- get it until it's ready

在datapack CR中，status codes代表着这个datapack CR的状态

下面是状态和codes的对照表

```
	NOTRUN  Codes = 0
	OK      Codes = 1
	PENDING Codes = 2
	ERROR   Codes = 3
```

**注意：如果codes是`PENDING` 你需要不断重试get直到codes变为`OK`**

下面是一个datapack CR的完整例子，他的spec type是`detail`，status codes是`OK`

```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapackuid
spec:
  expireTime: 120m
  names:
    - labring/cert-manager:v1.8.0
  type: detail
status:
  codes: 1
  datas:
    labring/cert-manager:v1.8.0:
      ID: Unknown
      arch: Unknown
      description: Cloud native certificate management. X.509 certificate management
        for Kubernetes and OpenShift
      docs: |
      icon: https://cert-manager.io/images/cert-manager-logo-icon.svg
      keywords:
        - Storage
      name: labring/cert-manager:v1.8.0
      tags:
        - creatTime: "2022-12-27T07:37:34Z"
          metaName: labring.cert.manager.v1.7.0
          name: v1.7.0
        - creatTime: "2022-12-27T07:33:08Z"
          metaName: labring.cert.manager.v1.8.0
          name: v1.8.0
```

**注意：datapack cr会在其过期后被删除**

如果你不止一次需要某一个datapack cr的结果，建议使用它的spec的hash作为matename。
在sealos imagehub应用中我们就是这样使用datapack的，这样多用户就能利用之前生成好的datapcak的结果，这样便加快了生成repository表格视图的速度。