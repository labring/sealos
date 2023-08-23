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

package runtime

type Interface interface {
	Init() error
	Reset() error
	ScaleUp(newMasterIPList []string, newNodeIPList []string) error
	ScaleDown(deleteMastersIPList []string, deleteNodesIPList []string) error
	SyncNodeIPVS(mastersIPList, nodeIPList []string) error
	Upgrade(version string) error
	GetConfig() ([]byte, error)
	UpdateCert(certs []string) error
}
