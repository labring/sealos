# Buildah 模块

Buildah模块的代码在 sealos/pkg/buildah。
sealos底层运行集群镜像的核心主要使用[buildah](https://github.com/containers/buildah)逻辑代码。
因此，sealos提供了buildah的接口提供开发者使用。
```go
type Interface interface {
    Pull(imageNames []string, opts ...FlagSetter) error
    Load(input string, ociType string) (string, error)
    InspectImage(name string, opts ...string) (*InspectOutput, error)
    Create(name string, image string, opts ...FlagSetter) (buildah.BuilderInfo, error)
    Delete(name string) error
    InspectContainer(name string) (buildah.BuilderInfo, error)
    ListContainers() ([]JSONContainer, error)
}
```

## Pull
//TODO
## Load
//TODO
## InspectImage
- 查看本地镜像
```go
InspectImage("containers-storage://apache/apisix:3.1.0-debian")
InspectImage("apache/apisix:3.1.0-debian")
InspectImage("imageID")
```
- 查看远程镜像
```go
InspectImage("docker://apache/apisix:3.1.0-debian")
InspectImage("apache/apisix:3.1.0-debian", "docker")
```
- 查看tar包镜像
```go
InspectImage("path/of/oci/tarfile.tar", "oci-archive")
InspectImage("path/of/docker/tarfile.tar", "docker-archive")
```
## Create
//TODO
## Delete
//TODO
## InspectContainer
//TODO
## ListContainers
//TODO

