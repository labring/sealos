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
	bb "github.com/labring/sealos/pkg/image/buildah/cluster/buildah"

	"github.com/labring/sealos/pkg/image/types"
	"github.com/pkg/errors"
)

func (*ClusterService) Inspect(name string) (*types.ClusterManifest, error) {
	out, err := bb.Inspect(name)
	if err != nil {
		return nil, errors.Wrapf(err, "inspect get data fail")
	}
	manifest := &types.ClusterManifest{
		Container:   out.Container,
		ContainerID: out.ContainerID,
		MountPoint:  out.MountPoint,
	}
	return manifest, nil
}

//func inspectContainer(data string) (*types.ClusterManifest, error) {
//	if data != "" {
//		var outStruct map[string]interface{}
//		err := json.Unmarshal([]byte(data), &outStruct)
//		if err != nil {
//			return nil, errors.Wrap(err, "decode out json from container inspect failed")
//		}
//		container, _, _ := unstructured.NestedString(outStruct, "Container")
//		containerID, _, _ := unstructured.NestedString(outStruct, "ContainerID")
//		mountPoint, _, _ := unstructured.NestedString(outStruct, "MountPoint")
//		manifest := &types.ClusterManifest{
//			Container:   container,
//			ContainerID: containerID,
//			MountPoint:  mountPoint,
//		}
//		return manifest, nil
//	}
//	return nil, errors.New("inspect output is empty")
//}
