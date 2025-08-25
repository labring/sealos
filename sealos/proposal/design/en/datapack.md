# Datapack Design

Datapack is designed to package data from different CRD with different information granularity.

## Why use it

It's not convenient to get cr directly: repository has multi images and imagehub should display the latest tag info of
the repository. If getting cr directly, you should get every repository by using `get repository` and using `get image`
to get its latest tag info.

But if you use datapack, you can easily get multi repositories and their latest tag info in one time and reuse the
result by some strategy.

## How it works

Once a datapack CR is created, datapack controller will base the CR's spec to get information from images and pack it up
base on different information granularity which is defined at CR's spec type.

And after the CR reconcile process, these information will be placed at the CR's status datas so that you can get the CR
you applied to get information you need.

## How to use it

There is two steps you need to do.

- apply your datapack cr

spec contains `expireTime` as datapack cr living time, `names` as image names that this datapack needs to pack,
and `type` as datapack information granularity.

There are three types: `base`, `grid`, `detail` for different information granularity.

```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapackuid
spec:
  expireTime: 120m
  names:
    - labring/cert-manager:v1.8.0
  type: detail
```

- get it until it's ready

In datapack CR, status codes is represented as the statement of the datapack.

This is the codes list for each statement.

```
	NOTRUN  Codes = 0
	OK      Codes = 1
	PENDING Codes = 2
	ERROR   Codes = 3
```

**Notice that if code is `PENDING`, you should get the datapack cr again until it turns to `OK`**

Here is a datapack cr example and its spec type is `detail` and status codes is `OK`

```yaml
apiVersion: imagehub.sealos.io/v1
kind: DataPack
metadata:
  name: datapackuid
spec:
  expireTime: 120m
  names:
    - labring/cert-manager:v1.8.0
  type: detail
status:
  codes: 1
  datas:
    labring/cert-manager:v1.8.0:
      ID: Unknown
      arch: Unknown
      description: Cloud native certificate management. X.509 certificate management
        for Kubernetes and OpenShift
      docs: |
      icon: https://cert-manager.io/images/cert-manager-logo-icon.svg
      keywords:
        - Storage
      name: labring/cert-manager:v1.8.0
      tags:
        - creatTime: "2022-12-27T07:37:34Z"
          metaName: labring.cert.manager.v1.7.0
          name: v1.7.0
        - creatTime: "2022-12-27T07:33:08Z"
          metaName: labring.cert.manager.v1.8.0
          name: v1.8.0
```

**Notice that datapack cr will be expired and will be deleted after its expiration.**

And it's recommended to hash the datapack cr's spec as datapack meta name if you need this datapack more than once. In
sealos imagehub application, we do so, so that multiple users can get the result that generated before which means
speeding up the progress of getting repositories grid view.