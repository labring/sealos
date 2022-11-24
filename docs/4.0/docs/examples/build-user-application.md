
# Build-User-Application
This document uses Redis and Postgres databases as examples to teach us how to quickly run distributed applications on sealos

## Prerequisites
* Login in https://cloud.sealos.io/
* make sure you have enough resource quota before create application.Use
```kubectl get quota```

## Postgres cluster build

Open Terminal on your sealos desktop.
The Postgres Cluster can be installed simply by applying yaml manifests.

```vim my-pgcluster.yaml```
```
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: acid-minimal-cluster
spec:
  teamId: "acid"
  volume:
    size: 300Mi
  numberOfInstances: 2
  users:
    zalando:  # database owner
    - superuser
    - createdb
    foo_user: []  # role for application foo
  databases:
    foo: zalando  # dbname: owner
  preparedDatabases:
    bar: {}
  postgresql:
    version: "14"
```

After the yaml was created.
```kubectl apply -f my-pgcluster.yaml```
Your PostgresSql cluster is set up in your own namespace.

## Connect to Postgres Using Psql
In terminal 
```
apt update
apt install postgresql postgresql-client
```

```
export NS=$(cat .kube/config | grep 'namespace' | awk '{print $2}' )
export PGPASSWORD=$(kubectl get secret postgres.acid-minimal-cluster.credentials.postgresql.acid.zalan.do -o 'jsonpath={.data.password}' | base64 -d)
export PGSSLMODE=require
psql -U postgres -h acid-minimal-cluster.${NS}.svc.cluster.local -p 5432
```

## Redis cluster build

The Redis Cluster can be installed simply by applying yaml manifests.
```vim my-rediscluster.yaml```
```
apiVersion: databases.spotahome.com/v1
kind: RedisFailover
metadata:
  name: redisfailover
spec:
  sentinel:
    replicas: 3
    resources:
      requests:
        cpu: 100m
        memory: 100Mi
      limits:
        cpu: 400m
        memory: 500Mi
  redis:
    replicas: 3
    resources:
      requests:
        cpu: 100m
        memory: 100Mi
      limits:
        cpu: 400m
        memory: 500Mi
    storage:
      persistentVolumeClaim:
        metadata:
          name: redisfailover-persistent-data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 300Mi


```
After the yaml was created. ```kubectl apply -f my-rediscluster.yaml``` Your Redis cluster is set up in your own namespace.


## Connect to redis using redis-server 
```
apt update
apt-get install redis-server
```
```
export NS=$(cat .kube/config | grep 'namespace' | awk '{print $2}' )
redis-cli -h rfs-redisfailover.${NS}.svc.cluster.local -p 26379
```

## Connect to redis using Go

We can simply write a redis program and deploy it on kubernetes.
You can customize Redis related operations, here is just a simple implementation of a ping pong.


```Go
package main

import (
	"fmt"
	"github.com/go-redis/redis"
	"time"
)

const (
	service_name string = "rfs-redisfailover"
	service_port string = "26379"
)

func main() {
	ExampleNewRedisClient()
}

// ping pong test
func ExampleNewRedisClient() {

	for {
		client := redis.NewClient(&redis.Options{
			Addr:     service_name + ":" + service_port,
			Password: "", // no password set
			DB:       0,  // use default DB
		})
		fmt.Println("try to get pong from: " + service_name + ":" + service_port)
		pong, err := client.Ping().Result()
		fmt.Println(pong, err)
		time.Sleep(time.Second)
	}
}

```

Compile the code into an image using docker and upload it to dockerhub.The detail operation refer to:https://docs.docker.com/get-started/

For test ,we use pre-build image.

In Terminal on https://cloud.sealos.io/

```vim redis-client.yaml```

```
apiVersion: v1
kind: Pod
metadata:
  name: redis-test 
spec:
  containers:
  - name: redis-test-containers
    image: cdjianghan/userapptest:latest
    resources:
      limits:
        memory: 100Mi
        cpu: 300m
      requests:
        memory: 100Mi
        cpu: 100m
```
And 
```kubectl apply -f redis-client.yaml```

After the pod is running,```kubectl logs redis-test```


```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
  name: rfs-redisfailover
  labels:
    k8s-app: rfs-redisfailover
spec:
  rules:
    - host: redis-ingress.cloud.sealos.io
      http:
        paths:
          - pathType: Prefix
            path: /
            backend:
              service:
                name: rfs-redisfailover
                port:
                  number: 26379
  tls:
    - hosts:
        - rfs-redisfailover.cloud.sealos.io
      secretName: wildcard-cloud-sealos-io-cert
```