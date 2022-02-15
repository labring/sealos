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

package kustomize

import (
	"testing"

	"sigs.k8s.io/kustomize/api/filesys"
)

func TestPatchConfig_Run(t *testing.T) {
	th := New(filesys.MakeFsInMemory())
	err := th.WriteKustomization(".", `
resources:
- kubeadm.yaml
patchesStrategicMerge:
- patch1.yaml
`)
	err = th.WriteFile("kubeadm.yaml", `
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
metadata:
  name: storageTrans
kubernetesVersion: v1.18.0
controlPlaneEndpoint: apiserver.cluster.local:6443
imageRepository: k8s.gcr.io
networking:
  # dnsDomain: cluster.local
  podSubnet: 100.64.0.0/10
  serviceSubnet: 10.96.0.0/12
apiServer:
  certSANs:
  - 127.0.0.1
  - apiserver.cluster.local
  - 172.16.9.202
  - 172.16.9.200
  - 172.16.9.201
  - 10.103.97.2
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - name: localtime
    hostPath: /etc/localtime
    mountPath: /etc/localtime
    readOnly: true
    pathType: File
controllerManager:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
scheduler:
  extraArgs:
    feature-gates: TTLAfterFinished=true
  extraVolumes:
  - hostPath: /etc/localtime
    mountPath: /etc/localtime
    name: localtime
    readOnly: true
    pathType: File
`)
	err = th.WriteFile("patch1.yaml", `
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.18.1
metadata:
  name: storageTrans
`)
	m, err := th.Run(".", th.MakeOptionsPluginsDisabled())
	print(err)
	data, _ := m.AsYaml()
	t.Log(string(data))
}
