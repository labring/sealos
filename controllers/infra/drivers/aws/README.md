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
  hosts:
    - roles: [ master ]
      count: 1
      flavor: t2.medium
      image: "ami-0d66b970b9f16f1f5"
      disks:
        - capacity: 23
          volumeType: standard
          type: "root"
        - capacity: 21
          volumeType: gp3
          type: "data"
    - roles: [ node ]
      count: 1
      flavor: t2.medium
      image: "ami-0d66b970b9f16f1f5"
      disks:
        - capacity: 11
          volumeType: gp3
          type: "root"
        - capacity: 13
          volumeType: gp3
          type: "data"
```

kubectl apply -f infra.yaml