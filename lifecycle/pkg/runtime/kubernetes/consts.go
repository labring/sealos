// Copyright © 2023 sealos.
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

package kubernetes

const Distribution = "kubernetes"

const (
	defaultInitKubeadmFileName       = "kubeadm-init.yaml"
	defaultJoinMasterKubeadmFileName = "kubeadm-join-master.yaml"
	defaultJoinNodeKubeadmFileName   = "kubeadm-join-node.yaml"
	defaultKubeadmTokenFileName      = "kubeadm-token.json"
	defaultCertificateKeyFileName    = "kubeadm-certificate-key.txt"
	defaultUpdateKubeadmFileName     = "kubeadm-update.yaml"
	defaultRootfsKubeadmFileName     = "kubeadm.yml"
)

const (
	kubernetesEtcStaticPod = "/etc/kubernetes/manifests"
	kubernetesEtc          = "/etc/kubernetes"
	kubernetesEtcPKI       = "/etc/kubernetes/pki"
)
