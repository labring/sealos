/*
Copyright 2023 cuisongliu@qq.com.

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

package apply

import (
	"fmt"

	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func NewClusterFromGenArgs(imageNames []string, args *RunArgs) ([]byte, error) {
	cluster := initCluster(args.ClusterName)
	c := &ClusterArgs{
		clusterName: args.ClusterName,
		cluster:     cluster,
	}
	if err := c.runArgs(imageNames, args); err != nil {
		return nil, err
	}

	img, err := genImageInfo(imageNames[0])
	if err != nil {
		return nil, err
	}
	if img.Type != v1beta1.RootfsImage {
		return nil, fmt.Errorf("input first image %s is not kubernetes image", imageNames)
	}
	cluster.Status.Mounts = append(cluster.Status.Mounts, *img)
	rtInterface, err := runtime.NewDefaultRuntime(cluster, &runtime.KubeadmConfig{})
	if err != nil {
		return nil, err
	}
	return rtInterface.GetAdminKubeconfig()
}

func genImageInfo(imageName string) (*v1beta1.MountImage, error) {
	bder, err := buildah.New("")
	if err != nil {
		return nil, err
	}
	mount := &v1beta1.MountImage{
		Name:       "default",
		ImageName:  imageName,
		MountPoint: "",
	}
	if err = processor.OCIToImageMount(mount, bder); err != nil {
		return nil, err
	}
	return mount, nil
}
