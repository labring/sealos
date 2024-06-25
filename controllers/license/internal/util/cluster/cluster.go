// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//	http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package cluster

import "github.com/labring/sealos/controllers/license/internal/util/claims"

type Info struct {
	ClusterID string
	claims.ClusterClaimData
}

func (i *Info) GetClusterID() string {
	return i.ClusterID
}

func (i *Info) CompareWithClaimData(data *claims.ClaimData) bool {
	cdata := &claims.ClusterClaimData{}
	err := data.SwitchToClusterData(cdata)
	if err != nil {
		return false
	}
	return i.ClusterClaimData.Compare(cdata)
}
