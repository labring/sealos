// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package types

import (
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type RegistryService interface {
	Login(domain, username, passwd string) error
	Logout(domain, username string) error
	Pull(image string) error
	Push(image string) error
	Sync(localDir, imageName string) error
}

type Service interface {
	Rename(src, dst string) error
	Remove(images ...string) error
	Inspect(image string) (*v1.Image, error) //oci image
	Build(options BuildOptions, contextDir, imageName string) error
	Prune() error
	ListImages(opt ListOptions) ([]v1.Image, error)
}

type ClusterService interface {
	// Create 1. buildah from <image> 2. buildah mount <container(cluster)> 3. return container(cluster) manifest
	// for CloudImage we can take container as cluster instance. type ClusterManifest storage.Container
	Create(name, image string) (*ClusterManifest, error)
	// Delete umount rootfs and delete it
	Delete(name string) error
	// Inspect return cluster(container) manifest
	Inspect(name string) (*ClusterManifest, error)
	List() ([]ClusterInfo, error)
}
