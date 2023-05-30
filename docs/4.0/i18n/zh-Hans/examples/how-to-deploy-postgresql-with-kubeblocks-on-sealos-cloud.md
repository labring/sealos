# 如何在 sealos cloud 上用 kubeblocks 部署pgsql

## 创建一个 pgsql 实例

点击 terminal 图标，直接编写 yaml 文件即可.

可以修改的部分：
1. resources 字段中可以选择修改，使用的 cpu、memory 资源
2. replicas 字段可以修改复制品数目
3. clusterVersionRef 字段指定 cluster 版本

```yaml
# cluster.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  finalizers:
  - cluster.kubeblocks.io/finalizer
  generation: 1
  labels:
    clusterdefinition.kubeblocks.io/name: postgresql
    clusterversion.kubeblocks.io/name: postgresql-12.14.0
  name: pg-cluster
spec:
  affinity:
    nodeLabels: {}
    podAntiAffinity: Preferred
    tenancy: SharedNode
    topologyKeys: []
  clusterDefinitionRef: postgresql
  clusterVersionRef: postgresql-12.14.0
  componentSpecs:
  - componentDefRef: postgresql
    monitor: true
    name: postgresql
    replicas: 1
    resources:
      limits:
        cpu: "1"
        memory: 1Gi
      requests:
        cpu: "1"
        memory: 1Gi
    serviceAccountName: kb-sa-pg-sql
    switchPolicy:
      type: Noop
    volumeClaimTemplates:
    - name: data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 2Gi
  terminationPolicy: Delete
  tolerations: []
```

## 连接 pgsql 实例
### 本地连接

获取地址到访问的步骤：
1. 指令：`kubectl get service`，得到地址
2. 用户名、密码、端口等信息在 `secret` 对象中，例如：`kubectl get secrets pg-cluster-conn-credential -o yaml` 找到用户名和密码字段

    ```bash
    data:
        ...
        password: MTIzCg==
        ...
    ```

3. 解密得到密码

    ```bash
    $ echo MTIzCg== | base64 -d
    > 123
    ```

4. 指令：`psql -h <hostname> -p <port> -U <username> <database>`，连入指定数据库

## 修改 pgsql 状态

改变 pgsql 的方式都是通过 `kubectl apply -f <yaml>` 的方式进行

### 垂直扩容

修改 reqeusts 和 limits 对应字段，从而改变数据库的 cpu、memory 使用

```yaml
# ops-vertical-scaling.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: ops-verticalscaling
spec:
  clusterRef: pg-cluster # mysql-cluster
  type: VerticalScaling
  verticalScaling:
  - componentName: postgresql # mysql
    requests:
      memory: "1Gi"
      cpu: "1"
    limits:
      memory: "2Gi"
      cpu: "2"
```

### 磁盘扩容

通过修改 storage 字段进行卷扩展

> 其中目标 storage 大小不能小于当前

```yaml
# ops-volume-expand.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: ops-volume-expansion
spec:
  clusterRef: pg-cluster #mysql-cluster
  type: VolumeExpansion
  volumeExpansion:
  - componentName: postgresql #mysql
    volumeClaimTemplates:
    - name: data
      storage: "2Gi"
```

### 停止/启动

通过修改 type 类型进行停止或启动操作

```yaml
# ops-start.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: ops-stop
spec:
  clusterRef: pg-cluster # mysql-cluster
  type: Stop # or Start
```

### 重启

修改 type 类型为 restart 实现重启

```yaml
# ops-restart.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: OpsRequest
metadata:
  name: ops-restart
spec:
  clusterRef: pg-cluster
  type: Restart
  restart:
  - componentName: postgresql # mysql
```

## 备份并恢复 pgsql

### 准备工作

备份数据库首先创建用于备份的 pvc

```yaml
# backup-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  annotations:
    dataprotection.kubeblocks.io/backup-policy: pg-sql-postgresql-backup-policy
    dataprotection.kubeblocks.io/created-by-policy: "true"
    volume.beta.kubernetes.io/storage-provisioner: local.csi.openebs.io
    volume.kubernetes.io/storage-provisioner: local.csi.openebs.io
  finalizers:
  - dataprotection.kubeblocks.io/finalizer
  - kubernetes.io/pvc-protection
  name: mysql-backup
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: openebs-lvmpv-backup
  volumeMode: Filesystem
```

### 备份

`kubectl apply -f <yaml>` 开始备份

```yaml
# backup.yaml
apiVersion: dataprotection.kubeblocks.io/v1alpha1
kind: Backup
metadata:
  annotations:
    dataprotection.kubeblocks.io/target-pod-name: pg-sql-postgresql-0
  finalizers:
  - dataprotection.kubeblocks.io/finalizer
  generation: 1
  labels:
    app.kubernetes.io/component: postgresql
    app.kubernetes.io/instance: pg-sql
    app.kubernetes.io/managed-by: kubeblocks
    app.kubernetes.io/name: postgresql
    app.kubernetes.io/version: postgresql-12.14.0
    apps.kubeblocks.io/component-name: postgresql
    apps.kubeblocks.io/workload-type: Replication
    apps.kubeblocks.postgres.patroni/role: master
    apps.kubeblocks.postgres.patroni/scope: pg-sql-postgresql-patroni
    dataprotection.kubeblocks.io/backup-type: full
    kubeblocks.io/backup-protection: retain
    kubeblocks.io/role: primary
    statefulset.kubernetes.io/pod-name: pg-sql-postgresql-0
  name: backup-default-pg-cluster
spec:
  backupPolicyName: pg-cluster-postgresql-backup-policy
  backupType: full
```

备份成功

```bash
NAME                        TYPE   STATUS       TOTAL-SIZE   DURATION   CREATE-TIME    COMPLETION-TIME
backup-default-pg-cluster   full   Completed                 43s        xxxx-xx        xxxx-xx
```

### 恢复

恢复只需要在相同的部署文件下添加 `kubeblocks.io/restore-from-backup` 字段指定所用备份源

然后正常创建该实例即可实现恢复功能

```yaml
# cluster.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  annotations:
    kubeblocks.io/restore-from-backup: '{"postgresql":"backup-default-pg-cluster"}'
...
```
