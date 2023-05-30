---
sidebar_position: 5
---

## 用户/用户组管理

本文档主要介绍了用户管理系统的架构和使用方法。这个用户管理系统包括以下几个主要部分：User、UserGroup、UserGroupBinding 及相关控制器和 webhook。系统通过控制器完成资源对象的处理和同步，通过 webhook 进行验证和默认值设置，以确保数据的完整性和正确性。

### User

User 代表了一个用户。在 User 结构体中，除了元数据外，还包括了 Spec（包括 CSRExpirationSeconds：证书签名请求的过期时间）和 Status（包括用户的状态和 KubeConfig 信息）等属性。Default 方法用于设置 User 结构体的默认值。如果 CSRExpirationSeconds 没有设置，将默认为 7200 秒。同时，如果 UserAnnotationDisplayKey 注解为空，将使用 User 的 Name 作为默认值。UserReconciler 控制器负责处理 User 对象的创建和更新操作。

### UserGroup

UserGroup 代表了一组用户。UserGroup 结构体包括元数据和 UserGroupStatus（包括用户组的状态）。Default 方法用于设置 UserGroup 结构体的默认值。如果 UserAnnotationDisplayKey 注解为空，将使用 UserGroup 的 Name 作为默认值。UserGroupReconciler 控制器负责处理 UserGroup 对象的创建和更新操作。

### UserGroupBinding

UserGroupBinding 代表了用户组和角色之间的关联。UserGroupBinding 结构体包括元数据、Subject（绑定的对象）、RoleRef（角色引用）和 UserGroupRef（用户组引用）等属性。Default 方法用于设置 UserGroupBinding 结构体的默认值。如果 RoleRef 为空，将默认为 RoleRefTypeUser。同时，根据 UserGroupRef 和 RoleRef，设置相应的标签（Labels）。UserGroupUserBindingController 和 UserGroupNamespaceBindingController 控制器负责处理 UserGroupBinding 对象的创建、更新和删除操作。



### 原理文档

要使用这个用户管理系统，首先需要创建 User、UserGroup 和 UserGroupBinding 对象。创建对象时，可以为其提供自定义的属性值，也可以使用默认值。系统将通过 webhook 进行验证和默认值设置，以确保数据的完整性和正确性。

在创建对象后，系统会自动处理相关的操作，例如初始化状态、同步 Kubernetes 配置、同步用户组和命名空间绑定等。如果在这些操作中遇到错误，系统将在事件中记录错误信息，并尝试重新执行操作。具体操作如下：

1. User 控制器会对 User 对象执行以下操作：

    - 初始化状态
    - User 控制器会根据用户信息生成 kubeconfig （当前默认是sa方式）
        - CSR（Certificate Signing Request）
        - Cert（证书）
        - SA（Service Account）
        - Webhook
    - 同步 Owner UserGroup
    - 同步 Owner UserGroup Namespace Binding
    - 同步最终状态

2. UserGroup 控制器会对 UserGroup 对象执行以下操作：

    - 初始化状态
    - 同步 Owner UserGroup User Binding
    - 同步最终状态

3. UserGroupBinding 控制器会对 UserGroupBinding 对象执行以下操作：

   对于 UserGroupNamespaceBindingController：

    - 初始化状态
    - 同步命名空间
    - 同步 RoleBinding
    - 同步最终状态

   对于 UserGroupUserBindingController：

    - 初始化状态
    - 同步 ClusterRole 生成
    - 同步 ClusterRoleBinding（基于 Owner）
    - 同步 ClusterRoleBinding
    - 同步 RoleBinding
    - 同步最终状态

在对象创建或更新时，webhook 将负责验证对象的属性值，并根据需要设置默认值。webhook 验证逻辑主要包括：

1. User 和 UserGroup 的验证：
    - 验证 UserAnnotationDisplayKey 注解是否为空
    - 验证 UserAnnotationOwnerKey 注解是否为空
2. UserGroupBinding 的验证：
    - 验证 UserAnnotationOwnerKey 注解是否为空
    - 验证 UgNameLabelKey 标签是否为空
    - 验证 UgRoleLabelKey 标签是否为空
    - 验证 UgBindingKindLabelKey 标签是否为空
    - 验证 UgBindingNameLabelKey 标签是否为空
    - 验证 RoleRef 是否为空
    - 验证 UserGroupRef 是否为空
    - 验证 Subject.Kind 是否为空
    - 验证 Subject.Name 是否为空
    - 验证 Subject.APIGroup 是否为空（仅在 Subject.Kind 不为 "Namespace" 时）

其中一些常量字段是：

- UserAnnotationDisplayKey： user.sealos.io/creator

- UserAnnotationOwnerKey： user.sealos.io/display-name

- UgNameLabelKey： user.sealos.io/usergroup.name

- UgRoleLabelKey： user.sealos.io/usergroup.role

- UgBindingKindLabelKey： user.sealos.io/usergroupbinding.kind

- UgBindingNameLabelKey： user.sealos.io/usergroupbinding.name

在创建用户时，系统将遵循以下步骤：

1. 创建 User 对象。如果没有指定 kubeconfig 生成方式，系统将默认使用 Service Account 方式生成。
2. 如果没有对应的 UserGroup 和 UserGroupBinding，系统会自动级联创建并赋予默认权限。默认情况下，用户将拥有对自己的管理权限。
3. 如果需要将用户添加到关联的 Namespace，手动创建相应的 UserGroupBinding。系统将授予普通用户对应权限。

### 安装说明

#### 安装前准备

确保您已经安装了以下依赖项：

- sealos install kubernetes
- Sealos CLI

#### 如何构建镜像

在项目`deploy`下，运行以下命令以构建用户管理系统 controller 镜像：

