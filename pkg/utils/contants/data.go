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
	DefaultClusterRootfsDir = "/var/lib/sealos/data"
)

type Data interface {
	Homedir() string
	TempPath() string
	MergePath() string
	PackagePath() string
	ConfigPath() string
	PkiPath() string
	DataPath() string
	ScriptsPath() string
	RegistryPath() string
	KubeConfigFile() string
	RegistryFile() string
	Kubeadmfile() string
	CharsPath() string
	ManifestsPath() string
	LogPath() string
	DefaultJSONPath() string
}

type data struct {
	clusterName string
}

func (d *data) ScriptsPath() string {
	return filepath.Join(d.DataPath(), "scripts")
}

func (d *data) RegistryPath() string {
	return filepath.Join(d.DataPath(), "registry")
}

func (d *data) DefaultJSONPath() string {
	return filepath.Join(d.ScriptsPath(), "default.json")
}

func (d *data) Kubeadmfile() string {
	return filepath.Join(d.DataPath(), "etc", DefaultKubeadmFileName)
}

func (d *data) RegistryFile() string {
	return filepath.Join(d.DataPath(), "etc", "registry.yml")
}

func (d *data) LogPath() string {
	return filepath.Join(d.Homedir(), "log")
}

func (d *data) TempPath() string {
	return filepath.Join(d.Homedir(), "temp")
}

func (d *data) CharsPath() string {
	return filepath.Join(d.DataPath(), "charts")
}

func (d *data) ManifestsPath() string {
	return filepath.Join(d.DataPath(), "manifests")
}

func (d *data) KubeConfigFile() string {
	return filepath.Join(d.ConfigPath(), "admin.conf")
}

func (d *data) MergePath() string {
	return filepath.Join(d.Homedir(), "merge")
}

func (d *data) PackagePath() string {
	return filepath.Join(d.Homedir(), "package")
}

func (d *data) ConfigPath() string {
	return filepath.Join(d.Homedir(), "etc")
}

func (d *data) PkiPath() string {
	return filepath.Join(d.Homedir(), "pki")
}

func (d *data) DataPath() string {
	return filepath.Join(d.Homedir(), "kube")
}

func (d *data) Homedir() string {
	return filepath.Join(DefaultClusterRootfsDir, d.clusterName)
}

func NewData(clusterName string) Data {
	return &data{
		clusterName: clusterName,
	}
}
