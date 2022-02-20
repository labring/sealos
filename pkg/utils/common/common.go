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

package common

import (
	"path/filepath"

	"github.com/mitchellh/go-homedir"
)

const (
	DefaultWorkDir                = "/tmp/%s/workdir"
	EtcDir                        = "etc"
	DefaultTmpDir                 = "/var/lib/sealer/tmp"
	DefaultLiteBuildUpper         = "/var/lib/sealer/tmp/lite_build_upper"
	DefaultLogDir                 = "/var/lib/sealer/log"
	DefaultClusterFileName        = "Clusterfile"
	DefaultClusterRootfsDir       = "/var/lib/sealer/data"
	DefaultClusterInitBashFile    = "/var/lib/sealer/data/%s/scripts/init.sh"
	DefaultClusterClearBashFile   = "/var/lib/sealer/data/%s/rootfs/scripts/clean.sh"
	TarGzSuffix                   = ".tar.gz"
	YamlSuffix                    = ".yaml"
	ImageAnnotationForClusterfile = "sea.aliyun.com/ClusterFile"
	RawClusterfile                = "/var/lib/sealer/Clusterfile"
	TmpClusterfile                = "/tmp/Clusterfile"
	DefaultRegistryHostName       = "registry.cn-qingdao.aliyuncs.com"
	DefaultRegistryAuthDir        = "/root/.docker/config.json"
	KubeAdminConf                 = "/etc/kubernetes/admin.conf"
	DefaultKubeDir                = "/root/.kube"
	ClusterWorkDir                = "/root/.sealos/%s"
	ClusterfileName               = "ClusterfileName"
	CacheID                       = "cacheID"
	RenderChartsDir               = "charts"
	RenderManifestsDir            = "manifests"
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
	return filepath.Join(GetClusterWorkDir(clusterName), "Clusterfile")
}

func DefaultKubeConfigDir() string {
	return filepath.Join(GetHomeDir(), ".kube")
}

func DefaultMountCloudImageDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "mount")
}

func DefaultKubeConfigFile() string {
	return filepath.Join(DefaultKubeConfigDir(), "config")
}

func DefaultTheClusterRootfsDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "kube")
}

func DefaultTheClusterRootfsPluginDir(clusterName string) string {
	return filepath.Join(DefaultTheClusterRootfsDir(clusterName), "plugin")
}

func TheDefaultClusterPKIDir(clusterName string) string {
	return filepath.Join(DefaultClusterRootfsDir, clusterName, "pki")
}

func TheDefaultConfigPKIDir(clusterName string) string {
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
