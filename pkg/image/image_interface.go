package image

import (
	"github.com/containers/image/v5/manifest"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

// Service is image service
type Service interface {
	Pull(imageName string) error
	PullIfNotExist(imageName string) error
	Push(imageName string) error
	RemoveImage(imageName string) error
	RemoveCluster(clusterName string) error
	Login(RegistryURL, RegistryUsername, RegistryPasswd string) error
	Logout(RegistryURL string) error
	Images() ([]v1.Image, error)
	Inspect(imageName string) (*BuilderInfo, error)
	InspectManifest(remoteImageName string) (*manifest.Schema2List, error)
	DeleteImage(imageName string) error
	Tag(imageName, newImageName string) error
	CreateCluster(imageName, clusterName string) error
	Mount(clusterName string) error
	UnMount(clusterName string) error
	Build(filePath, imageName string) error
	Prune() error
}
