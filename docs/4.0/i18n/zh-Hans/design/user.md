---
sidebar_position: 5
---

# 用户/用户组管理

作为一个云操作系统，用户管理是最基本的能力，sealos 用户管理吸取 Linux 精髓，支持用户/用户组的一个多租户管理系统。
同样 sealos 用户也可以对接 OAuth2 或者 LDAP 这些外部系统, 不过需要超级管理员。

## 用户 CRD

```yaml
apiVersion: sealos.io/v1
data:
  password: MWYyZDFlMmU2N2Rm
kind: User
metadata:
  name: fanux
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
```

## root 用户

超级管理员 root, 在集群安装时创建密码，拥有整个集群的管理权限。

```yaml
apiVersion: sealos.io/v1
data:
  password: MWYyZDFlMmU2N2Rm
kind: User
metadata:
  name: root
  uid: cfee02d6-c137-11e5-8d73-42010af00002
type: Opaque
```

## 用户与用户组的关系

一个用户可以在多个组中, 一个组中也可有多个用户，是多对多关系。使用 UserGroupBinding 对象来绑定两者：

```yaml
kind: UserGroupBinding
apiVersion: sealos.io/v1
metadata:
  name: user-admin-test
subjects:
  - kind: User
    name: "fanux" # Name is case sensitive
    apiGroup: sealos.io/v1
roleRef:
  kind: Group
  name: admin # using admin role
  apiGroup: sealos.io/v1
```

## 用户与 namespace 关系

一个用户可以创建多个 namespace, 一个 namespace 也可以让多个用户或者用户组访问。

使用 UserNamespaceBinding 对象绑定二者。

在用户被创建时会默认为该用户创建一个 namespace, 如果用户不指定 ns 创建的所有 ns 都会在该 ns 中。

注意 namespace 的 quota, 以及 role 的处理。

- 普通用户是否可以创建 namespace, 应该是可以的，但是需要对接计量系统，对其进行收费，sealos 完全按照公有云的需求去设计，企业不论大小，即便私有云，也是多部门，场景更像公有云。

## 用户登录

登录时对用户的账户密码进行校验，管理员与普通用户拥有相同的用户界面，可以自由切换 namespace, 管理员可以切换任意的 namespace.
