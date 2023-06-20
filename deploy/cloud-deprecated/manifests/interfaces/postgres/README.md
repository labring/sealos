# How to deploy the `Postgres` service(s)

## Pre-Requirements
1. A running sealos cloud kubernetes cluster
2. openebs

### Install [CrunchyData/postgres-operator](https://github.com/labring/cluster-image/tree/main/applications/crunchy-postgres-operator)

```shell
sealos run labring/crunchy-postgres-operator:v5.2.0
```

ref: 
> https://access.crunchydata.com/documentation/postgres-operator/v5/tutorial/create-cluster/

### Install [pgadmin](https://www.pgadmin.org)

Use sealos cloud specific pgadmin.yaml
```shell
kubectl apply -f pgadmin.yaml
```

ref:
> https://www.enterprisedb.com/blog/how-deploy-pgadmin-kubernetes
> https://gist.github.com/ganesh-karthick/0e35593ef6c25378dd176aab6129e372

### Apply cloud UI usage
```shell
kubectl apply -f ingress-pgadmin.yaml
```