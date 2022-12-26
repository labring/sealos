# service-hub

Hub service is the auth service for sealos registry.

## Description

Hub service is the auth service for sealos registry.

Sealos registry `hub.sealos.cn` auth server is at `https://hubauth.login.sealos.io/auth`.

Sealos use user's kubeconfig yaml as password to auth

## Step-by-step installation and run

1. A Running `sealos kubernetes` cluster with admin access.
    ```shell
    sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --masters xxx --nodes xxx -p/-pk
    ```
2. Cluster must have `helm` and `openebs` installed as base requirement.
    ```shell
    sealos run labring/helm:v3.8.2 
    sealos run labring/openebs:v1.9.0
    ```
3. Apply hub auth service yaml, *must change crts and keys.*
    ```shell
    kubectl apply -f deploy/manifests/depoly.yaml
    ```
