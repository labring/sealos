# hub.sealos.io

组件：
1. imagehub crd
2. sealos cli
3. docker registry v2
4. docker auth server
5. auth plugin

## docker registry

Requirements.

1. [hub.sealos.io](http://hub.sealos.io) store the user's image
2. synchronize imagehub permissions
3. sealos login [hub.sealos.io](http://hub.sealos.io) by token/kubeconfig.yaml
4. sealos push Sync to image hub

## docker registry auth

Requirements: provide fine-grained auth, support org sharing, need to sync with image hub

Design/steps.

- sealos login parse the token, get the user and use the token as password to log in to the registry.
- registry will return the docker auth server information
- The buildah login will control the request to docker auth itself.
- docker auth then call plugin to authenticate
- plugin gets the token/kubeconfig and connects to the k8s apiserver to get the imagehub privilege information
- plugin returns authentication

```mermaid
sequenceDiagram
    participant sealos cli
    participant imagehub CRD
    participant hub.sealos.io registry
    participant docker auth server
    participant auth plugin
    sealos cli->>hub.sealos.io registry: 0.sealos login to registry, using token/kubeconfig as password
    sealos cli->>imagehub CRD: 1.sealos apply image.yaml
    hub.sealos.io registry-->>sealos cli: 2.return auth server info
    sealos cli->>docker auth server: 3.requset for auth
    docker auth server->>auth plugin: 4.pass token/kubeconfig 
    auth plugin-->>docker auth server:4.return auth result
    auth plugin-->>imagehub CRD: 5.get rbac/auth-info by token/kubeconfig
```

Advantages.

- Fully native support for docker login, buildah login, no need to re-process the interaction with the registry api during sealos login
- Can reuse docker auth code, only need to streamline docker auth to service auth
- plugin to achieve authentication, the custom authentication part of the stripped docker auth, the degree of freedom max

Disadvantages.

- cloud token as a password in the token failure need to re-sealos login
- token is too long, maybe passing kubeconfig by file is the optimal solution, but there is also the problem of long passwords, which consumes on io?


