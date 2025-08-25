# systemDB 设计

## 背景介绍

整个 sealos 中有很多的系统数据并不适合放在 CRD 中，CRD 不利于检索和存储。
如：

* 计量/计费/账单信息，很适合放在时序数据库中，如 https://github.com/timescale/timescaledb or mongodb
* AppStore 数据，涉及到分页等
* 其它 Applications

增加一个关系型数据库同样可以减轻 etcd 的压力。

## 设计思路

整个 sealos 的底层存储就变成两个部分，非关系型就直接使用 CRD, 关系型使用 systemDB。当然有些场景用户不需要复杂的功能，也就可以完全裁剪掉。

systemDB 依赖：

* sealos core (kubernetes 本身 & CNI)
* CSI 实现 (如 openEBS)
* minio (高可用场景的逻辑备份，可选)

安装方式：

```yaml
sealos run openebs:v1.9.0 systemDB:v1.0
```

使用方式：

systemDB 以单实例的方式提供给所有系统组件系统应用使用，这样减少维护成本，不需要每个系统组件都去启一个单独的数据库实例。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: sdk-demo
data:
  username: ...
  password: ...
```

DNS name: `systemdb.sealos-system.svc.cluster.local:5432`

不同的系统应用使用不同的库名，不可冲突。

## Utils

```
func NewSystemDBClient() (client, error) {
    // read default secrect
}
```