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

package applydrivers

import (
	"fmt"

	"github.com/fanux/sealos/pkg/client-go/kubernetes"
	"github.com/fanux/sealos/pkg/clusterfile"
	"github.com/fanux/sealos/pkg/filesystem"
	"github.com/fanux/sealos/pkg/filesystem/rootfs"
	"github.com/fanux/sealos/pkg/image"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"k8s.io/apimachinery/pkg/version"
)

func NewDefaultApplier(cluster *v2.Cluster) (Interface, error) {
	if cluster.Name == "" {
		return nil, fmt.Errorf("cluster name cannot be empty")
	}
	imgSvc, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	clusterSvc, err := image.NewDefaultClusterService()
	if err != nil {
		return nil, err
	}
	registrySvc, err := image.NewDefaultRegistryService()
	if err != nil {
		return nil, err
	}

	mounter, err := filesystem.NewRootfsMounter(clusterSvc)
	if err != nil {
		return nil, err
	}

	cFile := clusterfile.NewClusterFile(contants.Clusterfile(cluster.Name))

	return &Applier{
		ClusterDesired:  cluster,
		ImageManager:    imgSvc,
		ClusterFile:     cFile,
		RegistryManager: registrySvc,
		ClusterManager:  clusterSvc,
		RootfsFSystem:   mounter,
	}, nil
}

type Applier struct {
	ClusterDesired     *v2.Cluster
	ClusterCurrent     *v2.Cluster
	ClusterFile        clusterfile.Interface
	ImageManager       image.Service
	RegistryManager    image.RegistryService
	ClusterManager     image.ClusterService
	RootfsFSystem      rootfs.Interface
	Client             kubernetes.Client
	CurrentClusterInfo *version.Info
}

func (*Applier) Apply() error  { return nil }
func (*Applier) Delete() error { return nil }
