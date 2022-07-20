## Config AK SK and region

Example config:

```shell script
export AWS_ACCESS_KEY_ID=AKI**************TMN
export AWS_SECRET_ACCESS_KEY=3gQH*******************************AaS9+
export AWS_DEFAULT_REGION=cn-north-1
```

> FAQ

An error occurred (AuthFailure) when calling the CreateSecurityGroup operation: AWS was not able to validate the provided access credentials

this caused by you don't have access to the region, I change the default region to cn-north-1 it works.

## Using kubectl to apply infra

```yaml
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: aws-infra-demo
spec:
    regionIds: [cn-north-1]
    ssh:
       passwd: xxx
       pk: /root/.ssh/id_rsa
       port: 22
       user: root
   hosts:
   - roles: [master, aaa, bbb] # required
     count: 3 # Required
     # key values resources.
     resources:
        cpu: 2
        memory: 4
        # other resources like GPU
     # ENUM: amd64/arm64 (NOTE: the default value is amd64)
     flavor: ecs.t5-lc1m2.large
     arch: amd64
     # ENUM: ubuntu:20.04, centos:7.2 and so on.
     image: utuntu:20.04
     disks:
     - capacity: 50
       # ENUM: system/data
       type: system
```

kubectl apply -f infra.yaml