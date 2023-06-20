# Imagehub

基于 kubernetes CRD, imagehub 是在sealos cloud上管理和展示集群镜像信息的应用。

## Imagehub CRD

Imagehub 有四种CRD

### Image

Image 是从用户镜像的 readme 文件中生成的，并会在推送集群镜像时由 sealos 命令行工具自动应用到 imagehub，这样在 sealos
cloud 上 imagehub 就能展示这些信息。

Image 的 owner 被设置为它所在的repository，用于垃圾回收

Image CRD有以下元素：

- labels:
    - organization label
    - repository label
    - image tag label
- spec:
    - image name
    - detail info

下面是一个image cr的例子

```yaml
apiVersion: imagehub.sealos.io/v1
kind: Image
metadata:
  labels:
    organization.imagehub.sealos.io: labring
    repository.imagehub.sealos.io: cert-manager
    tag.imagehub.sealos.io: v1.8.0
  name: labring.cert.manager.v1.8.0
spec:
  detail:
    ID: Unknown
    arch: Unknown
    description: Cloud native certificate management. X.509 certificate management
      for Kubernetes and OpenShift
    docs: |
      # cert-manager

      cert-manager adds certificates and certificate issuers as resource types in Kubernetes clusters, and simplifies the process of obtaining, renewing and using those certificates.

      It supports issuing certificates from a variety of sources, including Let's Encrypt (ACME), HashiCorp Vault, and Venafi TPP / TLS Protect Cloud, as well as local in-cluster issuance.

      cert-manager also ensures certificates remain valid and up to date, attempting to renew certificates at an appropriate time before expiry to reduce the risk of outages and remove toil.

      ![cert-manager high level overview diagram](https://cert-manager.io/images/high-level-overview.svg)

      ## Documentation

      Documentation for cert-manager can be found at [cert-manager.io](https://cert-manager.io/docs/).

      For the common use-case of automatically issuing TLS certificates for
      Ingress resources, see the [cert-manager nginx-ingress quick start guide](https://cert-manager.io/docs/tutorials/acme/nginx-ingress/).

      For a more compressive guide to issuing your first certificate, see our [getting started guide](https://cert-manager.io/docs/getting-started/).
    icon: https://cert-manager.io/images/cert-manager-logo-icon.svg
    keywords:
      - Storage
  name: labring/cert-manager:v1.8.0
```

**注意：其中有些详情信息是由 sealos 命令行工具在用户推送镜像到 sealos registry： `hub.sealos.cn`时自动添加上去的，比如
image hash、name、arch...**

### Repository

Repository 是在image cr创建后自动生成的，缩写是 `repo`，它的owner被设置为其所在的organization，同样用于垃圾回收。
Repository 维护了image的共有信息，并且为未来提供了耕细粒度权限控制的基础。

Repository CRD有以下元素

- labels:
    - organization label
    - repository label
    - keywords labels
- spec:
    - repository name
- status:
    - image tag list
    - image latest tag

下面是一个repository cr的例子

```yaml
apiVersion: imagehub.sealos.io/v1
kind: Repository
metadata:
  labels:
    keyword.imagehub.sealos.io/Storage: ""
    organization.imagehub.sealos.io: labring
    repository.imagehub.sealos.io: cert-manager
  name: labring.cert-manager
spec:
  name: labring/cert-manager
status:
  latestTag:
    creatTime: "2022-12-27T07:33:08Z"
    metaName: labring.cert.manager.v1.8.0
    name: v1.8.0
  tags:
    - creatTime: "2022-12-27T07:37:34Z"
      metaName: labring.cert.manager.v1.7.0
      name: v1.7.0
    - creatTime: "2022-12-27T07:33:08Z"
      metaName: labring.cert.manager.v1.8.0
      name: v1.8.0
```

**注意：你不必去创建或者修改repository**

### Organization

Organization CRD 为用户提供了使用sealos registry的方法。用户可以创建 organization 然后 push 他们的 cluster image 到组织中。

下面是创建organization的例子

```yaml
apiVersion: imagehub.sealos.io/v1
kind: Organization
metadata:
  name: organization-name
spec:
  name: organization-name
  creator: your-user-uuid
  manager: [ your-user-uuid ]
```

你可以不设置creator和manager，creator会被默认设置为你的uuid然后加入到manager中。

**注意Organization的名称是大小写敏感的并且在sealos cloud上唯一**

### Datapack

Datapack 提供了数据构建和打包的能力：直接使用kubernetes CRD并不方便，因此我们设计了datapack CRD去从不同的CRD打包不同的数据。

建议阅读[datapack设计](datapack.md)获取更多信息。

**Datapack 用法**

你需要做下面两步：

- apply datapack cr

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

- 在其完成后 get datapack

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

## 权限控制

权限控制分为三部分

### 基于 kubernetes rbac 的 organization 权限控制

organization 权限控制是基于kubernetes rbac，在organization reconcile过程中，会创建clusterrole、clusterrolebinding。

### 基于 webhook 的 repository 和 image 权限控制

repository 和 image 权限控制 是基于 validate webhook. 当用户创建/修改 repository 和 image时，validate
webhook会判断用户是否是所在organization的manager。

### 基于organization CRD的镜像仓库权限管理

镜像仓库权限管理是基于organization CRD的，当用户尝试push、pull镜像仓库中的镜像时，registry auth server会用organization
CRD去判断用户是否有权限。

# Sealos 命令行工具设计

Sealos 命令行工具为了用户方便地使用imagehub和sealos registry做了一些修改

## sealos login

- 添加flag `-k`，意味着使用指定的kubeconfig登录registry
- 保存kubeconfig到sealos 目录下，方便以后使用

## sealos push

- 判断push的镜像仓库是否是sealos registry
- 如果是，从镜像中获取image cr的yaml并修改填充其中的部分字段然后使用kubeconfig apply到imagehub