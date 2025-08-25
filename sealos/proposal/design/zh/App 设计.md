# App 设计

## 产品用户操作事件

- ON_INSTALL 用户在 app store 中点击安装
- ON_RUN 用户在桌面上点击图标
- ON_CLOSE 用户在点击右上角的叉按钮
- ON_UNINSTALL 用户在桌面上右击卸载应用

打开应用之后应用内部专用操作：

如 sealos cloud provider 打开之后在里面创建实例，这个每个应用都可以自行发挥，不需要考虑。

## 应用类型

- 共享 operator 类型 - operator 全局共享，在用户 namespace 中只起 instance. 如 sealos cloud provider 应用
- 共享实例类型 - 整个集群只需要起一个实例，如 kuberentes dashboard
- 独占实例类型 - 所有实例都在用户的 namespace 下, 如用户自己的一个 web 后台的 deployment

这个问题可以抽象为各种不同类型的应用在用户对应执行一个操作时具体要做什么，怎么做，每种应用都可以有自己的实现。 当然某个操作也必然会有一些通用操作如 ON_INSTALL 时会把图标放到桌面上。

## 执行流程

以下分析一些普通的场景对应的操作情况，不绝对，因为设计中任何应用可以自己注册一些操作。

|  | 共享 operator 类型 | 共享实例类型 | 独占实例类型 | 通用操作 |
| --- | --- | --- | --- | --- |
| ON_INSTALL | 如果集群中 operator 没安装则安装，已安装直接 nochange | 需要检测集群中有没有安装实例，如果没安装直接安装 | 无操作 | 把图标放到桌面，执行 ENTRYPOINT 中的指令，记录已安装信息到 CRD 中 |
| ON_RUN | 启动 CR 实例 | 无操作 | 启动 CR 实例 | 打开窗口，并执行 CMD 中的指令 |
| ON_CLOSE | 无操作 | 无操作 | 无操作 | 关闭窗口，执行镜像中的 ON_CLOSE actions |
| ON_UNINSTALL | 检测是否所有实例都停止了，如果是删除 operator | 无操作（可能未来看是否在被使用，有点 serverless 感觉） | 无操作 | 执行镜像中自定义的 ON_UNINSTALL actions |

## 共享 operator 类型实例实现

sealos cloud 在遇到 ON_INSTALL 事件时会闭着眼睛执行 ENTRYPOINT 指令里面的内容，而不关心应用定义了什么样的操作，具体针对应用需要做什么事完全由编写 Sealosfile 的人决定：

Sealosfile:

```docker
FROM scratch
COPY redis-operator.yaml .
COPY redis-cr.yaml .
// ON_INSTALL 时执行
ENTRYPOINT ["kubectl apply -f redis-operator.yaml"]
// ON_RUN 时执行
CMD ["kubectl apply -f redis-cr.yaml"]
```

同样 ON_RUN 的时候闭着眼睛执行 CMD 里面的指令.

这里多次点击多次执行 ENTRYPOINT 里面的指令没有关系，因为 no change 的时候并不会重复安装，连冲突都不需要检测。 唯一要考虑的点可能是权限问题，因为如果是公用的 operator 就并不是装在用户的 ns 下面，而且有权限坚挺用户的 CR 创建。

探讨: 或许所有事件都应该通过 actions 执行，sealos cloud 的上的点击事件不应该关心 ENTRYPOINT 和 CMD, 因为可能会导致 sealos run 命令行与 sealos cloud 上不兼容，可能导致能在 sealos cloud 上运行的镜像不能直接 sealos run.

### Application CRD

用户在 app store 中点击安装的时候就会创建一个 Application 的 CR

```docker
apiVersion: app.sealos.io/v1
kind: App
metadata:
  name: my-redis-001 
spec:
  imageName: redis # image 的名称，这样可以拿到 icon 等信息
  # 规则就是 [app-name].[namespace].cloud.sealos.io 这些信息都可以拿到
  # ingress 需要应用自己自行创建，否则这个 UIEntryPoint 不生效
  UIEntryPoint: my-redis-UI
  # 读取所有的 actions，列表中是 actions name, 可以在 push 镜像时就去读取，把这
  # 些信息放到镜像元数据中。
  actions: ["redis-on-run","redis-on-uninstall","redis-on-close"] 
```

## UIEntryPoint CRD

Desktop 应该闭着眼睛去 list UIEntryPoint, 然后把这些 EntryPoint 展示在桌面上，而这些 UIEntryPoint 由 app controller 调用 actions 触发创建，应用自己定义实现。

```docker
apiVersion: app.sealos.io/v1
kind: UIEntryPoint
metadata:
  name: my-redis-UI
spec:
  appName: my-redis-001
  URL: https://my-redis-001.my-namespace.cloud.sealos.io
  icon: https://cloud.sealos.io/images/redis.svg
  status: OPENNING # CLOSED, SHRINGKING
```

如果考虑需要能开启多个window, 可以再加一个 window CRD，与UIEntryPoint 一对多的关系。这样做才能防止刷新后窗口等其它东西就不见了的情况发生。

## sealos 官方应用

对于一些非常通用的应用，如 redis, pgsql, mysql, mongo, minio 这些，几乎 80% 的应用都会使用到，sealos cloud 为了追求更好的用户体验，必须对其进行深度定制。如同 sealos cloud provider 一样，要能在应用内去管理实例的生命周期。

1. 构建 sealos cloud provider sealos 镜像 & 推送

```docker
FROM scratch
COPY operator.yaml .
COPY infra-cluster-cr.yaml .
# 拷贝镜像元数据，如 logo 地址名称 ID 等这些信息
COPY image-metadata.yaml .
# 拷贝各种自定义的事件
COPY actions .
ENTRYPOINT ["kubectl apply -f operator.yaml"]
CMD ["kubectl apply -f infra-cluster-cr.yaml"]
```

1. 在 appstore 中点击安装

拷贝 logo 到桌面，执行 ON_INSTALL actions, 如果实例未启动则启动实例，注册访问入口。

## 其它想法

- idea: 临时 operator, 其实 operator 没有必要一直执行，可以通过 informal 唤醒，这样就可以直接把 operator 放到用户的 namespace 中而不需要一直长时间运行，也就没有 operator 要共享还是给每个用户单独运行的问题了。

## Q&A

- 如何处理无 UIEntryPoint 的应用？

应用元数据里面应该需要有标识，应该有一个 UIEntryPoint 的 CR, 应用 apply 的时候自行创建。

- 如何处理需要管理权限运行的实例，如共享的 operator，以及共享的实例？