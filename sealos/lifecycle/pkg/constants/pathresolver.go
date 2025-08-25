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

package constants

import (
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/containers/storage/pkg/homedir"
)

var (
	DefaultRuntimeRootDir   string
	DefaultClusterRootFsDir string
)

const (
	DefaultRootfsConfigFileName = "config.yml"
	rootFsDirName               = "rootfs"
	EtcDirName                  = "etc"
	ChartsDirName               = "charts"
	ManifestsDirName            = "manifests"
	BinDirName                  = "bin"
	RegistryDirName             = "registry"
	ImagesDirName               = "images"
	ImageShimDirName            = "shim"
	PkiDirName                  = "pki"
	PkiEtcdDirName              = "etcd"
	ScriptsDirName              = "scripts"
	StaticsDirName              = "statics"
)

func GetHomeDir() string {
	return homedir.Get()
}

func WorkDir() string {
	return DefaultRuntimeRootDir
}

func ClusterDir(clusterName string) string {
	return filepath.Join(DefaultRuntimeRootDir, clusterName)
}

func Clusterfile(clusterName string) string {
	return filepath.Join(DefaultRuntimeRootDir, clusterName, DefaultClusterFileName)
}

func GetRuntimeRootDir(name string) string {
	if v, ok := os.LookupEnv(strings.ToUpper(name) + "_RUNTIME_ROOT"); ok {
		return v
	}
	return path.Join(homedir.Get(), fmt.Sprintf(".%s", name))
}

func LogPath() string {
	return filepath.Join(DefaultRuntimeRootDir, "logs")
}

func DataPath() string {
	return filepath.Join(DefaultClusterRootFsDir, "data")
}

func GetAppWorkDir(clusterName, applicationName string) string {
	return filepath.Join(DataPath(), clusterName, "applications", applicationName, "workdir")
}

func GetRootWorkDir(clusterName string) string {
	return filepath.Join(DataPath(), clusterName, "rootfs")
}

func IsRegistryDir(entry fs.DirEntry) bool {
	return entry.IsDir() && entry.Name() == RegistryDirName
}

type PathResolver interface {
	// remote data dir
	Root() string
	RootFSPath() string
	RootFSEtcPath() string
	RootFSStaticsPath() string
	RootFSScriptsPath() string
	RootFSRegistryPath() string
	RootFSManifestsPath() string
	RootFSBinPath() string
	RootFSSealctlPath() string
	ConfigsPath() string // for storing temporary configs in remote

	// for persistent runtime configs in local
	RunRoot() string
	PkiPath() string
	PkiEtcdPath() string
	AdminFile() string
	EtcPath() string
	TmpPath() string
}

type defaultPathResolver struct {
	clusterName string
}

func (d *defaultPathResolver) RootFSSealctlPath() string {
	return filepath.Join(d.RootFSPath(), "opt", "sealctl")
}

func (d *defaultPathResolver) RootFSScriptsPath() string {
	return filepath.Join(d.RootFSPath(), ScriptsDirName)
}

func (d *defaultPathResolver) RootFSEtcPath() string {
	return filepath.Join(d.RootFSPath(), EtcDirName)
}

func (d *defaultPathResolver) RootFSRegistryPath() string {
	return filepath.Join(d.RootFSPath(), RegistryDirName)
}

func (d *defaultPathResolver) RootFSCharsPath() string {
	return filepath.Join(d.RootFSPath(), ChartsDirName)
}

func (d *defaultPathResolver) RootFSManifestsPath() string {
	return filepath.Join(d.RootFSPath(), ManifestsDirName)
}

func (d *defaultPathResolver) RootFSBinPath() string {
	return filepath.Join(d.RootFSPath(), BinDirName)
}

func (d *defaultPathResolver) ConfigsPath() string {
	return filepath.Join(d.Root(), EtcDirName)
}

func (d *defaultPathResolver) RootFSPath() string {
	return filepath.Join(d.Root(), rootFsDirName)
}

func (d *defaultPathResolver) RootFSStaticsPath() string {
	return filepath.Join(d.RootFSPath(), StaticsDirName)
}

// data dir
func (d *defaultPathResolver) Root() string {
	return filepath.Join(DefaultClusterRootFsDir, "data", d.clusterName)
}

// only for local
func (d *defaultPathResolver) EtcPath() string {
	return filepath.Join(d.RunRoot(), EtcDirName)
}

// $HOME/.$APP_NAME/$CLUSTER_NAME/etc/admin.conf
func (d *defaultPathResolver) AdminFile() string {
	return filepath.Join(d.EtcPath(), "admin.conf")
}

func (d *defaultPathResolver) PkiPath() string {
	return filepath.Join(d.RunRoot(), PkiDirName)
}

func (d *defaultPathResolver) PkiEtcdPath() string {
	return filepath.Join(d.PkiPath(), PkiEtcdDirName)
}

func (d *defaultPathResolver) TmpPath() string {
	return filepath.Join(d.RunRoot(), "tmp")
}

func (d *defaultPathResolver) RunRoot() string {
	return filepath.Join(DefaultRuntimeRootDir, d.clusterName)
}

func NewPathResolver(clusterName string) PathResolver {
	return &defaultPathResolver{
		clusterName: clusterName,
	}
}
