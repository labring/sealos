---
sidebar_position: 2
---

# Use sealos registry to store and distribute your cluster image

sealos registry is a docker v2 registry that is used to store and distribute cluster images.

The registry domain is `hub.sealos.cn`.

## Login to sealos cloud and download your kubernetes config.yml

You can register a free account in [sealos cloud](https://cloud.sealos.io/) first. 

Then, download and save config.yaml, it will be used to log to the registry.

## Login sealos registry

```shell
$ sealos login -k config.yml hub.sealos.cn
```

## Use image in sealos registry to accelerate the download

Replace the image domain with `hub.sealos.cn` when using sealos cli.

Here is an example:
```shell
$ sealos run hub.sealos.cn/labring/kubernetes:v1.24.0 hub.sealos.cn/labring/calico:v3.22.1
```

## Push your cluster image to sealos registry

First, you should create an organization in sealos cloud imagehub application.

You can edit and apply this yaml file at sealos cloud terminal application:

```yaml
apiVersion: imagehub.sealos.io/v1
kind: Organization
metadata:
  name: your-organization-name
spec:
  name: your-organization-name # same as metadata.name
  creator: your-uuid # find at sealos cloud page
  manager: [ your-uuid ] # you can add other user as manager
```

**Please note that only managers in your organization can push image to sealos registry with this organization name**

After that, you can tag your image with the domain `hub.sealos.cn` and your organization name, then push it!

```shell
$ sealos login -k config.yml hub.sealos.cn
$ sealos tag your-image-id hub.sealos.cn/your-organization-name/your-image-name:tag
$ sealos push hub.sealos.cn/your-organization-name/your-image-name:tag
```