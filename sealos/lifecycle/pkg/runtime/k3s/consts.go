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

package k3s

const Distribution = "k3s"

const (
	defaultK3sConfigPath       = "/etc/rancher/k3s/config.yaml"
	defaultRegistryConfigPath  = "/etc/rancher/k3s/registries.yaml"
	defaultKubeConfigPath      = "/etc/rancher/k3s/k3s.yaml"
	defaultDataDir             = "/var/lib/rancher/k3s"
	defaultRootFsK3sFileName   = "k3s.yml"
	defaultInitFilename        = "k3s-init.yaml"
	defaultJoinMastersFilename = "k3s-join-master.yaml"
	defaultJoinNodesFilename   = "k3s-join-node.yaml"
	k3sEtcStaticPod            = "/var/lib/rancher/k3s/agent/pod-manifests"
)

const (
	serverMode = "server"
	agentMode  = "agent"
)
