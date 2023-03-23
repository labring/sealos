// Copyright © 2021 Alibaba Group Holding Ltd.
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

package runtime

type RuntimeType int

const (
	KubeRuntime RuntimeType = iota
	K3sRuntime
	K0sRuntime
)

// Interface is an interface that defines the runtime operations
type Interface interface {
	// Init initializes the cluster
	Init() error

	// Reset resets the cluster
	Reset() error

	// JoinNodes adds new worker nodes to the cluster
	JoinNodes(newNodesIPList []string) error

	// DeleteNodes removes worker nodes from the cluster
	DeleteNodes(nodeIPList []string) error

	// JoinMasters adds new master nodes to the cluster
	JoinMasters(newMastersIPList []string) error

	// DeleteMasters removes master nodes from the cluster
	DeleteMasters(mastersIPList []string) error

	// SyncNodeIPVS synchronizes the IPVS tables of the nodes in the cluster
	SyncNodeIPVS(mastersIPList, nodeIPList []string) error

	// UpdateCert updates the TLS certificates of the cluster
	UpdateCert(certs []string) error

	// UpgradeCluster upgrades the cluster to a new version
	UpgradeCluster(version string) error

	// GetAdminKubeconfig returns the kubeconfig for the admin user
	GetAdminKubeconfig() ([]byte, error)
}
