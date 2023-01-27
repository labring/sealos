# Buildah module

The buildah module code is located in pkg/buildah. 
The core of sealos underlying operation cluster mirroring mainly uses [buildah](https://github.com/containers/buildah) logic code.
Therefore, sealos provides the use interface of buildah.

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
- inspect image in local store
```go
InspectImage("containers-storage://apache/apisix:3.1.0-debian")
InspectImage("apache/apisix:3.1.0-debian")
InspectImage("imageID")
```
- inspect remote image
```go
InspectImage("docker://apache/apisix:3.1.0-debian")
InspectImage("apache/apisix:3.1.0-debian", "docker")
```
- inspect image for archive
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

