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

package contants

import "path/filepath"

const (
	DefaultClusterRootfsDir          = "/var/lib/sealos"
	DefaultInitKubeadmFileName       = "kubeadm-init.yaml"
	DefaultJoinMasterKubeadmFileName = "kubeadm-join-master.yaml"
	DefaultJoinNodeKubeadmFileName   = "kubeadm-join-node.yaml"
	DefaultKubeadmTokenFileName      = "kubeadm-token.yaml"
	DefaultRootfsKubeadmFileName     = "kubeadm.yml"
	DataDirName                      = "rootfs"
	EtcDirName                       = "etc"
	ChartsDirName                    = "charts"
	ManifestsDirName                 = "manifests"
	RegistryDirName                  = "registry"
	ImagesDirName                    = "images"
	ImageShimDirName                 = "shim"
	PkiDirName                       = "pki"
	PkiEtcdDirName                   = "etcd"
	ScriptsDirName                   = "scripts"
	StaticsDirName                   = "statics"
)

func LogPath() string {
	return filepath.Join(DefaultClusterRootfsDir, "logs")
}
func DataPath() string {
	return filepath.Join(DefaultClusterRootfsDir, "data")
}

type Data interface {
	Homedir() string
	RootFSPath() string
	RootFSEtcPath() string
	RootFSStaticsPath() string
	RootFSScriptsPath() string
	RootFSRegistryPath() string

	PkiPath() string
	PkiEtcdPath() string
	AdminFile() string
	EtcPath() string
	TmpPath() string

	RootFSCharsPath() string
	RootFSManifestsPath() string
	RootFSSealctlPath() string
}

type data struct {
	clusterName string
}

func (d *data) RootFSSealctlPath() string {
	return filepath.Join(d.RootFSPath(), "opt", "sealctl")
}

func (d *data) RootFSScriptsPath() string {
	return filepath.Join(d.RootFSPath(), ScriptsDirName)
}
func (d *data) RootFSEtcPath() string {
	return filepath.Join(d.RootFSPath(), EtcDirName)
}

func (d *data) RootFSRegistryPath() string {
	return filepath.Join(d.RootFSPath(), RegistryDirName)
}

func (d *data) RootFSCharsPath() string {
	return filepath.Join(d.RootFSPath(), ChartsDirName)
}

func (d *data) RootFSManifestsPath() string {
	return filepath.Join(d.RootFSPath(), ManifestsDirName)
}

func (d *data) EtcPath() string {
	return filepath.Join(d.Homedir(), EtcDirName)
}
func (d *data) AdminFile() string {
	return filepath.Join(d.EtcPath(), "admin.conf")
}

func (d *data) PkiPath() string {
	return filepath.Join(d.Homedir(), PkiDirName)
}

func (d *data) PkiEtcdPath() string {
	return filepath.Join(d.PkiPath(), PkiEtcdDirName)
}

func (d *data) TmpPath() string {
	return filepath.Join(d.Homedir(), "tmp")
}

func (d *data) RootFSPath() string {
	return filepath.Join(d.Homedir(), DataDirName)
}

func (d *data) RootFSStaticsPath() string {
	return filepath.Join(d.RootFSPath(), StaticsDirName)
}

func (d *data) Homedir() string {
	return filepath.Join(DefaultClusterRootfsDir, "data", d.clusterName)
}

func NewData(clusterName string) Data {
	return &data{
		clusterName: clusterName,
	}
}
