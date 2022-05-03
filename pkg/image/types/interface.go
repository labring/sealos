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

type RegistryService interface {
	Login(domain, username, passwd string) error
	Logout(domain string) error
	Pull(images ...string) error
	Push(image string) error
}

type Service interface {
	Tag(src, dst string) error
	Save(imageName, archiveName string) error
	Load(archiveName string) error
	Remove(force bool, images ...string) error
	Inspect(images ...string) (ImageListOCIV1, error) //oci image
	Build(options *BuildOptions, contextDir, imageName string) error
	Prune() error
	ListImages() error
}

type ClusterService interface {
	// Create 1. buildah from <image> 2. buildah mount <container(cluster)> 3. return container(cluster) manifest
	// for CloudImage we can take container as cluster instance. type ClusterManifest storage.Container
	Create(name string, image string) (*ClusterManifest, error)
	// Delete umount rootfs and delete it
	Delete(name string) error
	// Inspect return cluster(container) manifest
	Inspect(name string) (*ClusterManifest, error)
	List() ([]ClusterInfo, error)
}
