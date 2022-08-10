/*
Copyright 2022 sealos.

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
package cluster

import (
	"encoding/json"

	"github.com/pkg/errors"

	bb "github.com/labring/sealos/pkg/image/buildah/cluster/buildah"
	"github.com/labring/sealos/pkg/image/types"
)

func (*Service) List() ([]types.ClusterInfo, error) {
	data, err := bb.GetContainers()
	if err != nil {
		return nil, err
	}
	infos, err := listContainer(data)
	if err != nil {
		return nil, err
	}
	return infos, nil
}

func listContainer(data []byte) ([]types.ClusterInfo, error) {
	if string(data) != "" {
		var outStruct []types.ClusterInfo
		err := json.Unmarshal(data, &outStruct)
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from list container failed")
		}
		return outStruct, nil
	}
	return nil, errors.New("containers output is empty")
}
