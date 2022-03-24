/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package image

import (
	"github.com/containers/image/v5/manifest"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

// defaultImageService is the default service, which is used for image pull/push
type defaultImageService struct {
	ForceDeleteImage bool
}

// BuilderInfo are used as objects to display container information
type BuilderInfo struct {
	Type                  string
	FromImage             string
	FromImageID           string
	FromImageDigest       string
	Config                string
	Manifest              string
	Container             string
	ContainerID           string
	MountPoint            string
	ProcessLabel          string
	MountLabel            string
	ImageAnnotations      map[string]string
	ImageCreatedBy        string
	OCIv1                 v1.Image
	DefaultMountsFilePath string
	Isolation             string
	Capabilities          []string
	ConfigureNetwork      string
	CNIPluginPath         string
	CNIConfigDir          string
	History               []v1.History
}

func (d *defaultImageService) Pull(imageName string) error {
	panic("implement me")
}

func (d *defaultImageService) PullIfNotExist(imageName string) error {
	return nil
}

func (d *defaultImageService) Push(imageName string) error {
	panic("implement me")
}

func (d *defaultImageService) RemoveImage(imageName string) error {
	panic("implement me")
}

func (d *defaultImageService) RemoveCluster(imageName string) error {
	panic("implement me")
}

func (d *defaultImageService) Login(RegistryURL, RegistryUsername, RegistryPasswd string) error {
	panic("implement me")
}

func (d *defaultImageService) Logout(RegistryURL string) error {
	panic("implement me")
}

func (d *defaultImageService) Images() ([]v1.Image, error) {
	panic("implement me")
}
func (d *defaultImageService) InspectManifest(remoteImageName string) (*manifest.Schema2List, error) {
	panic("implement me")
}
func (d *defaultImageService) Inspect(imageOrClusterName string) (*BuilderInfo, error) {
	info := &BuilderInfo{
		Type:             "",
		FromImage:        "",
		FromImageID:      "",
		FromImageDigest:  "",
		Config:           "",
		Manifest:         "",
		Container:        "",
		ContainerID:      "",
		MountPoint:       "",
		ProcessLabel:     "",
		MountLabel:       "",
		ImageAnnotations: nil,
		ImageCreatedBy:   "",
		OCIv1: v1.Image{
			Architecture: "amd64",
			OS:           "linux",
			Config: v1.ImageConfig{
				User:         "",
				ExposedPorts: nil,
				Env:          nil,
				Entrypoint:   nil,
				Cmd: []string{
					"kubectl apply -f cni/tigera-operator.yaml",
					"kubectl apply -f cni/custom-resources.yaml",
				},
				Volumes:    nil,
				WorkingDir: "",
				Labels: map[string]string{
					"init":           "init.sh $criData $registryDomain $registryPort $registryUsername $registryPassword",
					"clean":          "clean.sh $criData",
					"init-registry":  "init-registry.sh $registryPort $registryData $registryConfig",
					"clean-registry": "clean-registry.sh $registryData $registryConfig",
					"auth":           "auth.sh",
				},
				StopSignal: "",
			},
		},
		DefaultMountsFilePath: "",
		Isolation:             "",
		Capabilities:          nil,
		ConfigureNetwork:      "",
		CNIPluginPath:         "",
		CNIConfigDir:          "",
		History:               nil,
	}

	return info, nil
}

func (d *defaultImageService) DeleteImage(imageName string) error {
	panic("implement me")
}

func (d *defaultImageService) Tag(imageName, newImageName string) error {
	panic("implement me")
}

func (d *defaultImageService) CreateCluster(imageName, clusterName string) error {
	return nil
}

func (d *defaultImageService) Mount(clusterName string) error {
	return nil
}

func (d *defaultImageService) UnMount(clusterName string) error {
	return nil
}

func (d *defaultImageService) Prune() error {
	panic("implement me")
}

func (d *defaultImageService) Build(filePath, imageName string) error {
	panic("implement me")
}

func NewImageService() (Service, error) {
	return &defaultImageService{}, nil
}