```shell
sealos build -t docker.io/labring/sealos-user-controller:dev -f Dockerfile .
```

此命令会使用 `Dockerfile` 构建一个名为 `docker.io/labring/sealos-user-controller:dev` 的镜像。

#### 如何运行

使用以下命令运行用户管理系统 controller：

```shell
sealos run docker.io/labring/sealos-user-controller:dev
```

这将启动用户管理系统 controller，使用刚刚构建的镜像。

现在，用户管理系统 controller 已经成功安装并运行。您可以开始使用用户管理系统来管理用户、用户组和用户组绑定。

### 使用说明

#### 创建用户

要创建一个新用户，请创建一个名为 `user.yaml` 的文件，填写以下内容：

```yaml
apiVersion: user.sealos.io/v1
kind: User
metadata:
  name: my-user
spec:
  csrexpirationseconds: 7200

```

通过运行以下命令来创建用户：

```shell
kubectl apply -f user.yaml
```

在这个示例中，我们创建了一个名为 `my-user` 的用户，并设置了 CSR 过期时间为 7200 秒。 (CSR的超时时间暂时未实现)

#### 创建用户组

要创建一个新用户组，请创建一个名为 `usergroup.yaml` 的文件，填写以下内容：

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroup
metadata:
  name: my-usergroup
```

通过运行以下命令来创建用户组：

```shell
kubectl apply -f usergroup.yaml
```

在这个示例中，我们创建了一个名为 `my-usergroup` 的用户组。

#### 创建用户组绑定用户

要创建一个新用户组与用户绑定，请创建一个名为 `usergroupbinding-user.yaml` 的文件，填写以下内容：

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  name: my-usergroupbinding
spec:
  usergroupref: my-usergroup
  roleref: user
  subject:
    kind: User
    name: my-user
```

通过运行以下命令来创建用户组绑定：

```shell
kubectl apply -f usergroupbinding-user.yaml
```

在这个示例中，我们创建了一个名为 `my-usergroupbinding` 的用户组绑定，将名为 `my-user` 的用户绑定到名为 `my-usergroup` 的用户组，并指定了用户角色为 `user`。

#### 创建用户组绑定namespace

要创建一个新用户组与namespace绑定，请创建一个名为 `usergroupbinding-namespace.yaml` 的文件，填写以下内容：

```yaml
apiVersion: user.sealos.io/v1
kind: UserGroupBinding
metadata:
  name: my-usergroupbinding
spec:
  userGroupRef: my-usergroup # 用户组的名称
  roleRef: user # 用户组在命名空间中的角色（例如：user,manager等）
  subject:
    kind: Namespace # 被绑定的资源类型（这里是命名空间）
    name: my-namespace # 被绑定的资源名称（这里是命名空间的名称）

```

通过运行以下命令来创建用户组绑定：

```shell
kubectl apply -f usergroupbinding-namespace.yaml
```

在这个示例中，我们创建了一个名为 `my-usergroupbinding` 的用户组绑定，将名为 `my-namespace` 的namespace绑定到名为 `my-usergroup` 的用户组，并指定了namespace角色为 `user`。



通过以上操作，您可以成功创建用户、用户组和用户组绑定（用户和namespace）。使用这些资源，您可以方便地管理和控制用户权限，以满足您的组织需求。



在创建用户时，系统会默认执行以下操作：

1. 创建一个名为 `ug-{user}` 的用户组，其中 `{user}` 是新创建的用户的名称。这个用户组用于存储用户的基本信息和权限设置。
2. 创建一个名为 `ugn-{user}` 的命名空间与用户组的绑定关系。这个绑定关系用于将用户组与特定的命名空间关联起来，以便在该命名空间中授予用户相应的权限。
3. 创建一个名为 `ugu-{user}` 的用户与用户组的绑定关系。这个绑定关系将新创建的用户与默认的用户组关联起来，以便将用户的基本信息和权限设置与用户组相互关联。

通过这种方式，在创建用户时，系统会自动为用户分配默认的用户组、命名空间与用户组的绑定关系以及用户与用户组的绑定关系。这样可以简化用户管理流程，确保新创建的用户具有基本的权限和配置。



### 使用user验证

在用户管理系统中，为用户生成的kubeconfig可以用于访问Kubernetes集群。以下是如何使用User的kubeconfig字段登录Kubernetes的步骤：

1. 获取用户的kubeconfig字段。这可以从用户资源的`.status.kubeconfig`字段中获取，也可以从API或其他工具获取。
2. 将kubeconfig内容保存到一个文件中，例如`user-kubeconfig.yaml`。
3. 使用kubectl配置环境变量`KUBECONFIG`指向用户kubeconfig文件：

```shell
export KUBECONFIG=user-kubeconfig.yaml
```

4. 现在，您可以使用kubectl与Kubernetes集群进行交互，该集群将使用指定的用户kubeconfig进行身份验证。

#### 验证用户权限

要验证用户在Kubernetes集群中的权限，请执行以下操作：

1. 使用kubectl获取当前上下文的用户身份：

```shell
kubectl config get-contexts
```

确认`USER`字段显示的是您期望的用户。

2. 检查用户可以访问的资源列表：

```shell
kubectl auth can-i --list
```

这将显示当前用户可以访问的API组、资源和操作（例如：get、list、create等）。

3. 若要检查特定资源的访问权限，可以使用以下命令：

```shell
kubectl auth can-i <action> <resource> [--subresource] [-n <namespace>]
```

例如，检查用户是否可以在`example-namespace`命名空间中创建部署：

```shell
kubectl auth can-i create deployments -n example-namespace
```

通过以上步骤，您可以使用用户的kubeconfig字段登录Kubernetes集群，并验证其在集群中具有的权限。您可以根据实际需求调整用户的角色和权限，以便为用户提供适当的访问控制。
