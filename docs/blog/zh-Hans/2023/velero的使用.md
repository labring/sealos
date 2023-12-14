---
slug: Use velero to perform cluster backup on k8s
title: Use velero to perform cluster backup on k8s
authors: [xiao-jay]
tags: [kubernetes,sealos]
---

## velero的使用

文档：https://velero.io/

### 注意使用1.24的k8s

1.25的k8s暂时会有coredns的pod起不来的问题，导致不能备份

```
kubectl get pod -A
kube-system        coredns-565d847f94-5b2wt                   0/1     CrashLoopBackOff   2271 (4m1s ago)   8d
kube-system        coredns-565d847f94-jtw9f                   0/1     CrashLoopBackOff   2271 (88s ago)    8d
```



### 以aws作为存储举例

### 1、安装aws cli

```
apt install awscli
aws configure  #登陆aws
```



创建bucket

```
BUCKET=<YOUR_BUCKET>
REGION=<YOUR_REGION>
aws s3api create-bucket \
    --bucket $BUCKET \
    --region $REGION \
    --create-bucket-configuration LocationConstraint=$REGION
```



### 2、安装velero

```
wget https://github.com/vmware-tanzu/velero/releases/download/v1.9.2/velero-v1.9.2-linux-amd64.tar.gz
tar -xvf velero-v1.9.2-linux-amd64.tar.gz
mv velero-v1.9.2-linux-amd64/velero /usr/local/bin/
```



### 3、把aws作为备份存储

创建一个credentials-velero文件

```
[default]
aws_access_key_id=<AWS_ACCESS_KEY_ID>
aws_secret_access_key=<AWS_SECRET_ACCESS_KEY>
```



```
export BUCKET=xxxx
export REGION=xxxx
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.5.0 \
    --bucket $BUCKET \
    --backup-location-config region=$REGION \
    --snapshot-location-config region=$REGION \
    --secret-file ./credentials-velero
```

查看是否安装成功，availabe就是成功了

```
root@yyj-master1:/home/ubuntu# kubectl get pod -n velero
NAME                      READY   STATUS    RESTARTS   AGE
velero-7dd66cfb94-pbf47   1/1     Running   0          12m
root@yyj-k8s124-test-master1:/home/ubuntu# velero backup-location get
NAME      PROVIDER   BUCKET/PREFIX   PHASE       LAST VALIDATED                  ACCESS MODE   DEFAULT
default   aws        sealos-test     Available   2022-11-10 02:43:28 +0000 UTC   ReadWrite     true
```



### 4、Quick Start

```
git clone https://github.com/vmware-tanzu/velero.git
cd velero
```

#### Basic example (without PersistentVolumes)

1. Start the sample nginx app:

   ```bash
   kubectl apply -f examples/nginx-app/base.yaml
   ```

2. Create a backup:

   ```bash
   velero backup create nginx-backup --include-namespaces nginx-example
   ```

   然后bucket里面就出现backup

   ![](https://tva1.sinaimg.cn/large/008vxvgGly1h7zu5ykpwxj30pv0ds0ts.jpg)

3. Simulate a disaster:

   ```bash
   kubectl delete namespaces nginx-example
   ```

   Wait for the namespace to be deleted.

4. Restore your lost resources:

   ```bash
   velero restore create --from-backup nginx-backup
   ```



### 5、集群备份

每一个小时全部内容备份一次

```fallback
velero schedule create full-cluster-backup --schedule="0 * * * *"
```







