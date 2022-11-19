# How to deploy the `Redis` service(s)

## Pre-Requirements
1. A running sealos cloud kubernetes cluster
2. openebs

### Install [redis-operator](https://github.com/labring/cluster-image/tree/main/applications/redis-operator)

```shell
sealos run labring/redis-operator:3.1.4
```

### Install [RedisInsight](https://docs.redis.com/latest/ri/installing/install-k8s/)

Use sealos cloud specific redisinsight.yaml
```shell
kubectl apply -f redisinsight.yaml
```

### Install Apply cloud UI usage
```shell
kubectl apply -f ingress-redisinsight.yaml
```