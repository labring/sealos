---
sidebar_position: 6
---

# sealos registry design

sealos registry is a docker v2 registry which is used to store and distribute cluster image.

The registry domain is `hub.sealos.cn`.

## registry server

Registry use the open source [docker v2 registry](https://github.com/distribution/distribution).

Deployment documentation can be found at [here](https://github.com/labring/sealos/blob/main/deploy/registry/README.md).

## registry auth server

### Based on sealos imagehub CRD, provide fine-grained auth.

We use user's kubeconfig yaml file as password. When user use `sealos login` to `hub.sealos.cn`, auth server will use it
to authenticate.

Here is the complete mermaid diagram.

```mermaid
sequenceDiagram
    participant sealos cli
    participant imagehub CRD
    participant sealos registry
    participant docker auth server
    participant auth func
    sealos cli->>sealos registry: 0.sealos login to registry, using kubeconfig as password
    sealos cli->>imagehub CRD: 1.sealos cli cmd, push/pull image
    sealos registry-->>sealos cli: 2.return auth server info
    sealos cli->>docker auth server: 3.request for auth
    docker auth server->>auth func: 4.pass kubeconfig 
    auth func-->>docker auth server:4.return auth result
    auth func-->>imagehub CRD: 5.get rbac/auth-info from imagehub CRD by kubeconfig
```

### Using kubeconfig as password has the following advantages:

1. Fully native support for docker login, buildah login, no need to re-process the interaction with the registry api
   during sealos login
2. Auth server will use user kubeconfig to connect sealos cloud not by kubernetes-admin

*But there are some disadvantages:*

1. maybe kubeconfig is too long as password, which consumes on io