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

package settings

import (
	"path/filepath"

	hd "github.com/mitchellh/go-homedir"
)

const (
	SubCmdInitOfSealos     = "init"
	DefaultTestClusterName = "e2e_test"
	DefaultSSHPassword     = "Sealos123"
	DefaultSealosBinPath   = "/usr/bin/sealos"
	KubeconfigName         = "admin.conf"
)

var DefaultTestDir = filepath.Join(GetWorkDir(), "e2e_test")

const (
	RootUser         = "root"
	DefaultSSHPort   = 22
	DefaultInfraUUID = "60a6f958-e9af-4bb5-a401-1553fc05d78b"
)

const GzSuffix = ".gz"

const (
	DefaultTestImageName  = "registry.cn-shanghai.aliyuncs.com/labring/kubernetes:v1.25.0"
	DefaultTestImageTar   = "/tmp/kubernetes-v1.25.0.tar.gz"
	DefaultPatchImageName = "registry.cn-shanghai.aliyuncs.com/labring/kubernetes:v1.25.0-patch"
	DefaultPatchImageTar  = "/tmp/kubernetes-v1.25.0-patch.tar.gz"
	HelmImageName         = "registry.cn-shanghai.aliyuncs.com/labring/helm:v3.8.2"
	CalicoImageName       = "registry.cn-shanghai.aliyuncs.com/labring/calico:v3.25.0"
	DefaultImageRepo      = "registry.cn-shanghai.aliyuncs.com/labring"
	DockerIoRepo          = "registry.cn-shanghai.aliyuncs.com"
	DefaultInfraDriver    = AliyunInfraDriver
	AliyunInfraDriver     = "aliyun"
	AWSInfraDriver        = "aws"
)

func GetWorkDir() string {
	home, err := hd.Dir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".sealos")
}
