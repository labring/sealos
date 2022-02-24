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

type Worker interface {
	Homedir() string
	Clusterfile() string
	Packagefile() string
	Configfile() string
	Kubeadmfile() string
}

type worker struct {
	clusterName string
}

const (
	DefaultClusterFileName = "Clusterfile"
	DefaultPackageFileName = "Packagefile"
	DefaultConfigFileName  = "Configfile"
	DefaultKubeadmFileName = "Kubeadmfile"
)

func (w *worker) Homedir() string {
	return filepath.Join(GetHomeDir(), ".sealos", w.clusterName)
}

func (w *worker) Clusterfile() string {
	return filepath.Join(w.Homedir(), DefaultClusterFileName)
}

func (w *worker) Packagefile() string {
	return filepath.Join(w.Homedir(), DefaultPackageFileName)
}

func (w *worker) Configfile() string {
	return filepath.Join(w.Homedir(), DefaultConfigFileName)
}

func (w *worker) Kubeadmfile() string {
	return filepath.Join(w.Homedir(), DefaultKubeadmFileName)
}

func NewWork(clusterName string) Worker {
	return &worker{
		clusterName: clusterName,
	}
}
