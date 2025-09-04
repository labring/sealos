# openebs for sealos

OpenEBS is an open-source container-attached storage solution designed for Kubernetes environments. It provides persistent storage for stateful applications running in containers, allowing them to maintain data integrity and availability even when the underlying infrastructure changes.

## Changes

- Base on helm chart from [openebs](https://openebs.github.io/openebs)
- set lvm-localpv=enabled for cache images
- delete sub chart mayastor

## Usage

```bash
 sealos run --env OPENEBS_STORAGE_PREFIX="/data/openebs" ghcr.io/labring/sealos/openebs:v3.10.0
```