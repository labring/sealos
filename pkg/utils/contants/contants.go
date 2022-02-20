// Copyright © 2021 sealos.
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

package contants

import (
	"path/filepath"

	"github.com/mitchellh/go-homedir"
)

const (
	DefaultLogDir               = "/var/lib/sealos/log"
	DefaultClusterFileName      = "Clusterfile"
	DefaultClusterRootfsDir     = "/var/lib/sealos/data"
	DefaultClusterInitBashFile  = "/var/lib/sealos/data/%s/kube/scripts/init.sh"
	DefaultClusterClearBashFile = "/var/lib/sealos/data/%s/kube/scripts/clean.sh"
	TarGzSuffix                 = ".tar.gz"
	YamlSuffix                  = ".yaml"
	KubeAdminConf               = "/etc/kubernetes/admin.conf"
	ClusterWorkDir              = "/root/.sealos/%s"
	RenderChartsDir             = "charts"
	RenderManifestsDir          = "manifests"
	DefaultWorkDir              = "/tmp/%s/workdir"
)

// image module
const (
	DefaultImageRootDir = "/var/lib/sealos/data"
)

//CRD kind
const (
	Config  = "Config"
	Cluster = "Cluster"
)

func GetClusterWorkDir(clusterName string) string {
	return filepath.Join(GetHomeDir(), ".sealos", clusterName)
}

func GetClusterWorkClusterfile(clusterName string) string {
	return filepath.Join(GetHomeDir(), ".sealos", clusterName, "Clusterfile")
}

func DefaultMountCloudImageDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "merge")
}

func DefaultKubeConfigFile() string {
	return filepath.Join(GetHomeDir(), ".kube", "config")
}

func DefaultTheClusterRootfsDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "kube")
}

func TheDefaultClusterPKIDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "pki")
}

func TheDefaultClusterConfigDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "config")
}

func DefaultClusterBaseDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName)
}

func GetHomeDir() string {
	home, err := homedir.Dir()
	if err != nil {
		return "/root"
	}
	return home
}
