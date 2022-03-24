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
	"github.com/fanux/sealos/pkg/image"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

type buildahImage struct {
	imageService image.Service
}

func (f *buildahImage) MountImage(cluster *v2.Cluster) error {
	return f.mountImage(cluster)
}

func (f *buildahImage) UnMountImage(cluster *v2.Cluster) error {
	return f.unmountImage(cluster)
}

func (f *buildahImage) getClusterName(cluster *v2.Cluster) string {
	return cluster.Name
}

func (f *buildahImage) getImageName(cluster *v2.Cluster) string {
	return cluster.Spec.Image
}
func (f *buildahImage) mountImage(cluster *v2.Cluster) error {
	if err := f.imageService.PullIfNotExist(f.getImageName(cluster)); err != nil {
		return err
	}
	if err := f.imageService.CreateCluster(f.getImageName(cluster), f.getClusterName(cluster)); err != nil {
		return err
	}
	return nil
}

func (f *buildahImage) unmountImage(cluster *v2.Cluster) error {
	if err := f.imageService.RemoveCluster(f.getClusterName(cluster)); err != nil {
		return err
	}
	return nil
}

func NewBuildahImage(service image.Service) (Interface, error) {
	return &buildahImage{imageService: service}, nil
}
