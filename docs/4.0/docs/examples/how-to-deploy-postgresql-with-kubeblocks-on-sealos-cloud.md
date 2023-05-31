# How to deploy PostgreSQL with Kubeblocks on Sealos Cloud

## Create a PostgreSQL instance.

Click on the terminal icon and directly write the YAML file.

Here are the parts that can be modified:
1. Resources field: The CPU and Memory resources used can be modified as per requirement.
2. Replicas field: The number of replicas can be modified as required.
3. ClusterVersionRef field: Specify the cluster version in this field.

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

## Connect to a PostgreSQL instance

### Connect locally.

To obtain the address and perform access, follow these steps:
1. Run the command `kubectl get service` to get the address.
2. Username, password, and other information are stored in the secret kind, for example: `kubectl get secrets pg-cluster-conn-credential -o yaml` find the username and password fields.

    ```bash
    data:
        ...
        password: MTIzCg==
        ...
    ```

3. Decode to obtain password

    ```bash
    $ echo MTIzCg== | base64 -d
    > 123
    ```

4. Connect to the specified database using the command: `psql -h <hostname> -p <port> -U <username> <database>`.

## Modify the state of a PostgreSQL instance.

You can modify the state of a PostgreSQL instance by using the `kubectl apply -f <yaml>command`.

### Vertical Scaling

To vertically scale a PostgreSQL instance, modify the requests and limits fields in the YAML file corresponding to CPU and memory resources.

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

### Volume Expansion

To scale the disk of a PostgreSQL instance, modify the storage field in the YAML file to expand the volume.

Note that the destination storage size cannot be smaller than the current storage size.

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

### Stop / Start

To stop or start a PostgreSQL instance, modify the type field in the YAML file to either stop or start respectively.

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

### Restart

To restart a PostgreSQL instance, use the following YAML file.

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

## Backup and restore PostgreSQL

### Prepare work

Create a PVC for backup.

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

### Backup

use the command `kubectl apply -f <yaml>` to start the backup process.

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

backup successful

```bash
NAME                        TYPE   STATUS       TOTAL-SIZE   DURATION   CREATE-TIME    COMPLETION-TIME
backup-default-pg-cluster   full   Completed                 43s        xxxx-xx        xxxx-xx
```

### Restore from backup

You only need to add the `kubeblocks.io/restore-from-backup` field in the same deployment file and specify the backup source name.

Then create the instance normally to complete the restore process.

```yaml
# cluster.yaml
apiVersion: apps.kubeblocks.io/v1alpha1
kind: Cluster
metadata:
  annotations:
    kubeblocks.io/restore-from-backup: '{"postgresql":"backup-default-pg-cluster"}'
...
```
