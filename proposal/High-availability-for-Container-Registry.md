# High availability for Container Registry

## Summary

Currently the only single point in the cluster is the builtin container registry. Once if the first master node or even only the registry fails with unexpected error, the rest of the nodes in the cluster will fail to pull images. The proposal is to make sure high availability for registry by initializing multiple registries in the cluster, and also distribute offline artifacts to all nodes that with registry role.

## Design Details

1. Added a role named `registry`, and currently only supports apparently specifying a set of host in the `Clusterfile`, the first master node will be selected as the local registry by default if none of the nodes are selected.

a) If no roles are specified, `sealos` will behave as before, aka, this PR does not change all the default behavior of sealos
b) If we choose some nodes to run as registry, `bootstrap` process will run registry in those hosts before cluster initialization, `run` process will also distribute `registry` dir to those hosts.

2. Refactored the `filesystem` module and move the system initialization operation to `bootstrap` module, now the `filesystem` module can focus on mounting and unmounting the application image.

The `bootstrap` interface is designed as follows

```go
type Interface interface {
    // Preflight run preflight checks or something need to be performed before init
    Preflight(hosts ...string) error
    // Init do actual system initialization, cri
    Init(hosts ...string) error
    // Register deps to run util ApplyDeps is called
    RegisterDeps(deps ...Dependency)
    // ApplyExternalDeps run task to apply external dependencies
    ApplyDeps(hosts ...string) error
    // Reset undo bootstrap process
    Reset(hosts ...string) error
}
```

The `Dependency` interface is a interface that can be registered as external dep, the builtin implementation is `registryApplier` which install/uninstall container registry.

```go
type Dependency interface {
    Name() string
    Filter(Context, string) bool
    Apply(Context, string) error
    Undo(Context, string) error
}
```

The `Context` interface can be used as arg for function `Dependency.Filter`/`Dependency.Apply`/`Dependency.Undo`.

```go
type Context interface {
    GetBash() constants.Bash
    GetCluster() *v2.Cluster
    GetData() constants.Data
    GetExecer() ssh.Interface
    GetShellWrapper() shellWrapper
}
```

## Features not yet implemented

- registry role flag in `sealos run`/`sealos add`/`sealos remove` command
- high availability, how to ensure HA? use `lvscare` like the way`kube-apiserver` does, OR create a externalName type service?

## Implementation History

- 2022-11-17 First [Proposal and PR](https://github.com/labring/sealos/pull/2096)
